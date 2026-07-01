const fs = require('fs');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node tools/analyze-koenig-address-csv.cjs <csv-file>');
  process.exit(1);
}

const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');

function parseLine(line) {
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

const lines = text.split(/\r?\n/).filter(Boolean);
const header = parseLine(lines[0] || '');
const ix = Object.fromEntries(header.map((h, i) => [h, i]));
const addressIds = new Map();
const koenig = new Map();
let badCoordinateRows = 0;
let emptyKoenigRows = 0;
const badExamples = [];

for (let n = 1; n < lines.length; n += 1) {
  const row = parseLine(lines[n]);
  const addressId = String(row[ix.addressId] || '').trim();
  addressIds.set(addressId, (addressIds.get(addressId) || 0) + 1);

  const lat = String(row[ix.latitude] || '').trim();
  const lng = String(row[ix.longitude] || '').trim();
  if (/^\d{1,3}\.\d{3}\.\d+$/.test(lat) || /^\d{1,3}\.\d{3}\.\d+$/.test(lng)) {
    badCoordinateRows += 1;
    if (badExamples.length < 5) badExamples.push({ line: n + 1, addressId, lat, lng });
  }

  const ids = String(row[ix.koenigIds] || '')
    .split('|')
    .map((value) => value.trim())
    .filter(Boolean);
  if (!ids.length) emptyKoenigRows += 1;
  ids.forEach((id) => {
    if (!koenig.has(id)) koenig.set(id, new Set());
    koenig.get(id).add(addressId);
  });
}

const duplicateAddressIds = [...addressIds]
  .filter(([addressId, count]) => addressId && count > 1)
  .map(([addressId, count]) => ({ addressId, count }));
const multiKoenig = [...koenig]
  .filter(([, addresses]) => addresses.size > 1)
  .map(([koenigId, addresses]) => ({ koenigId, addressIds: [...addresses] }));

console.log(JSON.stringify({
  file,
  rows: lines.length - 1,
  headerColumns: header.length,
  uniqueAddressIds: [...addressIds.keys()].filter(Boolean).length,
  duplicateAddressIds,
  badCoordinateRows,
  badExamples,
  emptyKoenigRows,
  uniqueKoenigIds: koenig.size,
  koenigIdsOnMultipleAddresses: multiKoenig.length,
  multiKoenig: multiKoenig.slice(0, 20),
}, null, 2));
