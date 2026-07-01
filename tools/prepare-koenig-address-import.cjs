const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const inputFile = process.argv[2];
const outputDir = process.argv[3] || path.join(process.cwd(), 'var', 'koenig-address-import');
const fallbackFile = process.argv[4] || '';

if (!inputFile) {
  console.error('Usage: node tools/prepare-koenig-address-import.cjs <source.csv> [output-dir]');
  process.exit(1);
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (c === ';' && !quoted) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function csvValue(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function csvLine(values) {
  return values.map(csvValue).join(';');
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function stableAddressId(row) {
  const key = [
    normalizeText(row.country || 'DE'),
    normalizeText(row.postcode),
    normalizeText(row.city),
    normalizeText(row.street),
    normalizeText(row.houseNumber),
  ].join('|');
  return `addr_${crypto.createHash('md5').update(key).digest('hex')}`;
}

function normalizeCoordinate(value, kind) {
  const raw = String(value || '').trim();
  if (!raw) return { value: '', changed: false, valid: false, raw };

  const simple = Number(raw.replace(',', '.'));
  if (Number.isFinite(simple) && inRange(simple, kind)) {
    return { value: String(simple), changed: false, valid: true, raw };
  }

  const compact = raw.replace(/\./g, '').replace(',', '');
  if (/^-?\d+$/.test(compact)) {
    const negative = compact.startsWith('-');
    const digits = negative ? compact.slice(1) : compact;
    const candidateWidths = kind === 'lat' ? [2, 1] : [1, 2];
    for (const width of candidateWidths) {
      if (digits.length <= width) continue;
      const next = Number(`${negative ? '-' : ''}${digits.slice(0, width)}.${digits.slice(width)}`);
      if (Number.isFinite(next) && inRange(next, kind)) {
        return { value: String(next), changed: next !== simple, valid: true, raw };
      }
    }
  }

  return { value: raw, changed: false, valid: false, raw };
}

function inRange(value, kind) {
  if (kind === 'lat') return value >= 47 && value <= 56;
  return value >= 5 && value <= 16;
}

function uniqPipe(value) {
  return [...new Set(String(value || '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean))]
    .join('|');
}

function parseCsvFile(file) {
  const source = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const parsedLines = source.split(/\r?\n/).filter(Boolean);
  const parsedHeader = parseCsvLine(parsedLines[0] || '');
  const rows = [];
  for (let n = 1; n < parsedLines.length; n += 1) {
    const values = parseCsvLine(parsedLines[n]);
    rows.push(Object.fromEntries(parsedHeader.map((name, i) => [name, values[i] || ''])));
  }
  return { header: parsedHeader, rows };
}

function buildFallbackByKoenigId(file) {
  if (!file) return new Map();
  const fallback = new Map();
  const { rows } = parseCsvFile(file);
  rows.forEach((row) => {
    const lat = normalizeCoordinate(row.latitude, 'lat');
    const lng = normalizeCoordinate(row.longitude, 'lng');
    if (!lat.valid || !lng.valid) return;
    String(row.koenigIds || '')
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((id) => {
        if (!fallback.has(id)) fallback.set(id, { latitude: lat.value, longitude: lng.value });
      });
  });
  return fallback;
}

const source = fs.readFileSync(inputFile, 'utf8').replace(/^\uFEFF/, '');
const lines = source.split(/\r?\n/).filter(Boolean);
const header = parseCsvLine(lines[0] || '');
const index = Object.fromEntries(header.map((name, i) => [name, i]));
const required = ['addressId', 'country', 'postcode', 'city', 'street', 'houseNumber', 'latitude', 'longitude', 'addressHash', 'koenigIds'];
const missing = required.filter((name) => !(name in index));
if (missing.length) {
  console.error(`Missing required columns: ${missing.join(', ')}`);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });
const fallbackByKoenigId = buildFallbackByKoenigId(fallbackFile);

const cleanedRows = [];
const jsonlRows = [];
const addressIds = new Map();
const koenigIds = new Map();
const report = {
  sourceFile: inputFile,
  createdAt: new Date().toISOString(),
  inputRows: lines.length - 1,
  outputRows: 0,
  skippedRows: 0,
  coordinatesNormalized: 0,
  coordinatesRecoveredFromFallback: 0,
  invalidCoordinates: [],
  rowsWithoutKoenigIds: [],
  addressIdRegenerated: 0,
  duplicateAddressIds: [],
  koenigIdsOnMultipleAddresses: [],
};

for (let n = 1; n < lines.length; n += 1) {
  const values = parseCsvLine(lines[n]);
  const row = Object.fromEntries(header.map((name, i) => [name, values[i] || '']));
  const line = n + 1;

  row.country = row.country || 'DE';
  row.koenigIds = uniqPipe(row.koenigIds);
  row.stationIds = uniqPipe(row.stationIds);
  row.stationNames = uniqPipe(row.stationNames);
  row.brands = uniqPipe(row.brands);
  row.sources = uniqPipe(row.sources);
  row.autobahnen = uniqPipe(row.autobahnen);

  const ids = row.koenigIds.split('|').filter(Boolean);
  if (!ids.length) {
    report.rowsWithoutKoenigIds.push({ line, addressId: row.addressId, city: row.city, street: row.street });
    report.skippedRows += 1;
    continue;
  }

  const lat = normalizeCoordinate(row.latitude, 'lat');
  const lng = normalizeCoordinate(row.longitude, 'lng');
  if (lat.changed || lng.changed) report.coordinatesNormalized += 1;
  if (!lat.valid || !lng.valid) {
    const fallback = ids.map((id) => fallbackByKoenigId.get(id)).find(Boolean);
    if (fallback) {
      row.latitude = fallback.latitude;
      row.longitude = fallback.longitude;
      report.coordinatesRecoveredFromFallback += 1;
    } else {
      row.latitude = '';
      row.longitude = '';
    }
  } else {
    row.latitude = lat.value;
    row.longitude = lng.value;
  }
  if (!row.latitude || !row.longitude) {
    report.invalidCoordinates.push({ line, addressId: row.addressId, latitude: row.latitude, longitude: row.longitude });
  }

  const expectedAddressId = stableAddressId(row);
  if (!row.addressId) {
    row.addressId = expectedAddressId;
    row.addressHash = row.addressHash || expectedAddressId;
    report.addressIdRegenerated += 1;
  }
  if (!row.addressHash) row.addressHash = row.addressId;

  addressIds.set(row.addressId, (addressIds.get(row.addressId) || 0) + 1);
  ids.forEach((id) => {
    if (!koenigIds.has(id)) koenigIds.set(id, new Set());
    koenigIds.get(id).add(row.addressId);
  });

  cleanedRows.push(header.map((name) => row[name] || ''));
  jsonlRows.push(JSON.stringify({
    addressId: row.addressId,
    country: row.country || 'DE',
    postcode: row.postcode || '',
    city: row.city || '',
    street: row.street || '',
    houseNumber: row.houseNumber || '',
    latitude: row.latitude ? Number(row.latitude) : null,
    longitude: row.longitude ? Number(row.longitude) : null,
    addressHash: row.addressHash || row.addressId,
    createdAt: row.createdAt || '',
    updatedAt: row.updatedAt || '',
    lastUsedAt: row.lastUsedAt || '',
    koenigIds: row.koenigIds.split('|').filter(Boolean),
    stationIds: row.stationIds.split('|').filter(Boolean),
    stationNames: row.stationNames.split('|').filter(Boolean),
    brands: row.brands.split('|').filter(Boolean),
    sources: row.sources.split('|').filter(Boolean),
    standortTyp: row.standortTyp || '',
    autobahnen: row.autobahnen.split('|').filter(Boolean),
  }));
}

report.outputRows = cleanedRows.length;
report.duplicateAddressIds = [...addressIds]
  .filter(([, count]) => count > 1)
  .map(([addressId, count]) => ({ addressId, count }));
report.koenigIdsOnMultipleAddresses = [...koenigIds]
  .filter(([, ids]) => ids.size > 1)
  .map(([koenigId, ids]) => ({ koenigId, addressIds: [...ids] }));

const cleanedCsv = path.join(outputDir, 'tankprofi-addressdaten-2026-06-29.cleaned.csv');
const jsonl = path.join(outputDir, 'tankprofi-addressdaten-2026-06-29.cleaned.jsonl');
const reportFile = path.join(outputDir, 'tankprofi-addressdaten-2026-06-29.report.json');

fs.writeFileSync(cleanedCsv, `${csvLine(header)}\n${cleanedRows.map(csvLine).join('\n')}\n`, 'utf8');
fs.writeFileSync(jsonl, `${jsonlRows.join('\n')}\n`, 'utf8');
fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  cleanedCsv,
  jsonl,
  reportFile,
  summary: {
    inputRows: report.inputRows,
    outputRows: report.outputRows,
    coordinatesNormalized: report.coordinatesNormalized,
    invalidCoordinateRows: report.invalidCoordinates.length,
    rowsWithoutKoenigIds: report.rowsWithoutKoenigIds.length,
    duplicateAddressIds: report.duplicateAddressIds.length,
    koenigIdsOnMultipleAddresses: report.koenigIdsOnMultipleAddresses.length,
  },
}, null, 2));
