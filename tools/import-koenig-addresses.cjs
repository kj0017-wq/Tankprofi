const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith('--'));
const dryRun = args.includes('--dry-run');
const deleteMissing = args.includes('--delete-missing');
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

if (!file) {
  console.error('Usage: node tools/import-koenig-addresses.cjs <cleaned.jsonl> [--dry-run] [--delete-missing] [--limit=N]');
  process.exit(1);
}

function parseDate(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizedAddress(row) {
  return [
    normalizeText(row.country || 'DE'),
    normalizeText(row.postcode),
    normalizeText(row.city),
    normalizeText(row.street),
    normalizeText(row.houseNumber),
  ].join('|');
}

const rows = fs.readFileSync(file, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .slice(0, Number.isFinite(limit) ? limit : undefined)
  .map((line) => JSON.parse(line));

const addressIds = new Set();
const stationIds = new Set();
const koenigIds = new Map();
const problems = [];

for (const row of rows) {
  if (!row.addressId) problems.push({ addressId: row.addressId, reason: 'missing_addressId' });
  if (!Array.isArray(row.koenigIds) || !row.koenigIds.length) problems.push({ addressId: row.addressId, reason: 'missing_koenigId' });
  if (!Number.isFinite(row.latitude) || !Number.isFinite(row.longitude)) problems.push({ addressId: row.addressId, reason: 'invalid_coordinates' });
  if (addressIds.has(row.addressId)) problems.push({ addressId: row.addressId, reason: 'duplicate_addressId' });
  addressIds.add(row.addressId);
  (row.stationIds || []).forEach((stationId) => stationIds.add(stationId));
  (row.koenigIds || []).forEach((koenigId) => {
    if (!koenigIds.has(koenigId)) koenigIds.set(koenigId, row.addressId);
    else if (koenigIds.get(koenigId) !== row.addressId) problems.push({ addressId: row.addressId, koenigId, reason: 'koenigId_on_multiple_addresses' });
  });
}

if (problems.length) {
  console.log(JSON.stringify({
    ok: false,
    mode: dryRun ? 'dry-run' : 'import',
    file,
    rows: rows.length,
    problems: problems.slice(0, 50),
    problemCount: problems.length,
  }, null, 2));
  process.exit(1);
}

if (dryRun) {
  console.log(JSON.stringify({
    ok: true,
    mode: 'dry-run',
    file: path.resolve(file),
    rows: rows.length,
    uniqueAddressIds: addressIds.size,
    uniqueKoenigIds: koenigIds.size,
    stationRefsToUpdate: stationIds.size,
    deleteMissing,
  }, null, 2));
  process.exit(0);
}

async function main() {
  let admin;
  try {
    admin = require('firebase-admin');
  } catch {
    admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  }
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'tankprofi' });
  }
  const db = admin.firestore();
  const Timestamp = admin.firestore.Timestamp;
  const FieldValue = admin.firestore.FieldValue;

  let batch = db.batch();
  let ops = 0;
  let addressesWritten = 0;
  let stationRefsUpdated = 0;
  const now = FieldValue.serverTimestamp();

  async function commitIfNeeded(force = false) {
    if (!ops) return;
    if (!force && ops < 400) return;
    await batch.commit();
    batch = db.batch();
    ops = 0;
  }

  for (const row of rows) {
    const createdAt = parseDate(row.createdAt);
    const payload = {
      addressId: row.addressId,
      country: row.country || 'DE',
      postcode: row.postcode || '',
      city: row.city || '',
      street: row.street || '',
      houseNumber: row.houseNumber || '',
      latitude: row.latitude,
      longitude: row.longitude,
      addressHash: row.addressHash || row.addressId,
      normalizedAddress: normalizedAddress(row),
      koenigIds: row.koenigIds || [],
      stationIds: row.stationIds || [],
      stationNames: row.stationNames || [],
      brands: row.brands || [],
      sources: row.sources || [],
      standortTyp: row.standortTyp || '',
      autobahnen: row.autobahnen || [],
      koenigAddressImportAt: now,
      updatedAt: now,
      lastUsedAt: now,
    };
    if (createdAt) payload.createdAt = Timestamp.fromDate(createdAt);

    batch.set(db.collection('tankprofi_addresses').doc(row.addressId), payload, { merge: false });
    ops += 1;
    addressesWritten += 1;

    for (const stationId of row.stationIds || []) {
      batch.set(db.collection('tankprofi_stations').doc(stationId), {
        addressId: row.addressId,
        addressImportSyncedAt: now,
      }, { merge: true });
      ops += 1;
      stationRefsUpdated += 1;
      await commitIfNeeded();
    }
    await commitIfNeeded();
  }
  await commitIfNeeded(true);

  let addressesDeleted = 0;
  if (deleteMissing && Number.isFinite(limit) === false) {
    const snapshot = await db.collection('tankprofi_addresses').limit(30000).get();
    for (let index = 0; index < snapshot.docs.length; index += 400) {
      batch = db.batch();
      ops = 0;
      snapshot.docs.slice(index, index + 400).forEach((doc) => {
        if (!addressIds.has(doc.id)) {
          batch.delete(doc.ref);
          ops += 1;
          addressesDeleted += 1;
        }
      });
      await commitIfNeeded(true);
    }
  }

  console.log(JSON.stringify({
    ok: true,
    mode: 'import',
    file: path.resolve(file),
    addressesWritten,
    stationRefsUpdated,
    addressesDeleted,
    deleteMissing,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
