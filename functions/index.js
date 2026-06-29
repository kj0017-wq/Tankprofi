import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import crypto from 'node:crypto';
import { defineSecret } from 'firebase-functions/params';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

initializeApp();

const db = getFirestore();
const tankerkoenigApiKey = defineSecret('TANKERKOENIG_API_KEY');
const allowedFuels = new Set(['e10', 'e5', 'diesel']);
const cityFuels = ['diesel', 'e5', 'e10'];
const snapshotTtlMs = 60 * 60 * 1000;
const lockTtlMs = 20 * 60 * 1000;
const cityRequestDelayMs = 250;
const cityRetryDelayMs = 2500;
const autobahnPriceRefreshTargetMs = 120 * 60 * 1000;
const autobahnPriceRefreshScheduleMs = 15 * 60 * 1000;
const autobahnPriceRefreshRadiusKm = 6;
const autobahnPriceRefreshMaxQueries = 30;
const autobahnPriceRefreshDelayMs = 450;
const cityPriceThresholds = {
  cheapDelta: -0.02,
  expensiveDelta: 0.02,
};
const scanMaxRadiusKm = 25;
const scanMaxResultsLimit = 100;
const scanMinRadiusKm = 1.5;
const cityScanConfigs = {
  berlin: {
    cityId: 'berlin',
    cityName: 'Berlin',
    region: 'Berlin',
    country: 'DE',
    minLat: 52.338,
    maxLat: 52.675,
    minLon: 13.07,
    maxLon: 13.79,
    radiusKm: 5,
    spacingKm: 5.5,
  },
};
const supportedScanCountries = new Set(['DE', 'AT', 'CH', 'PL']);
const raststaettenDirectoryUrl = 'https://www.raststaetten.de/alle-standorte/';
const bnetzaChargingCsvUrl = 'https://data.bundesnetzagentur.de/Bundesnetzagentur/DE/Fachthemen/ElektrizitaetundGas/E-Mobilitaet/Ladesaeulenregister_BNetzA_2026-04-22.csv';
const bnetzaChargingSourceDate = '2026-04-22';
const overpassApiUrl = 'https://overpass-api.de/api/interpreter';
const autohofKeywords = /autohof|euro rastpark|svg autohof|24[- ]?autohof|truckstop|rasthof/i;
const highwayCandidateHints = {
  A9: /\bA\s?9\b|BAB\s?9|Coswig|Droy[sß]ig|Osterfeld|Gro[ßs]kugel|Schkeuditz|M[üu]nchberg|Koesching|K[öo]sching|Marktschorgast|Niemegk|Triptis|Berg|Leupoldsgr[üu]n|Allersberg|Langenbruck|Himmelkron|Dittersdorf|Pegnitz/i,
};
const highwaySearchPoints = {
  A1: [
    { id: 'luebeck', label: 'Luebeck', lat: 53.8655, lng: 10.6866 },
    { id: 'hamburg', label: 'Hamburg', lat: 53.5511, lng: 9.9937 },
    { id: 'bremen', label: 'Bremen', lat: 53.0793, lng: 8.8017 },
    { id: 'osnabrueck', label: 'Osnabrueck', lat: 52.2799, lng: 8.0472 },
    { id: 'muenster', label: 'Muenster', lat: 51.9607, lng: 7.6261 },
    { id: 'dortmund', label: 'Dortmund', lat: 51.5136, lng: 7.4653 },
    { id: 'koeln', label: 'Koeln', lat: 50.9375, lng: 6.9603 },
    { id: 'trier', label: 'Trier', lat: 49.7499, lng: 6.6371 },
  ],
  A2: [
    { id: 'oberhausen', label: 'Oberhausen', lat: 51.4963, lng: 6.8638 },
    { id: 'dortmund', label: 'Dortmund', lat: 51.5136, lng: 7.4653 },
    { id: 'bielefeld', label: 'Bielefeld', lat: 52.0302, lng: 8.5325 },
    { id: 'hannover', label: 'Hannover', lat: 52.3759, lng: 9.7320 },
    { id: 'braunschweig', label: 'Braunschweig', lat: 52.2689, lng: 10.5268 },
    { id: 'magdeburg', label: 'Magdeburg', lat: 52.1205, lng: 11.6276 },
    { id: 'brandenburg', label: 'Brandenburg', lat: 52.4125, lng: 12.5316 },
    { id: 'berlin-ring', label: 'Berliner Ring', lat: 52.3918, lng: 13.0645 },
  ],
  A3: [
    { id: 'emmerich', label: 'Emmerich', lat: 51.8309, lng: 6.2428 },
    { id: 'duisburg', label: 'Duisburg', lat: 51.4344, lng: 6.7623 },
    { id: 'koeln', label: 'Koeln', lat: 50.9375, lng: 6.9603 },
    { id: 'limburg', label: 'Limburg', lat: 50.3836, lng: 8.0503 },
    { id: 'frankfurt', label: 'Frankfurt', lat: 50.1109, lng: 8.6821 },
    { id: 'wuerzburg', label: 'Wuerzburg', lat: 49.7913, lng: 9.9534 },
    { id: 'nuernberg', label: 'Nuernberg', lat: 49.4521, lng: 11.0767 },
    { id: 'regensburg', label: 'Regensburg', lat: 49.0134, lng: 12.1016 },
    { id: 'passau', label: 'Passau', lat: 48.5667, lng: 13.4319 },
  ],
  A9: [
    { id: 'potsdam', label: 'Potsdam', lat: 52.2737, lng: 12.9861 },
    { id: 'dessau', label: 'Dessau', lat: 51.8286, lng: 12.2583 },
    { id: 'leipzig', label: 'Leipzig', lat: 51.3402, lng: 12.3747 },
    { id: 'hermsdorf', label: 'Hermsdorfer Kreuz', lat: 50.8957, lng: 11.8536 },
    { id: 'hof', label: 'Hof', lat: 50.3135, lng: 11.9128 },
    { id: 'bayreuth', label: 'Bayreuth', lat: 49.9456, lng: 11.5713 },
    { id: 'nuernberg', label: 'Nuernberg', lat: 49.4521, lng: 11.0767 },
    { id: 'ingolstadt', label: 'Ingolstadt', lat: 48.7665, lng: 11.4258 },
    { id: 'muenchen', label: 'Muenchen', lat: 48.1372, lng: 11.5755 },
  ],
  A11: [
    { id: 'berliner-ring', label: 'Berliner Ring', lat: 52.6542, lng: 13.5064 },
    { id: 'finowfurt', label: 'Finowfurt', lat: 52.8432, lng: 13.6935 },
    { id: 'joachimsthal', label: 'Joachimsthal', lat: 52.9794, lng: 13.7447 },
    { id: 'prenwlow', label: 'Prenzlau', lat: 53.3167, lng: 13.8667 },
    { id: 'pomellen', label: 'Pomellen', lat: 53.3422, lng: 14.3900 },
  ],
  A12: [
    { id: 'berliner-ring', label: 'Berliner Ring', lat: 52.3183, lng: 13.4958 },
    { id: 'fuerstenwalde', label: 'Fuerstenwalde', lat: 52.3607, lng: 14.0619 },
    { id: 'frankfurt-oder', label: 'Frankfurt Oder', lat: 52.3415, lng: 14.5506 },
    { id: 'swiecko', label: 'Swiecko', lat: 52.3094, lng: 14.6093 },
  ],
  A24: [
    { id: 'hamburg-horn', label: 'Hamburg Horn', lat: 53.5565, lng: 10.0981 },
    { id: 'reinbek', label: 'Reinbek', lat: 53.5468, lng: 10.2504 },
    { id: 'gudow', label: 'Gudow', lat: 53.5210, lng: 10.8065 },
    { id: 'wittenburg', label: 'Wittenburg', lat: 53.5017, lng: 11.0892 },
    { id: 'neustadt-glewe', label: 'Neustadt-Glewe', lat: 53.3808, lng: 11.6282 },
    { id: 'stolpe', label: 'Stolpe', lat: 53.3673, lng: 11.7294 },
    { id: 'wittstock', label: 'Wittstock/Dosse', lat: 53.1590, lng: 12.4630 },
    { id: 'herzsprung', label: 'Herzsprung', lat: 53.0685, lng: 12.5328 },
    { id: 'neuruppin', label: 'Neuruppin', lat: 52.9062, lng: 12.7505 },
    { id: 'fehrbellin', label: 'Fehrbellin', lat: 52.8058, lng: 12.7860 },
    { id: 'linum', label: 'Linumer Bruch', lat: 52.7540, lng: 12.8540 },
    { id: 'kremmen', label: 'Kremmen', lat: 52.7520, lng: 13.0300 },
    { id: 'berliner-ring', label: 'Berliner Ring', lat: 52.6542, lng: 13.5064 },
  ],
};
const raststaettenFuelBrands = ['Aral', 'Avia', 'bft', 'Eni', 'Esso', 'Orlen', 'Score', 'Shell', 'Tamoil', 'Total', 'Westfalen'];
const raststaettenServiceFeatures = [
  'AdBlue',
  'Autogas',
  'Biodiesel',
  'E-Ladesäule',
  'E-Ladesäule 150kW',
  'E-Ladesäule 300kW',
  'E-Ladesäule 350kW',
  'Erdgas',
  'LKW-Diesel',
  'SANIFAIR',
  'Defibrillator',
  'DocStop',
  'Fernfahrerdusche',
  'Cashpoint',
];
const knownAddressIds = new Map();
const knownAddressCacheLimit = 25000;

const defaultCityConfig = [
  ['berlin', 'Berlin', 'Berlin', 52.5200, 13.4050],
  ['hamburg', 'Hamburg', 'Hamburg', 53.5511, 9.9937],
  ['muenchen', 'München', 'Bayern', 48.1372, 11.5755],
  ['koeln', 'Köln', 'Nordrhein-Westfalen', 50.9375, 6.9603],
  ['frankfurt-am-main', 'Frankfurt am Main', 'Hessen', 50.1109, 8.6821],
  ['duesseldorf', 'Düsseldorf', 'Nordrhein-Westfalen', 51.2277, 6.7735],
  ['stuttgart', 'Stuttgart', 'Baden-Württemberg', 48.7758, 9.1829],
  ['leipzig', 'Leipzig', 'Sachsen', 51.3397, 12.3731],
  ['dortmund', 'Dortmund', 'Nordrhein-Westfalen', 51.5136, 7.4653],
  ['bremen', 'Bremen', 'Bremen', 53.0793, 8.8017],
  ['essen', 'Essen', 'Nordrhein-Westfalen', 51.4556, 7.0116],
  ['dresden', 'Dresden', 'Sachsen', 51.0504, 13.7373],
  ['hannover', 'Hannover', 'Niedersachsen', 52.3759, 9.7320],
  ['nuernberg', 'Nürnberg', 'Bayern', 49.4521, 11.0767],
  ['duisburg', 'Duisburg', 'Nordrhein-Westfalen', 51.4344, 6.7623],
].map(([cityId, cityName, state, centerLat, centerLng], index) => ({
  cityId,
  cityName,
  state,
  country: 'DE',
  centerLat,
  centerLng,
  radiusKm: 25,
  maxStations: 100,
  active: true,
  sortOrder: index + 1,
  searchPoints: [
    { id: 'center', label: 'Zentrum', lat: centerLat, lng: centerLng },
  ],
}));

function sendJson(res, payload, status = 200) {
  res.status(status).set({
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  }).send(JSON.stringify(payload));
}

function fuelParam(value) {
  const fuel = String(value || 'e10').toLowerCase();
  return allowedFuels.has(fuel) ? fuel : 'e10';
}

function tankerkoenigKey() {
  return String(process.env.TANKERKOENIG_API_KEY || tankerkoenigApiKey.value() || '').trim();
}

function numberParam(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function endpointFrom(req) {
  const path = req.path || req.url.split('?')[0] || '';
  if (path.endsWith('/geocode.php') || path.endsWith('/geocode')) return 'geocode';
  if (path.endsWith('/reverse.php') || path.endsWith('/reverse')) return 'reverse';
  if (path.endsWith('/search.php') || path.endsWith('/search')) return 'search';
  if (path.endsWith('/history.php') || path.endsWith('/history')) return 'history';
  if (path.endsWith('/city-snapshot.php') || path.endsWith('/city-snapshot')) return 'citySnapshot';
  if (path.endsWith('/city-stations.php') || path.endsWith('/city-stations')) return 'cityStations';
  if (path.endsWith('/admin/city-prices/update.php') || path.endsWith('/admin/city-prices/update')) return 'cityUpdate';
  if (path.endsWith('/admin/scan/init.php') || path.endsWith('/admin/scan/init')) return 'scanInit';
  if (path.endsWith('/admin/scan/process.php') || path.endsWith('/admin/scan/process')) return 'scanProcess';
  if (path.endsWith('/admin/stats.php') || path.endsWith('/admin/stats')) return 'adminStats';
  if (path.endsWith('/admin/addresses/export.csv') || path.endsWith('/admin/addresses/export')) return 'addressExport';
  if (path.endsWith('/admin/addresses/consolidate.php') || path.endsWith('/admin/addresses/consolidate')) return 'addressConsolidate';
  if (path.endsWith('/admin/charging/import.php') || path.endsWith('/admin/charging/import')) return 'chargingImport';
  if (path.endsWith('/admin/charging/cleanup.php') || path.endsWith('/admin/charging/cleanup')) return 'chargingCleanup';
  if (path.endsWith('/charging/stations.php') || path.endsWith('/charging/stations')) return 'chargingStations';
  if (path.endsWith('/admin/autobahn/import.php') || path.endsWith('/admin/autobahn/import')) return 'autobahnImport';
  if (path.endsWith('/admin/autobahn/prices/refresh.php') || path.endsWith('/admin/autobahn/prices/refresh')) return 'autobahnPriceRefresh';
  if (path.endsWith('/autobahn/stations.php') || path.endsWith('/autobahn/stations')) return 'autobahnStations';
  if (path.endsWith('/route/tankpoints.php') || path.endsWith('/route/tankpoints')) return 'routeTankpoints';
  if (path.endsWith('/admin/autohof/import.php') || path.endsWith('/admin/autohof/import')) return 'autohofImport';
  if (path.endsWith('/admin/autohof/tankerkoenig-import.php') || path.endsWith('/admin/autohof/tankerkoenig-import')) return 'autohofTankerkoenigImport';
  if (path.endsWith('/admin/tank-id/match.php') || path.endsWith('/admin/tank-id/match')) return 'tankIdMatch';
  if (path.endsWith('/admin/tank-id/candidates.php') || path.endsWith('/admin/tank-id/candidates')) return 'tankIdCandidates';
  if (path.endsWith('/autohof/stations.php') || path.endsWith('/autohof/stations')) return 'autohofStations';
  return '';
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeStation(station, fuel) {
  const price = Number(station.price ?? station[fuel]);
  const recordedAt = new Date().toISOString();
  return {
    tankerkoenig_id: String(station.id || ''),
    name: String(station.name || ''),
    brand: String(station.brand || ''),
    street: String(station.street || ''),
    house_number: String(station.houseNumber || ''),
    postcode: String(station.postCode || ''),
    city: String(station.place || ''),
    lat: Number(station.lat || 0),
    lng: Number(station.lng || 0),
    distance: Number(station.dist || 0),
    is_open: station.isOpen === true ? true : station.isOpen === false ? false : null,
    fuel_type: fuel,
    price: Number.isFinite(price) ? price : null,
    diesel: validPrice(station.diesel) ? roundPrice(station.diesel) : null,
    e5: validPrice(station.e5) ? roundPrice(station.e5) : null,
    e10: validPrice(station.e10) ? roundPrice(station.e10) : null,
    prices: {
      diesel: validPrice(station.diesel) ? { price: roundPrice(station.diesel), recordedAt } : null,
      e5: validPrice(station.e5) ? { price: roundPrice(station.e5), recordedAt } : null,
      e10: validPrice(station.e10) ? { price: roundPrice(station.e10), recordedAt } : null,
    },
    last_update: recordedAt,
  };
}

function cleanTankerkoenigId(value) {
  const id = String(value || '').replace(/^tankkoenig_/i, '').trim();
  if (!id) return '';
  if (/^(node|way|relation|osm|addr|station|scan)_/i.test(id)) return '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return '';
  return id;
}

function explicitTankerkoenigId(data = {}, docId = '') {
  const direct = cleanTankerkoenigId(
    data.priceStationId
    || data.tankerkoenigId
    || data.tankerkoenig_id
    || data.externalStationId
    || '',
  );
  if (direct) return direct;
  if (String(docId || '').startsWith('tankkoenig_')) return cleanTankerkoenigId(docId);
  return '';
}

function stableHash(value, prefix = '') {
  const hash = crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 32);
  return prefix ? `${prefix}_${hash}` : hash;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/ß/g, 'ss')
    .replace(/\bstrasse\b/gi, 'strasse')
    .replace(/\bstr\.\b/gi, 'strasse')
    .replace(/\bstr\b/gi, 'strasse')
    .replace(/[^\p{L}\p{N} .-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeCountry(value = 'DE') {
  const country = String(value || 'DE').trim().toUpperCase();
  return supportedScanCountries.has(country) ? country : country.slice(0, 2) || 'DE';
}

function normalizedAddressFromStation(station) {
  const country = normalizeCountry(station.country || 'DE');
  const postcode = normalizeText(station.postcode || station.postCode);
  const city = normalizeText(station.city || station.place);
  const street = normalizeText(station.street);
  const houseNumber = normalizeText(station.house_number || station.houseNumber);
  const latitude = Number(station.lat ?? station.latitude);
  const longitude = Number(station.lng ?? station.longitude);
  const hasAddressText = Boolean(postcode || city || street || houseNumber);
  const coordinatePart = !hasAddressText && Number.isFinite(latitude) && Number.isFinite(longitude)
    ? `${latitude.toFixed(4)},${longitude.toFixed(4)}`
    : '';
  const normalizedAddress = [country, postcode, city, street, houseNumber, coordinatePart]
    .filter(Boolean)
    .join('|');
  const addressHash = stableHash(normalizedAddress, 'addr');
  return {
    addressId: addressHash,
    country,
    postcode,
    city,
    street,
    houseNumber,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    normalizedAddress,
    addressHash,
  };
}

function rememberKnownAddressId(addressId) {
  if (!addressId) return;
  knownAddressIds.set(addressId, true);
  if (knownAddressIds.size > knownAddressCacheLimit) {
    const firstKey = knownAddressIds.keys().next().value;
    if (firstKey) knownAddressIds.delete(firstKey);
  }
}

async function preloadAddressExistence(stations, addressCache) {
  const uniqueAddressIds = uniq(stations
    .map((station) => normalizedAddressFromStation(station).addressId)
    .filter(Boolean))
    .filter((addressId) => !addressCache.has(addressId) && !knownAddressIds.has(addressId));

  for (let index = 0; index < uniqueAddressIds.length; index += 300) {
    const ids = uniqueAddressIds.slice(index, index + 300);
    const refs = ids.map((addressId) => db.collection('tankprofi_addresses').doc(addressId));
    const docs = await db.getAll(...refs);
    docs.forEach((doc, docIndex) => {
      const addressId = ids[docIndex];
      addressCache.set(addressId, doc.exists);
      if (doc.exists) rememberKnownAddressId(addressId);
    });
  }
}

async function upsertTankprofiAddress(station, options = {}) {
  const address = normalizedAddressFromStation(station);
  const now = FieldValue.serverTimestamp();
  const addressRef = db.collection('tankprofi_addresses').doc(address.addressId);
  const addressCache = options.addressCache;
  let addressExists = addressCache?.get(address.addressId);
  if (addressExists === undefined && knownAddressIds.has(address.addressId)) addressExists = true;
  if (addressExists === undefined) {
    const addressDoc = await addressRef.get();
    addressExists = addressDoc.exists;
  }
  const addressCreated = !addressExists;
  if (addressCache) addressCache.set(address.addressId, true);
  rememberKnownAddressId(address.addressId);

  const addressPayload = {
    ...address,
    updatedAt: now,
    lastUsedAt: now,
  };
  if (addressCreated) addressPayload.createdAt = now;

  await addressRef.set(addressPayload, { merge: true });

  return {
    address,
    addressCreated,
  };
}

async function updateTankprofiAddress(addressId, station, options = {}) {
  const nextAddress = normalizedAddressFromStation(station);
  const addressRef = db.collection('tankprofi_addresses').doc(addressId);
  const addressDoc = await addressRef.get();
  const existing = addressDoc.exists ? addressDoc.data() : {};
  const now = FieldValue.serverTimestamp();
  const address = {
    ...nextAddress,
    addressId,
    addressHash: existing.addressHash || nextAddress.addressHash,
    normalizedAddress: existing.normalizedAddress || nextAddress.normalizedAddress,
    country: nextAddress.country || existing.country || 'DE',
    postcode: nextAddress.postcode || existing.postcode || '',
    city: nextAddress.city || existing.city || '',
    street: nextAddress.street || existing.street || '',
    houseNumber: nextAddress.houseNumber || existing.houseNumber || '',
    latitude: Number.isFinite(nextAddress.latitude) ? nextAddress.latitude : existing.latitude ?? null,
    longitude: Number.isFinite(nextAddress.longitude) ? nextAddress.longitude : existing.longitude ?? null,
  };

  await addressRef.set({
    ...address,
    updatedAt: now,
    lastUsedAt: now,
    createdAt: existing.createdAt || now,
  }, { merge: true });

  if (options.addressCache) options.addressCache.set(addressId, true);
  rememberKnownAddressId(addressId);
  return { address, addressCreated: !addressDoc.exists };
}

async function directoryStationWithCanonicalAddress(station) {
  const canonicalStation = {
    country: station.country || 'DE',
    street: station.street || station.address || station.highway || '',
    houseNumber: station.houseNumber || '',
    postCode: station.postCode || '',
    place: station.place || '',
    lat: station.lat,
    lng: station.lng,
  };
  const { address } = await upsertTankprofiAddress(canonicalStation);
  const {
    address: legacyAddress,
    street,
    houseNumber,
    postCode,
    place,
    ...withoutAddressFields
  } = station;
  return {
    ...withoutAddressFields,
    addressId: address.addressId,
  };
}

function tankprofiStationFromDirectory(station) {
  const isOsm = station.osmId && station.osmType;
  const isTankkoenig = station.tankerkoenigId || station.tankerkoenig_id;
  const source = isTankkoenig
    ? 'tankkoenig'
    : isOsm
      ? 'osm'
      : String(station.source || 'directory').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toLowerCase();
  const externalStationId = isTankkoenig
    ? String(station.tankerkoenigId || station.tankerkoenig_id)
    : isOsm
      ? `${station.osmType}_${station.osmId}`
      : String(station.slug || station.stationId || station.sourceUrl || '').trim();

  return {
    ...station,
    source,
    externalStationId,
    id: externalStationId,
    street: station.street || station.address || '',
    house_number: station.houseNumber || station.house_number || '',
    postcode: station.postCode || station.postcode || '',
    city: station.place || station.city || '',
    lat: station.lat ?? station.latitude,
    lng: station.lng ?? station.longitude,
    is_open: station.is_open ?? station.isOpen ?? null,
  };
}

async function upsertDirectoryStations(stations) {
  const stats = {
    stationsCreated: 0,
    stationsUpdated: 0,
    addressesCreated: 0,
    errors: [],
  };
  for (const rawStation of stations) {
    const station = tankprofiStationFromDirectory(rawStation);
    try {
      const result = await upsertTankprofiStation(station, {
        source: station.source,
        writePriceHistory: false,
      });
      if (result.stationCreated) stats.stationsCreated += 1;
      else stats.stationsUpdated += 1;
      if (result.addressCreated) stats.addressesCreated += 1;
    } catch (error) {
      stats.errors.push(error.message);
      await logTankprofiEvent({
        type: 'persist_service_station',
        level: 'warn',
        message: error.message,
        source: station.source || 'directory',
        rawData: rawStation,
      }).catch(() => null);
    }
  }
  return {
    importedCount: stats.stationsCreated + stats.stationsUpdated,
    stationsCreated: stats.stationsCreated,
    stationsUpdated: stats.stationsUpdated,
    addressesCreated: stats.addressesCreated,
    errors: stats.errors,
  };
}

function stationIdentityFromSource(station, source = 'tankkoenig') {
  const externalStationId = String(station.tankerkoenig_id || station.externalStationId || station.id || '').trim();
  if (externalStationId) {
    return {
      stationId: `${source}_${externalStationId}`,
      externalStationId,
      stationHash: null,
    };
  }
  const address = normalizedAddressFromStation(station);
  const hashInput = [
    source,
    normalizeText(station.brand),
    normalizeText(station.name),
    address.addressHash,
    Number(station.lat ?? station.latitude).toFixed?.(5) || '',
    Number(station.lng ?? station.longitude).toFixed?.(5) || '',
  ].join('|');
  const stationHash = stableHash(hashInput, 'station');
  return {
    stationId: stationHash,
    externalStationId: null,
    stationHash,
  };
}

function fuelPriceMapFromStation(station) {
  const currentPrices = {};
  const fuelValues = {
    diesel: station.diesel ?? station.prices?.diesel?.price ?? (station.fuel_type === 'diesel' ? station.price : null),
    e5: station.e5 ?? station.prices?.e5?.price ?? (station.fuel_type === 'e5' ? station.price : null),
    e10: station.e10 ?? station.prices?.e10?.price ?? (station.fuel_type === 'e10' ? station.price : null),
    super_plus: station.super_plus,
    lpg: station.lpg,
    cng: station.cng,
    adblue: station.adblue,
  };
  Object.entries(fuelValues).forEach(([fuelType, value]) => {
    const price = roundPrice(value);
    if (validPrice(price) || (fuelType === 'adblue' && Number.isFinite(price))) {
      currentPrices[fuelType] = {
        price,
        currency: 'EUR',
        isOpen: station.is_open ?? station.isOpen ?? null,
        source: 'tankkoenig',
        reportedAt: Timestamp.now(),
      };
    }
  });
  return currentPrices;
}

function uniq(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && String(value).trim() !== ''))];
}

function serviceTypesFromStation(station) {
  const explicit = Array.isArray(station.standortTyp) ? station.standortTyp : [];
  const types = [...explicit];
  const text = `${station.name || ''} ${station.operator || ''} ${station.brand || ''}`.toLowerCase();
  if (station.type === 'autobahn_raststaette') types.push('Raststätte', 'Service Area');
  if (station.type === 'autohof') types.push('Autohof');
  if (station.hasTruckDiesel || station.hgv || station.truck === true || text.includes('truckstop') || text.includes('truck stop')) types.push('Truck Stop');
  if (station.hasEvCharging || station.eLadesaeulen || station.amenity === 'charging_station') types.push('Ladepark');
  if (station.hasFuel || station.tankerkoenig_id || station.tankerkoenigId || Object.keys(fuelPriceMapFromStation(station)).length) types.push('Tankstelle');
  return uniq(types);
}

function serviceFeaturesFromStation(station) {
  const features = [
    ...(Array.isArray(station.features) ? station.features : []),
    ...(Array.isArray(station.serviceMerkmale) ? station.serviceMerkmale : []),
  ];
  if (station.hasFuel) features.push('Tankstelle');
  if (station.hasTruckDiesel) features.push('LKW-Diesel');
  if (station.hasEvCharging) features.push('Schnelllader');
  if (station.hgv) features.push('LKW geeignet');
  if (station.parking) features.push('Parken');
  return uniq(features);
}

function serviceFieldsFromStation(station, existing = {}) {
  const standortTyp = uniq([...(existing.standortTyp || []), ...serviceTypesFromStation(station)]);
  const serviceMerkmale = uniq([...(existing.serviceMerkmale || []), ...serviceFeaturesFromStation(station)]);
  const tankstellenReferenzen = uniq([
    ...(existing.tankstellenReferenzen || []),
    station.tankerkoenigId ? `tankkoenig_${station.tankerkoenigId}` : null,
    station.tankerkoenig_id ? `tankkoenig_${station.tankerkoenig_id}` : null,
  ]);
  const quelle = uniq([...(existing.quelle || []), station.source || null]);

  const fields = {};
  if (standortTyp.length) fields.standortTyp = standortTyp;
  if (serviceMerkmale.length) fields.serviceMerkmale = serviceMerkmale;
  if (tankstellenReferenzen.length) fields.tankstellenReferenzen = tankstellenReferenzen;
  if (quelle.length) fields.quelle = quelle;
  if (station.type) fields.autohofTyp = station.type;
  if (station.highway) fields.autobahn = station.highway;
  if (station.exitRef) fields.ausfahrt = station.exitRef;
  if (station.hasFuel !== undefined) fields.tankstelleVorhanden = Boolean(station.hasFuel);
  if (station.hasEvCharging !== undefined) fields.eLadesaeulen = station.hasEvCharging ? (station.eLadesaeulen || true) : false;
  if (station.hasTruckDiesel !== undefined || station.hgv !== undefined) fields.lkwParkplaetze = station.hgv || station.hasTruckDiesel || existing.lkwParkplaetze || null;
  if (station.parking) fields.pkwParkplaetze = station.parking;
  if (station.phone) fields.phone = station.phone;
  if (station.website) fields.website = station.website;
  if (station.sourceUrl) fields.sourceUrl = station.sourceUrl;
  if (station.sideLabel) fields.sideLabel = station.sideLabel;
  if (station.directionSource) fields.directionSource = station.directionSource;
  if (station.directionText) fields.directionText = station.directionText;
  if (station.osmId) fields.osmId = station.osmId;
  if (station.osmType) fields.osmType = station.osmType;
  if (station.rawTags) fields.rawTags = station.rawTags;
  if (station.operator) fields.operator = station.operator;
  if (station.primaryFuelBrand) fields.primaryFuelBrand = station.primaryFuelBrand;
  if (Array.isArray(station.fuelBrands)) fields.fuelBrands = uniq([...(existing.fuelBrands || []), ...station.fuelBrands]);
  fields.lastAutohofScan = FieldValue.serverTimestamp();
  return fields;
}

function stationNameTokens(value) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !['tankstelle', 'autohof', 'raststatte', 'raststaette', 'station'].includes(token));
}

function stationNamesSimilar(a, b) {
  const aTokens = stationNameTokens(a);
  const bTokens = stationNameTokens(b);
  if (!aTokens.length || !bTokens.length) return false;
  return aTokens.some((token) => bTokens.includes(token));
}

function fuelBrandsFromText(...values) {
  const text = normalizeText(values.filter(Boolean).join(' '));
  const brands = [
    ['totalenergies', 'total'],
    ['total', 'total'],
    ['shell', 'shell'],
    ['aral', 'aral'],
    ['esso', 'esso'],
    ['jet', 'jet'],
    ['avia', 'avia'],
    ['avex', 'avex'],
    ['star', 'star'],
    ['bft', 'bft'],
    ['hem', 'hem'],
    ['hoyer', 'hoyer'],
    ['q1', 'q1'],
    ['agip', 'agip'],
    ['eni', 'eni'],
    ['bp', 'bp'],
    ['oil', 'oil'],
    ['tamoil', 'tamoil'],
    ['orlen', 'orlen'],
    ['raiffeisen', 'raiffeisen'],
    ['markant', 'markant'],
    ['allguth', 'allguth'],
    ['elan', 'elan'],
  ];
  return uniq(brands
    .filter(([needle]) => text.includes(needle))
    .map(([, brand]) => brand));
}

function compactIdentityValue(value) {
  return normalizeText(value).replace(/\s+/g, '');
}

function serviceStationMergeScore(station) {
  let score = 0;
  if (!station.directorySource) score += 100;
  if (station.addressId) score += 20;
  if (station.prices && Object.keys(station.prices).length) score += 15;
  if (station.hasFuel) score += 10;
  if (station.type === 'autobahn_raststaette') score += 5;
  return score;
}

function shouldReplaceServiceStation(existing, station) {
  if (!existing) return true;
  if (serviceStationMergeScore(station) !== serviceStationMergeScore(existing)) {
    return serviceStationMergeScore(station) > serviceStationMergeScore(existing);
  }
  const existingUpdated = Date.parse(existing.importedAt || existing.currentPricesUpdatedAt || '') || 0;
  const stationUpdated = Date.parse(station.importedAt || station.currentPricesUpdatedAt || '') || 0;
  return stationUpdated > existingUpdated;
}

function serviceStationMergeKeys(station) {
  const keys = [];
  const stationId = String(station.stationId || '').trim();
  const addressId = String(station.addressId || '').trim();
  const externalId = String(station.externalStationId || station.tankerkoenigId || station.tankerkoenig_id || '').trim();
  const osmId = station.osmId && station.osmType ? `${station.osmType}_${station.osmId}` : '';
  const website = compactIdentityValue(station.website);
  const phone = compactIdentityValue(station.phone);
  const name = normalizeText(station.name);
  const highway = compactIdentityValue(station.highway);
  const lat = Number(station.lat);
  const lng = Number(station.lng);

  if (stationId) keys.push(`station:${stationId}`);
  if (addressId) keys.push(`address:${addressId}`);
  if (externalId) keys.push(`external:${externalId}`);
  if (osmId) keys.push(`osm:${osmId}`);
  if (website) keys.push(`website:${website}`);
  if (phone) keys.push(`phone:${phone}`);
  if (name && Number.isFinite(lat) && Number.isFinite(lng)) {
    keys.push(`near:${highway}:${name}:${lat.toFixed(3)}:${lng.toFixed(3)}`);
  }
  return keys;
}

async function findExistingStationDocForMerge(station, identity, address) {
  const directRef = db.collection('tankprofi_stations').doc(identity.stationId);
  const directDoc = await directRef.get();
  if (directDoc.exists) return directDoc;

  const sameAddress = await db.collection('tankprofi_stations')
    .where('addressId', '==', address.addressId)
    .limit(1)
    .get();
  if (!sameAddress.empty) return sameAddress.docs[0];

  const lat = Number(station.lat ?? station.latitude);
  const lng = Number(station.lng ?? station.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const latDelta = 0.0012;
  const nearSnapshot = await db.collection('tankprofi_stations')
    .where('latitude', '>=', lat - latDelta)
    .where('latitude', '<=', lat + latDelta)
    .limit(80)
    .get();

  let best = null;
  nearSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const distance = distanceKmBetween(lat, lng, data.latitude, data.longitude);
    if (distance > 0.1) return;
    const sameWebsite = station.website && data.website && normalizeText(station.website) === normalizeText(data.website);
    const samePhone = station.phone && data.phone && normalizeText(station.phone) === normalizeText(data.phone);
    const similarName = stationNamesSimilar(station.name, data.name);
    if (!sameWebsite && !samePhone && !similarName) return;
    const score = distance + (sameWebsite || samePhone ? -0.05 : 0);
    if (!best || score < best.score) best = { doc, score };
  });
  return best?.doc || null;
}

async function logTankprofiEvent({ type = 'system', level = 'info', message, source = 'tankprofi', stationId = null, addressId = null, rawData = null }) {
  const ref = db.collection('tankprofi_logs').doc();
  await ref.set({
    logId: ref.id,
    type,
    level,
    message: String(message || ''),
    source,
    stationId,
    addressId,
    rawData: rawData || null,
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function upsertTankprofiStation(station, { source = 'tankkoenig', writePriceHistory = false, addressCache = null } = {}) {
  const identity = stationIdentityFromSource(station, source);
  const candidateAddress = normalizedAddressFromStation(station);
  const now = FieldValue.serverTimestamp();
  const matchedDoc = await findExistingStationDocForMerge(station, identity, candidateAddress);
  const stationRef = matchedDoc?.ref || db.collection('tankprofi_stations').doc(identity.stationId);
  const stationDoc = matchedDoc || await stationRef.get();
  const existing = stationDoc.exists ? stationDoc.data() : {};
  const stableAddressId = stationDoc.exists && existing.addressId ? String(existing.addressId) : '';
  const { address, addressCreated } = stableAddressId
    ? await updateTankprofiAddress(stableAddressId, station, { addressCache })
    : await upsertTankprofiAddress(station, { addressCache });
  const currentPrices = fuelPriceMapFromStation(station);
  const mergedPrices = {
    ...(existing.currentPrices || {}),
    ...currentPrices,
  };
  const serviceFields = serviceFieldsFromStation({ ...station, source }, existing);

  await stationRef.set({
    stationId: existing.stationId || stationRef.id,
    source: existing.source || source,
    externalStationId: existing.externalStationId || identity.externalStationId,
    stationHash: existing.stationHash || identity.stationHash,
    brand: station.brand || existing.brand || null,
    name: station.name || existing.name || null,
    addressId: address.addressId,
    country: address.country,
    latitude: address.latitude,
    longitude: address.longitude,
    openingHours: station.openingHours || existing.openingHours || null,
    isActive: true,
    currentPrices: mergedPrices,
    currentPricesUpdatedAt: Object.keys(currentPrices).length ? now : existing.currentPricesUpdatedAt || null,
    ...serviceFields,
    createdAt: stationDoc.exists ? existing.createdAt || now : now,
    updatedAt: now,
    lastSeenAt: now,
  }, { merge: true });

  if (writePriceHistory) {
    await Promise.all(Object.entries(currentPrices).map(async ([fuelType, priceData]) => {
      const priceRef = db.collection('tankprofi_prices').doc();
      await priceRef.set({
        priceId: priceRef.id,
        stationId: identity.stationId,
        addressId: address.addressId,
        fuelType,
        price: priceData.price,
        currency: priceData.currency,
        isOpen: priceData.isOpen,
        source,
        reportedAt: priceData.reportedAt,
        createdAt: now,
      });
    }));
  }

  return {
    stationId: stationRef.id,
    addressId: address.addressId,
    stationCreated: !stationDoc.exists,
    addressCreated,
  };
}

async function rememberTankprofiStations(stations, options = {}) {
  const stats = {
    stationsCreated: 0,
    stationsUpdated: 0,
    addressesCreated: 0,
    errors: [],
  };
  const concurrency = Math.max(1, Math.min(10, Math.round(Number(options.concurrency || 6))));
  const addressCache = options.addressCache || new Map();
  await preloadAddressExistence(stations, addressCache);
  await asyncPool(stations, concurrency, async (station) => {
    try {
      const result = await upsertTankprofiStation(station, { ...options, addressCache });
      if (result.stationCreated) stats.stationsCreated += 1;
      else stats.stationsUpdated += 1;
      if (result.addressCreated) stats.addressesCreated += 1;
    } catch (error) {
      stats.errors.push(error.message);
      await logTankprofiEvent({
        type: 'persist_station',
        level: 'warn',
        message: error.message,
        source: options.source || 'tankkoenig',
        rawData: station,
      }).catch(() => null);
    }
  });
  return stats;
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&auml;/g, 'ä')
    .replace(/&ouml;/g, 'ö')
    .replace(/&uuml;/g, 'ü')
    .replace(/&Auml;/g, 'Ä')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&szlig;/g, 'ß')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripHtml(value) {
  return decodeHtml(String(value || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function slugFromUrl(url) {
  return String(url || '')
    .replace(/\/$/, '')
    .split('/')
    .filter(Boolean)
    .pop()
    ?.replace(/[^a-zA-Z0-9_-]/g, '-') || '';
}

function directionSideFromName(name) {
  const value = String(name || '');
  const match = value.match(/\b(Nord|Süd|Sued|Ost|West)\b/i);
  if (!match) return null;
  const normalized = match[1].toLowerCase();
  if (normalized === 'sued') return 'Süd';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

async function fetchText(url, source = 'Tankprofi/1.0', encoding = 'utf-8') {
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml,text/csv,*/*',
      'user-agent': source,
    },
  });
  if (!response.ok) throw new Error(`${url} failed with HTTP ${response.status}`);
  if (encoding && encoding !== 'utf-8') {
    return new TextDecoder(encoding).decode(await response.arrayBuffer());
  }
  return await response.text();
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 8000) {
  let timeout;
  try {
    return await Promise.race([
      fetch(url, options).then(async (response) => {
        const data = await response.json();
        return { response, data };
      }),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs} ms.`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJsonAbortable(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const data = await response.json();
    return { response, data };
  } finally {
    clearTimeout(timeout);
  }
}

function extractRaststaettenLinks(html) {
  const links = new Map();
  const linkPattern = /href="(https:\/\/www\.raststaetten\.de\/standorte\/[^"]+\/)"/g;
  let match;
  while ((match = linkPattern.exec(html))) {
    const sourceUrl = match[1];
    const slug = slugFromUrl(sourceUrl);
    if (slug) links.set(slug, sourceUrl);
  }
  return [...links.entries()].map(([slug, sourceUrl]) => ({ slug, sourceUrl }));
}

function containsFeature(html, feature) {
  const escaped = feature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:alt=["']${escaped}["']|>\\s*${escaped}\\s*<)`, 'i').test(html);
}

function parseRaststaettenDetail({ slug, sourceUrl, html }) {
  const title = stripHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || html.match(/<title>(.*?)<\/title>/i)?.[1] || slug);
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1] || sourceUrl;
  const route = html.match(/destination=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  const lat = route ? Number(route[1]) : null;
  const lng = route ? Number(route[2]) : null;
  const addressBlock = stripHtml(html.match(/<h1[^>]*>[\s\S]*?<\/h1>([\s\S]{0,700}?)(?:Route planen|<\/section>)/i)?.[1] || '');
  const highway = addressBlock.match(/\bA\s?\d{1,3}\b/i)?.[0]?.replace(/\s+/g, '') || null;
  const postCode = addressBlock.match(/\b\d{5}\b/)?.[0] || null;
  const afterPostCode = postCode ? addressBlock.split(postCode).slice(1).join(postCode).trim() : '';
  const place = afterPostCode.match(/^([A-ZÄÖÜa-zäöüß .-]+)/)?.[1]?.trim() || null;
  const fuelBrands = raststaettenFuelBrands.filter((brand) => containsFeature(html, brand));
  const features = raststaettenServiceFeatures.filter((feature) => containsFeature(html, feature));

  return {
    stationId: slug,
    slug,
    source: 'raststaetten.de',
    sourceUrl: canonical,
    name: title,
    type: 'autobahn_raststaette',
    operator: 'Tank & Rast',
    sideLabel: directionSideFromName(title),
    directionSource: directionSideFromName(title) ? 'name_suffix_side_only' : null,
    directionText: null,
    highway,
    postCode,
    place,
    country: 'DE',
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    fuelBrands,
    primaryFuelBrand: fuelBrands[0] || null,
    features,
    hasFuel: fuelBrands.length > 0,
    hasEvCharging: features.some((feature) => feature.startsWith('E-Ladesäule')),
    hasTruckDiesel: features.includes('LKW-Diesel'),
    importedAt: FieldValue.serverTimestamp(),
  };
}

async function asyncPool(items, limit, worker) {
  const results = [];
  const executing = new Set();
  for (const item of items) {
    const promise = Promise.resolve().then(() => worker(item));
    results.push(promise);
    executing.add(promise);
    promise.finally(() => executing.delete(promise));
    if (executing.size >= limit) await Promise.race(executing);
  }
  return await Promise.all(results);
}

async function importRaststaettenDirectory({ limit = 0, highway = '', offset = 0 } = {}) {
  const normalizedHighway = String(highway || '').trim().toUpperCase().replace(/\s+/g, '');
  const startOffset = Math.round(numberParam(offset, 0, 0, 10000));
  const startedAt = Timestamp.now();
  const runRef = db.collection('autobahn_import_runs').doc();
  await runRef.set({
    runId: runRef.id,
    source: 'raststaetten.de',
    sourceUrl: raststaettenDirectoryUrl,
    highway: normalizedHighway || null,
    offset: startOffset || null,
    status: 'running',
    startedAt,
    importedCount: 0,
    errorCount: 0,
  });

  try {
    const listHtml = await fetchText(raststaettenDirectoryUrl, 'Tankprofi/1.0 (autobahn-directory-import)');
    let links = extractRaststaettenLinks(listHtml);
    if (normalizedHighway) {
      const highwayPattern = new RegExp(`\\b${normalizedHighway.replace(/^A/, 'A\\s?')}\\b`, 'i');
      links = links.filter((link) => {
        const sourceIndex = listHtml.indexOf(link.sourceUrl);
        const nearby = sourceIndex >= 0 ? listHtml.slice(sourceIndex, sourceIndex + 900) : '';
        return highwayPattern.test(nearby);
      });
    }
    if (startOffset > 0) links = links.slice(startOffset);
    if (limit > 0) links = links.slice(0, limit);

    const errors = [];
    const stations = await asyncPool(links, 4, async (link) => {
      try {
        const html = await fetchText(link.sourceUrl, 'Tankprofi/1.0 (autobahn-directory-import)');
        return parseRaststaettenDetail({ ...link, html });
      } catch (error) {
        errors.push({ stationId: link.slug, sourceUrl: link.sourceUrl, message: error.message });
        return null;
      }
    });
    const validStations = stations.filter(Boolean);
    const persistStats = await upsertDirectoryStations(validStations);

    const completedAt = Timestamp.now();
    await runRef.set({
      status: errors.length ? 'partial' : 'completed',
      completedAt,
      discoveredCount: links.length,
      importedCount: persistStats.importedCount,
      stationsCreated: persistStats.stationsCreated,
      stationsUpdated: persistStats.stationsUpdated,
      addressesCreated: persistStats.addressesCreated,
      errorCount: errors.length + persistStats.errors.length,
      errors: [...errors, ...persistStats.errors.map((message) => ({ message }))].slice(0, 20),
    }, { merge: true });

    return {
      runId: runRef.id,
      status: errors.length ? 'partial' : 'completed',
      discoveredCount: links.length,
      ...persistStats,
      errorCount: errors.length + persistStats.errors.length,
    };
  } catch (error) {
    await runRef.set({
      status: 'failed',
      completedAt: Timestamp.now(),
      error: error.message,
    }, { merge: true });
    throw error;
  }
}

function overpassAutohofClauses(prefix = 'area.de') {
  return `
  nwr(${prefix})["name"~"Autohof|Euro Rastpark|SVG Autohof|24[- ]?Autohof",i];
  nwr(${prefix})["operator"~"Autohof|Euro Rastpark|SVG Autohof|24[- ]?Autohof",i];
  nwr(${prefix})["brand"~"Autohof|Euro Rastpark|SVG Autohof|24[- ]?Autohof",i];`;
}

function overpassBoxForPoint(point, radiusKm = 35) {
  const latDelta = kmToLat(radiusKm);
  const lonDelta = kmToLon(radiusKm, point.lat);
  return [
    Number(point.lat - latDelta).toFixed(5),
    Number(point.lng - lonDelta).toFixed(5),
    Number(point.lat + latDelta).toFixed(5),
    Number(point.lng + lonDelta).toFixed(5),
  ].join(',');
}

function autohofOverpassQuery({ highway = '', maxPoints = 0, pointOffset = 0 } = {}) {
  const normalizedHighway = String(highway || '').trim().toUpperCase().replace(/\s+/g, '');
  const routePoints = highwaySearchPoints[normalizedHighway] || [];
  const pointLimit = Math.round(Number(maxPoints || 0));
  const offset = Math.max(0, Math.round(Number(pointOffset || 0)));
  const points = pointLimit > 0 ? routePoints.slice(offset, offset + pointLimit) : routePoints.slice(offset);
  if (points.length) {
    const boxes = points.map((point) => overpassAutohofClauses(overpassBoxForPoint(point, 35))).join('\n');
    return `
[out:json][timeout:60];
(
${boxes}
);
out center tags;
`;
  }

  return `
[out:json][timeout:90];
area(3600051477)->.de;
(
${overpassAutohofClauses()}
);
out center tags;
`;
}

function osmTagBool(tags, key) {
  const value = String(tags?.[key] || '').toLowerCase();
  return ['yes', 'true', '1', 'designated'].includes(value);
}

function highwayFromTags(tags) {
  const candidates = [
    tags?.['destination:ref'],
    tags?.['road:ref'],
    tags?.ref,
    tags?.['addr:street'],
    tags?.name,
  ].filter(Boolean).join(' ');
  return candidates.match(/\bA\s?\d{1,3}\b/i)?.[0]?.replace(/\s+/g, '').toUpperCase() || null;
}

function normalizeAutohofElement(element, highwayFallback = '') {
  const tags = element.tags || {};
  const lat = Number(element.lat ?? element.center?.lat);
  const lng = Number(element.lon ?? element.center?.lon);
  const name = String(tags.name || tags.operator || tags.brand || `Autohof ${element.id}`).trim();
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!autohofKeywords.test(`${name} ${tags.operator || ''} ${tags.brand || ''}`)) return null;

  return {
    stationId: `osm_${element.type}_${element.id}`,
    osmId: String(element.id),
    osmType: element.type,
    source: 'openstreetmap_overpass',
    sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    name,
    type: 'autohof',
    operator: tags.operator || null,
    brand: tags.brand || null,
    sideLabel: directionSideFromName(name),
    directionSource: directionSideFromName(name) ? 'name_suffix_side_only' : null,
    directionText: null,
    highway: highwayFromTags(tags) || highwayFallback || null,
    exitRef: tags['motorway_junction:ref'] || tags['destination:ref'] || null,
    street: tags['addr:street'] || null,
    houseNumber: tags['addr:housenumber'] || null,
    postCode: tags['addr:postcode'] || null,
    place: tags['addr:city'] || tags['addr:place'] || null,
    country: 'DE',
    lat,
    lng,
    hasFuel: tags.amenity === 'fuel' || osmTagBool(tags, 'fuel:diesel') || osmTagBool(tags, 'fuel:octane_95'),
    hasTruckDiesel: osmTagBool(tags, 'fuel:HGV_diesel') || osmTagBool(tags, 'fuel:diesel:truck') || osmTagBool(tags, 'hgv'),
    hasEvCharging: osmTagBool(tags, 'charging_station') || tags.amenity === 'charging_station',
    hgv: osmTagBool(tags, 'hgv'),
    parking: tags.parking || null,
    openingHours: tags.opening_hours || null,
    phone: tags.phone || tags['contact:phone'] || null,
    website: tags.website || tags['contact:website'] || null,
    rawTags: tags,
    importedAt: FieldValue.serverTimestamp(),
  };
}

async function importAutohofDirectory({ limit = 0, highway = '', maxPoints = 0, pointOffset = 0 } = {}) {
  const normalizedHighway = String(highway || '').trim().toUpperCase().replace(/\s+/g, '');
  const pointLimit = Math.round(numberParam(maxPoints, 0, 0, 40));
  const offset = Math.round(numberParam(pointOffset, 0, 0, 200));
  const runRef = db.collection('autohof_import_runs').doc();
  await runRef.set({
    runId: runRef.id,
    source: 'openstreetmap_overpass',
    sourceUrl: overpassApiUrl,
    highway: normalizedHighway || null,
    maxPoints: pointLimit || null,
    pointOffset: offset || null,
    status: 'running',
    startedAt: Timestamp.now(),
    importedCount: 0,
    errorCount: 0,
  });

  try {
    const response = await fetch(overpassApiUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
        'user-agent': 'Tankprofi/1.0 (autohof-import)',
      },
      body: new URLSearchParams({ data: autohofOverpassQuery({ highway: normalizedHighway, maxPoints: pointLimit, pointOffset: offset }) }).toString(),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Overpass failed with HTTP ${response.status}: ${text.slice(0, 200)}`);
    const data = JSON.parse(text);
    let stations = (data.elements || []).map((element) => normalizeAutohofElement(element, normalizedHighway)).filter(Boolean);
    const byNameAndPlace = new Map();
    stations.forEach((station) => {
      const key = `${station.name.toLowerCase()}_${station.postCode || ''}_${station.place || ''}`;
      const existing = byNameAndPlace.get(key);
      if (!existing || (station.hasFuel && !existing.hasFuel)) byNameAndPlace.set(key, station);
    });
    stations = [...byNameAndPlace.values()].sort((a, b) => String(a.name).localeCompare(String(b.name), 'de'));
    if (limit > 0) stations = stations.slice(0, limit);
    const persistStats = await upsertDirectoryStations(stations);

    await runRef.set({
      status: 'completed',
      completedAt: Timestamp.now(),
      discoveredCount: data.elements?.length || 0,
      importedCount: persistStats.importedCount,
      stationsCreated: persistStats.stationsCreated,
      stationsUpdated: persistStats.stationsUpdated,
      addressesCreated: persistStats.addressesCreated,
      errorCount: persistStats.errors.length,
      errors: persistStats.errors.slice(0, 20),
    }, { merge: true });

    return {
      runId: runRef.id,
      status: 'completed',
      discoveredCount: data.elements?.length || 0,
      ...persistStats,
      errorCount: persistStats.errors.length,
    };
  } catch (error) {
    await runRef.set({
      status: 'failed',
      completedAt: Timestamp.now(),
      error: error.message,
    }, { merge: true });
    throw error;
  }
}

function isLikelyAutohofTankerkoenigStation(station) {
  const haystack = [
    station.name,
    station.brand,
    station.street,
    station.place,
  ].filter(Boolean).join(' ');
  return autohofKeywords.test(haystack);
}

function matchesHighwayCandidateHints(station, highway) {
  const hints = highwayCandidateHints[highway];
  if (!hints) return true;
  const haystack = [
    station.name,
    station.brand,
    station.street,
    station.place,
  ].filter(Boolean).join(' ');
  return hints.test(haystack);
}

function normalizeTankerkoenigAutohofStation(station, highway, point) {
  const stationId = String(station.id || '').trim();
  const lat = Number(station.lat);
  const lng = Number(station.lng);
  if (!stationId || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const recordedAt = new Date().toISOString();
  return {
    stationId: `tk_${stationId}`,
    tankerkoenigId: stationId,
    osmId: null,
    osmType: null,
    source: 'tankerkoenig_highway_scan',
    sourceUrl: null,
    name: String(station.name || station.brand || 'Autohof').trim(),
    type: 'autohof',
    operator: station.brand || null,
    brand: station.brand || null,
    primaryFuelBrand: station.brand || null,
    fuelBrands: station.brand ? [station.brand] : [],
    sideLabel: null,
    directionSource: null,
    directionText: null,
    highway,
    exitRef: null,
    street: station.street || null,
    houseNumber: station.houseNumber || null,
    postCode: station.postCode || null,
    place: station.place || null,
    country: 'DE',
    lat,
    lng,
    hasFuel: true,
    hasTruckDiesel: null,
    hasEvCharging: null,
    hgv: null,
    parking: null,
    openingHours: null,
    phone: null,
    website: null,
    searchPointId: point?.id || null,
    searchPointLabel: point?.label || null,
    distanceKm: Number.isFinite(Number(station.dist)) ? roundPrice(station.dist) : null,
    priceSource: 'tankerkoenig_cached',
    priceMatch: {
      stationId,
      name: String(station.name || ''),
      brand: String(station.brand || ''),
      distanceKm: Number.isFinite(Number(station.dist)) ? roundPrice(station.dist) : null,
    },
    prices: {
      diesel: validPrice(station.diesel) ? { price: roundPrice(station.diesel), recordedAt } : null,
      e5: validPrice(station.e5) ? { price: roundPrice(station.e5), recordedAt } : null,
      e10: validPrice(station.e10) ? { price: roundPrice(station.e10), recordedAt } : null,
    },
    rawTankerkoenig: {
      name: station.name || null,
      brand: station.brand || null,
      street: station.street || null,
      houseNumber: station.houseNumber || null,
      postCode: station.postCode || null,
      place: station.place || null,
    },
    importedAt: FieldValue.serverTimestamp(),
  };
}

async function fetchTankerkoenigHighwayStations(point, radiusKm = 25) {
  const upstream = new URL('https://creativecommons.tankerkoenig.de/json/list.php');
  upstream.search = new URLSearchParams({
    lat: String(point.lat),
    lng: String(point.lng),
    rad: String(radiusKm),
    sort: 'dist',
    type: 'all',
    apikey: tankerkoenigKey(),
  }).toString();

  const response = await fetch(upstream, {
    headers: {
      accept: 'application/json',
      'user-agent': 'Tankprofi/1.0 (autohof-tankerkoenig-import)',
    },
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const preview = text.replace(/\s+/g, ' ').slice(0, 120);
    throw new Error(`Invalid JSON from Tankerkoenig (${response.status}): ${preview}`);
  }
  if (!response.ok || data.ok !== true) throw new Error(data.message || `Tankerkoenig failed with HTTP ${response.status}`);
  return data.stations || [];
}

function pointKey(point) {
  return `${Number(point.lat).toFixed(4)}_${Number(point.lng).toFixed(4)}`;
}

function sampleHighwaySearchPoints(points, maxPoints = 10) {
  const unique = [...new Map(points
    .filter((point) => Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng)))
    .map((point) => [pointKey(point), point])).values()];
  if (!maxPoints || unique.length <= maxPoints) return unique;
  const result = [];
  const lastIndex = unique.length - 1;
  for (let index = 0; index < maxPoints; index += 1) {
    result.push(unique[Math.round((index / Math.max(1, maxPoints - 1)) * lastIndex)]);
  }
  return [...new Map(result.map((point) => [pointKey(point), point])).values()];
}

async function loadHighwaySearchPointsFromData(highway, maxPoints = 10) {
  const points = [...(highwaySearchPoints[highway] || [])];
  const addDocs = (docs, source) => {
    docs.forEach((doc) => {
      const data = doc.data();
      const lat = Number(data.lat ?? data.latitude);
      const lng = Number(data.lng ?? data.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      points.push({
        id: `${source}_${doc.id}`,
        label: data.name || data.place || highway,
        lat,
        lng,
      });
    });
  };

  const [stationSnapshot, rastSnapshot, autohofSnapshot] = await Promise.all([
    db.collection('tankprofi_stations').where('autobahn', '==', highway).limit(200).get(),
    db.collection('autobahn_station_directory').where('highway', '==', highway).limit(200).get(),
    db.collection('autohof_station_directory').where('highway', '==', highway).limit(200).get(),
  ]);
  addDocs(stationSnapshot.docs, 'station');
  addDocs(rastSnapshot.docs, 'rast');
  addDocs(autohofSnapshot.docs, 'autohof');

  points.sort((a, b) => {
    const highwayNumber = Number(String(highway).match(/\d+/)?.[0] || 0);
    const eastWestHighways = new Set([4, 6, 8, 10, 12, 14, 20, 30, 38, 40, 44, 52, 60, 61, 70, 72, 96]);
    if (eastWestHighways.has(highwayNumber)) return Number(a.lng) - Number(b.lng) || Number(b.lat) - Number(a.lat);
    return Number(b.lat) - Number(a.lat) || Number(a.lng) - Number(b.lng);
  });

  return sampleHighwaySearchPoints(points, maxPoints);
}

async function availableHighwaysForServiceImport(maxHighways = 0) {
  const highways = new Set(Object.keys(highwaySearchPoints));
  const collect = async (collectionName) => {
    const snapshot = await db.collection(collectionName).limit(1000).get();
    snapshot.docs.forEach((doc) => {
      const highway = String(doc.data().highway || doc.data().autobahn || '').trim().toUpperCase().replace(/\s+/g, '');
      if (/^A\d{1,3}$/.test(highway)) highways.add(highway);
    });
  };
  await Promise.all([
    collect('autobahn_station_directory'),
    collect('autohof_station_directory'),
  ]);
  const sorted = [...highways].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)) || a.localeCompare(b, 'de'));
  return maxHighways > 0 ? sorted.slice(0, maxHighways) : sorted;
}

async function importTankerkoenigAutohofDirectory({ highway = 'A9', limit = 0, radiusKm = 25, maxPoints = 10, delayMs = 650 } = {}) {
  const normalizedHighway = String(highway || 'A9').trim().toUpperCase().replace(/\s+/g, '');
  const points = await loadHighwaySearchPointsFromData(normalizedHighway, maxPoints);
  if (!points.length) throw new Error(`No search points configured for ${normalizedHighway}.`);

  const runRef = db.collection('autohof_import_runs').doc();
  await runRef.set({
    runId: runRef.id,
    source: 'tankerkoenig_highway_scan',
    highway: normalizedHighway,
    status: 'running',
    startedAt: Timestamp.now(),
    importedCount: 0,
    errorCount: 0,
  });

  try {
    const byId = new Map();
    const errors = [];
    let discoveredCount = 0;

    for (const point of points) {
      try {
        const stations = await fetchTankerkoenigHighwayStations(point, radiusKm);
        discoveredCount += stations.length;
        stations
          .filter((station) => isLikelyAutohofTankerkoenigStation(station) && matchesHighwayCandidateHints(station, normalizedHighway))
          .map((station) => normalizeTankerkoenigAutohofStation(station, normalizedHighway, point))
          .filter(Boolean)
          .forEach((station) => {
            const current = byId.get(station.stationId);
            if (!current || Number(station.distanceKm || 999) < Number(current.distanceKm || 999)) byId.set(station.stationId, station);
          });
      } catch (error) {
        errors.push({ point: point.id, message: error.message });
      }
      if (delayMs > 0) await sleep(delayMs);
    }

    let stations = [...byId.values()].sort((a, b) => String(a.name).localeCompare(String(b.name), 'de'));
    if (limit > 0) stations = stations.slice(0, limit);
    const persistStats = await upsertDirectoryStations(stations);

    const archiveRows = stations.flatMap((station) => cityFuels
      .map((fuel) => ({
        tankerkoenig_id: station.tankerkoenigId,
        name: station.priceMatch?.name || station.name,
        brand: station.brand || '',
        street: station.street || '',
        house_number: station.houseNumber || '',
        postcode: station.postCode || '',
        city: station.place || '',
        lat: station.lat,
        lng: station.lng,
        distance: station.distanceKm || 0,
        is_open: true,
        fuel_type: fuel,
        price: station.prices?.[fuel]?.price ?? null,
      }))
      .filter((row) => validPrice(row.price)));
    if (archiveRows.length) await rememberStations(archiveRows);

    await runRef.set({
      status: 'completed',
      completedAt: Timestamp.now(),
      discoveredCount,
      importedCount: persistStats.importedCount,
      stationsCreated: persistStats.stationsCreated,
      stationsUpdated: persistStats.stationsUpdated,
      addressesCreated: persistStats.addressesCreated,
      removedCount: 0,
      errorCount: errors.length + persistStats.errors.length,
      errors: [...errors, ...persistStats.errors.map((message) => ({ message }))],
    }, { merge: true });

    return {
      runId: runRef.id,
      status: 'completed',
      highway: normalizedHighway,
      discoveredCount,
      ...persistStats,
      removedCount: 0,
      errorCount: errors.length + persistStats.errors.length,
      stations: stations.map((station) => ({
        stationId: station.stationId,
        tankerkoenigId: station.tankerkoenigId,
        name: station.name,
        brand: station.brand,
        highway: station.highway,
        place: station.place,
        street: station.street,
      })),
      errors,
    };
  } catch (error) {
    await runRef.set({
      status: 'failed',
      completedAt: Timestamp.now(),
      error: error.message,
    }, { merge: true });
    throw error;
  }
}

function kmToLat(km) {
  return km / 111.32;
}

function kmToLon(km, lat) {
  const scale = Math.max(0.25, Math.cos((Number(lat) * Math.PI) / 180));
  return km / (111.32 * scale);
}

function scanCellId({ country, source, centerLat, centerLon, radiusKm, splitLevel = 0, parentCellId = '' }) {
  return stableHash([
    country,
    source,
    Number(centerLat).toFixed(5),
    Number(centerLon).toFixed(5),
    Number(radiusKm).toFixed(3),
    splitLevel,
    parentCellId,
  ].join('|'), 'cell');
}

function germanySeedPoints({ radiusKm = scanMaxRadiusKm, spacingKm = 19, limit = 0 } = {}) {
  const points = [];
  const minLat = 47.2;
  const maxLat = 55.15;
  const minLon = 5.8;
  const maxLon = 15.15;
  for (let lat = minLat; lat <= maxLat; lat += kmToLat(spacingKm)) {
    const lonStep = kmToLon(spacingKm, lat);
    for (let lon = minLon; lon <= maxLon; lon += lonStep) {
      points.push({
        country: 'DE',
        region: null,
        postcodeArea: null,
        centerLat: Math.round(lat * 100000) / 100000,
        centerLon: Math.round(lon * 100000) / 100000,
        radiusKm,
      });
      if (limit > 0 && points.length >= limit) return points;
    }
  }
  return points;
}

function cityRegionSeedPoints(config, { limit = 0 } = {}) {
  const points = [];
  const radiusKm = Number(config.radiusKm || 5);
  const spacingKm = Number(config.spacingKm || radiusKm);
  const latStart = Number(config.minLat) - kmToLat(radiusKm * 0.55);
  const latEnd = Number(config.maxLat) + kmToLat(radiusKm * 0.55);
  for (let lat = latStart; lat <= latEnd; lat += kmToLat(spacingKm)) {
    const lonStart = Number(config.minLon) - kmToLon(radiusKm * 0.55, lat);
    const lonEnd = Number(config.maxLon) + kmToLon(radiusKm * 0.55, lat);
    const lonStep = kmToLon(spacingKm, lat);
    for (let lon = lonStart; lon <= lonEnd; lon += lonStep) {
      points.push({
        country: config.country || 'DE',
        region: config.region || config.cityName || null,
        cityId: config.cityId || null,
        cityName: config.cityName || null,
        postcodeArea: null,
        centerLat: Math.round(lat * 100000) / 100000,
        centerLon: Math.round(lon * 100000) / 100000,
        radiusKm,
      });
      if (limit > 0 && points.length >= limit) return points;
    }
  }
  return points;
}

function scanSeedPointsForMode(mode, { limit = 0 } = {}) {
  const normalizedMode = String(mode || 'seed_de_grid').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
  if (normalizedMode === 'seed_de_grid') {
    return {
      mode: normalizedMode,
      country: 'DE',
      radiusKm: scanMaxRadiusKm,
      cells: germanySeedPoints({ radiusKm: scanMaxRadiusKm, spacingKm: 19, limit }),
    };
  }
  const cityId = normalizedMode.replace(/^city_/, '').replace(/^scan_/, '');
  const config = cityScanConfigs[cityId];
  if (!config) throw new Error(`Unsupported scan mode: ${mode}`);
  return {
    mode: `city_${config.cityId}`,
    country: config.country || 'DE',
    region: config.region || config.cityName || null,
    cityId: config.cityId,
    cityName: config.cityName,
    radiusKm: config.radiusKm,
    cells: cityRegionSeedPoints(config, { limit }),
  };
}

async function createTankprofiScanRun({ country = 'DE', source = 'tankkoenig', mode = 'seed_de_grid', limit = 0 } = {}) {
  const normalizedCountry = normalizeCountry(country);
  if (normalizedCountry !== 'DE' || source !== 'tankkoenig') {
    throw new Error('Initial scan seeding currently supports DE with tankkoenig only.');
  }
  const seed = scanSeedPointsForMode(mode, { limit });
  const runRef = db.collection('tankprofi_scan_runs').doc();
  const cells = seed.cells;
  const now = FieldValue.serverTimestamp();
  await runRef.set({
    scanRunId: runRef.id,
    country: normalizedCountry,
    source,
    mode: seed.mode,
    region: seed.region || null,
    cityId: seed.cityId || null,
    cityName: seed.cityName || null,
    status: 'running',
    startedAt: now,
    finishedAt: null,
    cellsTotal: cells.length,
    cellsDone: 0,
    cellsError: 0,
    stationsCreated: 0,
    stationsUpdated: 0,
    addressesCreated: 0,
    errors: [],
    createdAt: now,
    updatedAt: now,
  });

  for (let index = 0; index < cells.length; index += 400) {
    const batch = db.batch();
    cells.slice(index, index + 400).forEach((cell) => {
      const cellId = scanCellId({ ...cell, source, splitLevel: 0 });
      batch.set(db.collection('tankprofi_scan_cells').doc(cellId), {
        cellId,
        scanRunId: runRef.id,
        country: normalizedCountry,
        region: cell.region,
        cityId: cell.cityId || null,
        cityName: cell.cityName || null,
        postcodeArea: cell.postcodeArea,
        centerLat: cell.centerLat,
        centerLon: cell.centerLon,
        radiusKm: cell.radiusKm,
        maxRadiusKm: scanMaxRadiusKm,
        maxResultsLimit: scanMaxResultsLimit,
        resultCount: null,
        isResultLimitReached: false,
        source,
        status: 'pending',
        splitLevel: 0,
        parentCellId: null,
        childCellIds: [],
        coverageConfirmed: false,
        minRadiusReached: false,
        manualReviewRequired: false,
        lastScannedAt: null,
        retryCount: 0,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
      }, { merge: true });
    });
    await batch.commit();
  }

  await updateTankprofiCoverage(normalizedCountry, source);
  return {
    scanRunId: runRef.id,
    country: normalizedCountry,
    source,
    mode: seed.mode,
    region: seed.region || null,
    cityId: seed.cityId || null,
    radiusKm: seed.radiusKm,
    cellsTotal: cells.length,
  };
}

async function fetchTankkoenigScanStations({ centerLat, centerLon, radiusKm }) {
  const radius = Math.min(scanMaxRadiusKm, Math.max(1, Number(radiusKm) || scanMaxRadiusKm));
  const upstream = new URL('https://creativecommons.tankerkoenig.de/json/list.php');
  upstream.search = new URLSearchParams({
    lat: String(centerLat),
    lng: String(centerLon),
    rad: String(radius),
    sort: 'dist',
    type: 'all',
    apikey: tankerkoenigKey(),
  }).toString();
  const response = await fetch(upstream, {
    headers: {
      accept: 'application/json',
      'user-agent': 'Tankprofi/1.0 (systematic-scan)',
    },
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from Tankerkoenig (${response.status}): ${text.slice(0, 120)}`);
  }
  if (!response.ok || data.ok !== true) throw new Error(data.message || `Tankerkoenig failed with HTTP ${response.status}`);
  return data.stations || [];
}

function childCellsFor(cell) {
  const parentRadius = Math.min(scanMaxRadiusKm, Number(cell.radiusKm) || scanMaxRadiusKm);
  const childRadius = Math.max(scanMinRadiusKm, parentRadius / 2);
  const spacing = childRadius * 0.78;
  const centers = [
    [-spacing, -spacing],
    [-spacing, spacing],
    [spacing, -spacing],
    [spacing, spacing],
    [0, 0],
  ];
  return centers.map(([latOffsetKm, lonOffsetKm]) => ({
    country: cell.country,
    region: cell.region || null,
    cityId: cell.cityId || null,
    cityName: cell.cityName || null,
    postcodeArea: cell.postcodeArea || null,
    centerLat: Math.round((Number(cell.centerLat) + kmToLat(latOffsetKm)) * 100000) / 100000,
    centerLon: Math.round((Number(cell.centerLon) + kmToLon(lonOffsetKm, Number(cell.centerLat))) * 100000) / 100000,
    radiusKm: childRadius,
    splitLevel: Number(cell.splitLevel || 0) + 1,
    parentCellId: cell.cellId,
  }));
}

async function splitScanCell(cell) {
  const children = childCellsFor(cell);
  const childCellIds = children.map((child) => scanCellId({ ...child, source: cell.source }));
  const batch = db.batch();
  children.forEach((child, index) => {
    batch.set(db.collection('tankprofi_scan_cells').doc(childCellIds[index]), {
      cellId: childCellIds[index],
      scanRunId: cell.scanRunId,
      country: child.country,
      region: child.region,
      cityId: child.cityId || null,
      cityName: child.cityName || null,
      postcodeArea: child.postcodeArea,
      centerLat: child.centerLat,
      centerLon: child.centerLon,
      radiusKm: child.radiusKm,
      maxRadiusKm: scanMaxRadiusKm,
      maxResultsLimit: scanMaxResultsLimit,
      resultCount: null,
      isResultLimitReached: false,
      source: cell.source,
      status: 'pending',
      splitLevel: child.splitLevel,
      parentCellId: child.parentCellId,
      childCellIds: [],
      coverageConfirmed: false,
      minRadiusReached: false,
      manualReviewRequired: false,
      lastScannedAt: null,
      retryCount: 0,
      errorMessage: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  batch.set(db.collection('tankprofi_scan_cells').doc(cell.cellId), {
    status: 'needs_split',
    isResultLimitReached: true,
    coverageConfirmed: false,
    childCellIds,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();
  return childCellIds;
}

async function updateTankprofiCoverage(country = 'DE', source = 'tankkoenig') {
  const snapshot = await db.collection('tankprofi_scan_cells')
    .where('country', '==', country)
    .where('source', '==', source)
    .limit(5000)
    .get();
  const totals = snapshot.docs.reduce((acc, doc) => {
    const cell = doc.data();
    acc.cellsTotal += 1;
    if (cell.status === 'done' && cell.coverageConfirmed === true && Number(cell.resultCount) < scanMaxResultsLimit) acc.cellsDone += 1;
    else if (cell.status === 'error') acc.cellsError += 1;
    else acc.cellsPending += 1;
    return acc;
  }, { cellsTotal: 0, cellsDone: 0, cellsError: 0, cellsPending: 0 });
  const stationSnapshot = await db.collection('tankprofi_stations')
    .where('country', '==', country)
    .limit(5000)
    .get();
  const coveragePercent = totals.cellsTotal ? Math.round((totals.cellsDone / totals.cellsTotal) * 10000) / 100 : 0;
  const coverageId = `${source}_${country}`;
  await db.collection('tankprofi_coverage').doc(coverageId).set({
    coverageId,
    country,
    region: null,
    ...totals,
    coveragePercent,
    knownStations: stationSnapshot.size,
    lastFullScanAt: totals.cellsTotal > 0 && totals.cellsPending === 0 && totals.cellsError === 0 ? FieldValue.serverTimestamp() : null,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function updateScanRunProgress(cell, result) {
  if (!cell.scanRunId) return;
  const update = {
    updatedAt: FieldValue.serverTimestamp(),
    stationsCreated: FieldValue.increment(Number(result.stationsCreated || 0)),
    stationsUpdated: FieldValue.increment(Number(result.stationsUpdated || 0)),
    addressesCreated: FieldValue.increment(Number(result.addressesCreated || 0)),
  };
  if (result.status === 'done') update.cellsDone = FieldValue.increment(1);
  if (result.status === 'error') {
    update.cellsError = FieldValue.increment(1);
    update.errors = FieldValue.arrayUnion(result.error || 'Unknown scan cell error');
  }
  if (result.status === 'manual_review') {
    update.errors = FieldValue.arrayUnion(`Manual review required for ${cell.cellId}`);
  }
  if (Array.isArray(result.childCellIds) && result.childCellIds.length) {
    update.cellsTotal = FieldValue.increment(result.childCellIds.length);
  }
  await db.collection('tankprofi_scan_runs').doc(cell.scanRunId).set(update, { merge: true });
}

async function processOneScanCell(cellDoc) {
  const cell = { ...cellDoc.data(), cellId: cellDoc.id };
  const cellRef = cellDoc.ref;
  await cellRef.set({
    status: 'scanning',
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  try {
    const rawStations = await fetchTankkoenigScanStations({
      centerLat: cell.centerLat,
      centerLon: cell.centerLon,
      radiusKm: Math.min(scanMaxRadiusKm, Number(cell.radiusKm) || scanMaxRadiusKm),
    });
    const stations = rawStations.map((station) => ({
      ...normalizeStation({ ...station, price: station.e10 ?? station.e5 ?? station.diesel }, 'e10'),
      diesel: station.diesel,
      e5: station.e5,
      e10: station.e10,
    }));
    const persistStats = await rememberTankprofiStations(stations, {
      source: cell.source || 'tankkoenig',
      writePriceHistory: true,
    });
    const resultCount = Math.min(scanMaxResultsLimit, rawStations.length);
    const isResultLimitReached = resultCount >= scanMaxResultsLimit;
    const minRadiusReached = Number(cell.radiusKm) <= scanMinRadiusKm;

    if (isResultLimitReached && minRadiusReached) {
      await cellRef.set({
        status: 'manual_review',
        resultCount,
        isResultLimitReached: true,
        coverageConfirmed: false,
        minRadiusReached: true,
        manualReviewRequired: true,
        lastScannedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      await logTankprofiEvent({
        type: 'scan_cell_limit',
        level: 'warn',
        message: `Scan cell ${cell.cellId} still returned ${resultCount} results at minimum radius.`,
        source: cell.source,
        rawData: cell,
      });
      const result = { status: 'manual_review', resultCount, ...persistStats };
      await updateScanRunProgress(cell, result);
      return result;
    }

    if (isResultLimitReached) {
      const childCellIds = await splitScanCell({
        ...cell,
        resultCount,
      });
      await cellRef.set({
        resultCount,
        childCellIds,
        lastScannedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      const result = { status: 'needs_split', resultCount, childCellIds, ...persistStats };
      await updateScanRunProgress(cell, result);
      return result;
    }

    await cellRef.set({
      status: 'done',
      resultCount,
      isResultLimitReached: false,
      coverageConfirmed: true,
      minRadiusReached,
      manualReviewRequired: false,
      lastScannedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    const result = { status: 'done', resultCount, ...persistStats };
    await updateScanRunProgress(cell, result);
    return result;
  } catch (error) {
    await cellRef.set({
      status: 'error',
      retryCount: FieldValue.increment(1),
      errorMessage: error.message,
      coverageConfirmed: false,
      lastScannedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    await logTankprofiEvent({
      type: 'scan_cell_error',
      level: 'error',
      message: error.message,
      source: cell.source,
      rawData: cell,
    }).catch(() => null);
    const result = { status: 'error', error: error.message };
    await updateScanRunProgress(cell, result);
    return result;
  }
}

async function processTankprofiScanCells({ limit = 5, country = 'DE', source = 'tankkoenig', retryErrors = false } = {}) {
  const safeLimit = Math.max(1, Math.min(25, Math.round(limit)));
  const statuses = retryErrors ? ['pending', 'error'] : ['pending'];
  const docs = [];
  for (const status of statuses) {
    if (docs.length >= safeLimit) break;
    const snapshot = await db.collection('tankprofi_scan_cells')
      .where('country', '==', country)
      .where('source', '==', source)
      .where('status', '==', status)
      .limit(safeLimit - docs.length)
      .get();
    snapshot.docs.forEach((doc) => docs.push(doc));
  }
  const results = [];
  for (const doc of docs) {
    results.push(await processOneScanCell(doc));
    await sleep(1200);
  }
  await updateTankprofiCoverage(country, source);
  return { processed: results.length, retryErrors, results };
}

async function handleGeocode(req, res) {
  const query = String(req.query.q || '').trim();
  if (!query) return sendJson(res, { error: 'Missing parameter: q' }, 422);

  const upstream = new URL('https://nominatim.openstreetmap.org/search');
  upstream.search = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    countrycodes: 'de',
    limit: '6',
  }).toString();

  const response = await fetch(upstream, {
    headers: {
      accept: 'application/json',
      'user-agent': 'Tankprofi/1.0 (firebase-function)',
    },
  });

  if (!response.ok) {
    return sendJson(res, { error: 'Nominatim request failed.' }, 502);
  }

  const data = await response.json();
  const items = data.map((item) => ({
    label: String(item.display_name || ''),
    lat: Number(item.lat || 0),
    lng: Number(item.lon || 0),
    type: String(item.type || ''),
  }));

  return sendJson(res, { items });
}

async function handleReverse(req, res) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return sendJson(res, { error: 'Invalid coordinates.' }, 422);
  }

  const upstream = new URL('https://nominatim.openstreetmap.org/reverse');
  upstream.search = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'jsonv2',
    addressdetails: '1',
    zoom: '18',
  }).toString();

  const response = await fetch(upstream, {
    headers: {
      accept: 'application/json',
      'user-agent': 'Tankprofi/1.0 (firebase-function)',
    },
  });

  if (!response.ok) {
    return sendJson(res, { error: 'Nominatim reverse request failed.' }, 502);
  }

  const data = await response.json();
  return sendJson(res, { label: data.display_name || 'Aktueller Standort' });
}

async function handleSearch(req, res) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return sendJson(res, { error: 'Invalid coordinates.' }, 422);
  }

  const radius = numberParam(req.query.radius, 5, 1, 25);
  const fuel = fuelParam(req.query.fuel);
  const limit = Math.round(numberParam(req.query.limit, 25, 5, 100));
  const onlyOpen = String(req.query.open || '0') === '1';
  const onlyPriced = String(req.query.priced || '1') === '1';
  const forceLive = String(req.query.live || req.query.forceLive || '0') === '1';
  const storedOnly = String(req.query.stored || req.query.cache || '0') === '1';
  const sortMode = String(req.query.sort || 'price') === 'distance' ? 'distance' : 'price';
  const searchText = String(req.query.q || '').trim();

  const loadStoredStations = () => searchStoredTankprofiStations({
    lat,
    lng,
    radius,
    fuel,
    limit,
    onlyOpen,
    onlyPriced,
    sortMode,
  });

  if (storedOnly && !forceLive) {
    const storedStations = await loadStoredStations();
    return sendJson(res, {
      fuel,
      count: storedStations.length,
      updated_at: new Date().toISOString(),
      stored: true,
      stations: storedStations,
    });
  }

  const upstream = new URL('https://creativecommons.tankerkoenig.de/json/list.php');
  upstream.search = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    rad: String(radius),
    sort: 'dist',
    type: 'all',
    apikey: tankerkoenigKey(),
  }).toString();

  let data;
  try {
    const result = await fetchJsonWithTimeout(upstream, { headers: { accept: 'application/json' } }, 6000);
    const response = result.response;
    data = result.data;
    if (!response.ok || data.ok !== true) {
      throw new Error(data.message || 'Tankerkoenig request failed.');
    }
  } catch (error) {
    const storedStations = forceLive ? [] : await loadStoredStations();
    if (storedStations.length) {
      await logTankprofiEvent({
        type: 'search_fallback',
        level: 'warn',
        message: `Live search failed, stored stations used: ${error.message}`,
        source: 'tankkoenig',
        rawData: { lat, lng, radius, fuel, limit },
      }).catch(() => null);

      return sendJson(res, {
        fuel,
        count: storedStations.length,
        updated_at: new Date().toISOString(),
        fallback: true,
        stored: true,
        message: 'Live-Daten nicht erreichbar. Gespeicherte Tankstellen werden angezeigt.',
        stations: storedStations,
      });
    }

    await logTankprofiEvent({
      type: 'search_fallback',
      level: 'error',
      message: `Live search failed and no stored stations were found: ${error.message}`,
      source: 'tankkoenig',
      rawData: { lat, lng, radius, fuel, limit },
    }).catch(() => null);

    return sendJson(res, {
      fuel,
      count: 0,
      updated_at: new Date().toISOString(),
      fallback: true,
      message: 'Live-Daten nicht erreichbar und keine gespeicherten Tankstellen im Radius gefunden.',
      stations: [],
    });
  }

  const discoveredStations = (data.stations || []).map((station) => normalizeStation(station, fuel));
  let stations = [...discoveredStations];
  if (onlyOpen) stations = stations.filter((station) => station.is_open);
  if (onlyPriced) stations = stations.filter((station) => station.price !== null);
  stations.sort((a, b) => (
    sortMode === 'distance'
      ? a.distance - b.distance || (a.price ?? Number.MAX_VALUE) - (b.price ?? Number.MAX_VALUE)
      : (a.price ?? Number.MAX_VALUE) - (b.price ?? Number.MAX_VALUE) || a.distance - b.distance
  ));
  stations = stations.slice(0, limit);

  let persistStats = null;
  try {
    await rememberSearch({ searchText, lat, lng, radius, fuel, resultCount: discoveredStations.length, device: requestDeviceSummary(req) });
    persistStats = await rememberStations(discoveredStations);
  } catch (error) {
    console.warn('Tankprofi persistence skipped:', error.message);
  }

  return sendJson(res, {
    fuel,
    count: stations.length,
    updated_at: new Date().toISOString(),
    persisted: Boolean(persistStats),
    persistStats,
    stations,
  });
}

async function searchStoredTankprofiStations({
  lat,
  lng,
  radius,
  fuel,
  limit,
  onlyOpen,
  onlyPriced,
  sortMode = 'price',
}) {
  const latDelta = radius / 111.32;
  const lonScale = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const lngDelta = radius / (111.32 * lonScale);
  const minLat = lat - latDelta;
  const maxLat = lat + latDelta;
  const minLng = lng - lngDelta;
  const maxLng = lng + lngDelta;

  const snapshot = await db.collection('tankprofi_stations')
    .where('latitude', '>=', minLat)
    .where('latitude', '<=', maxLat)
    .limit(800)
    .get();

  const candidates = snapshot.docs
    .map((doc) => {
      const data = doc.data();
      const tankerkoenigId = explicitTankerkoenigId(data, doc.id);
      if (!tankerkoenigId) return null;
      const priceData = data.currentPrices?.[fuel] || null;
      const distance = distanceKmBetween(lat, lng, data.latitude, data.longitude);
      return {
        docId: doc.id,
        addressId: data.addressId || null,
        tankerkoenig_id: tankerkoenigId,
        name: data.name || 'Tankstelle',
        brand: data.brand || '',
        street: '',
        house_number: '',
        postcode: '',
        city: '',
        lat: Number(data.latitude),
        lng: Number(data.longitude),
        distance,
        is_open: priceData?.isOpen ?? data.isOpen ?? null,
        fuel_type: fuel,
        price: validPrice(priceData?.price) ? priceData.price : null,
        prices: {
          diesel: data.currentPrices?.diesel ? {
            price: validPrice(data.currentPrices.diesel.price) ? data.currentPrices.diesel.price : null,
            recordedAt: isoFromTimestamp(data.currentPrices.diesel.reportedAt || data.currentPricesUpdatedAt),
          } : null,
          e5: data.currentPrices?.e5 ? {
            price: validPrice(data.currentPrices.e5.price) ? data.currentPrices.e5.price : null,
            recordedAt: isoFromTimestamp(data.currentPrices.e5.reportedAt || data.currentPricesUpdatedAt),
          } : null,
          e10: data.currentPrices?.e10 ? {
            price: validPrice(data.currentPrices.e10.price) ? data.currentPrices.e10.price : null,
            recordedAt: isoFromTimestamp(data.currentPrices.e10.reportedAt || data.currentPricesUpdatedAt),
          } : null,
        },
        last_update: isoFromTimestamp(priceData?.reportedAt || data.currentPricesUpdatedAt || data.updatedAt),
      };
    })
    .filter((station) => {
      if (!station) return false;
      if (!Number.isFinite(station.lat) || !Number.isFinite(station.lng)) return false;
      if (station.lng < minLng || station.lng > maxLng) return false;
      if (!Number.isFinite(station.distance) || station.distance > radius) return false;
      if (onlyOpen && station.is_open === false) return false;
      if (onlyPriced && station.price === null) return false;
      return true;
    })
    .sort((a, b) => (
      sortMode === 'distance'
        ? a.distance - b.distance || (a.price ?? Number.MAX_VALUE) - (b.price ?? Number.MAX_VALUE)
        : (a.price ?? Number.MAX_VALUE) - (b.price ?? Number.MAX_VALUE) || a.distance - b.distance
    ))
    .slice(0, limit);

  await Promise.all(candidates.map(async (station) => {
    if (!station.addressId) return;
    const addressDoc = await db.collection('tankprofi_addresses').doc(station.addressId).get();
    if (!addressDoc.exists) return;
    const address = addressDoc.data();
    station.street = address.street || '';
    station.house_number = address.houseNumber || '';
    station.postcode = address.postcode || '';
    station.city = address.city || '';
  }));

  return candidates.map(({ docId, addressId, ...station }) => station);
}

function applyCanonicalAddress(target, address) {
  if (!address) return target;
  return {
    ...target,
    addressId: address.addressId || target.addressId || null,
    street: address.street || '',
    houseNumber: address.houseNumber || '',
    postCode: address.postcode || '',
    place: address.city || '',
    country: address.country || target.country || 'DE',
    lat: Number.isFinite(Number(target.lat)) ? target.lat : address.latitude,
    lng: Number.isFinite(Number(target.lng)) ? target.lng : address.longitude,
  };
}

async function hydrateCanonicalAddresses(items) {
  const addressIds = [...new Set(items.map((item) => item.addressId).filter(Boolean))];
  if (!addressIds.length) return items;

  const addressMap = new Map();
  await Promise.all(addressIds.map(async (addressId) => {
    const doc = await db.collection('tankprofi_addresses').doc(addressId).get();
    if (doc.exists) addressMap.set(addressId, doc.data());
  }));

  return items.map((item) => applyCanonicalAddress(item, addressMap.get(item.addressId)));
}

async function handleHistory(req, res) {
  const tankerkoenigId = String(req.query.tankerkoenig_id || '').trim();
  const fuel = fuelParam(req.query.fuel);
  if (!tankerkoenigId) return sendJson(res, { items: [] });

  const snapshot = await db
    .collection('tankprofi_prices')
    .where('stationId', '==', `tankkoenig_${tankerkoenigId}`)
    .where('fuelType', '==', fuel)
    .orderBy('reportedAt', 'desc')
    .limit(200)
    .get();

  const items = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      fuel_type: data.fuelType,
      price: data.price,
      recorded_at: data.reportedAt?.toDate?.().toISOString() || null,
    };
  });

  return sendJson(res, { items });
}

function isoFromTimestamp(value) {
  return value?.toDate?.().toISOString?.() || null;
}

function distanceKmBetween(latA, lngA, latB, lngB) {
  const aLat = Number(latA);
  const aLng = Number(lngA);
  const bLat = Number(latB);
  const bLng = Number(lngB);
  if (![aLat, aLng, bLat, bLng].every(Number.isFinite)) return Number.POSITIVE_INFINITY;
  const toRad = (value) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const startLat = toRad(aLat);
  const endLat = toRad(bLat);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(startLat) * Math.cos(endLat) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function roundPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(number * 1000) / 1000;
}

function validPrice(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0.5 && number < 3.5;
}

function priceCategory(delta, thresholds = cityPriceThresholds) {
  if (!Number.isFinite(delta)) return null;
  if (delta <= thresholds.cheapDelta) return 'cheap';
  if (delta >= thresholds.expensiveDelta) return 'expensive';
  return 'medium';
}

function cityStationDocId(snapshotId, cityId, stationId) {
  return `${snapshotId}_${cityId}_${stationId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function writeInChunks(items, writer) {
  for (let index = 0; index < items.length; index += 450) {
    const batch = db.batch();
    items.slice(index, index + 450).forEach((item) => writer(batch, item));
    await batch.commit();
  }
}

async function seedCityConfigIfMissing() {
  const existing = await db.collection('fuel_city_config').where('active', '==', true).limit(1).get();
  if (!existing.empty) return;

  await writeInChunks(defaultCityConfig, (batch, city) => {
    batch.set(db.collection('fuel_city_config').doc(city.cityId), {
      ...city,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

async function loadCityConfig() {
  await seedCityConfigIfMissing();
  const snapshot = await db.collection('fuel_city_config')
    .where('active', '==', true)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const centerLat = Number(data.centerLat);
    const centerLng = Number(data.centerLng);
    const searchPoints = Array.isArray(data.searchPoints) && data.searchPoints.length
      ? data.searchPoints
      : [{ id: 'center', label: 'Zentrum', lat: centerLat, lng: centerLng }];

    return {
      cityId: String(data.cityId || doc.id),
      cityName: String(data.cityName || doc.id),
      state: String(data.state || ''),
      country: String(data.country || 'DE'),
      centerLat,
      centerLng,
      radiusKm: numberParam(data.radiusKm, 25, 1, 25),
      maxStations: Math.round(numberParam(data.maxStations, 100, 1, 100)),
      sortOrder: Number(data.sortOrder || 0),
      searchPoints: searchPoints
        .map((point, index) => ({
          id: String(point.id || `point-${index + 1}`),
          label: String(point.label || point.id || `Punkt ${index + 1}`),
          lat: Number(point.lat),
          lng: Number(point.lng),
        }))
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)),
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder || a.cityName.localeCompare(b.cityName, 'de'));
}

async function loadCitySettings() {
  const settings = await db.collection('fuel_city_config').doc('_settings').get();
  const data = settings.exists ? settings.data() : {};
  return {
    cheapDelta: Number.isFinite(Number(data.cheapDelta)) ? Number(data.cheapDelta) : cityPriceThresholds.cheapDelta,
    expensiveDelta: Number.isFinite(Number(data.expensiveDelta)) ? Number(data.expensiveDelta) : cityPriceThresholds.expensiveDelta,
  };
}

async function fetchCityStations(city, point) {
  const upstream = new URL('https://creativecommons.tankerkoenig.de/json/list.php');
  upstream.search = new URLSearchParams({
    lat: String(point.lat),
    lng: String(point.lng),
    rad: String(city.radiusKm),
    sort: 'dist',
    type: 'all',
    apikey: tankerkoenigKey(),
  }).toString();

  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(upstream, {
        headers: {
          accept: 'application/json',
          'user-agent': 'Tankprofi/1.0 (city-snapshot)',
        },
        signal: AbortSignal.timeout(9000),
      });
      const body = await response.text();
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        const preview = body.replace(/\s+/g, ' ').slice(0, 120);
        throw new Error(`Invalid JSON from Tankerkoenig (${response.status}): ${preview}`);
      }

      if (!response.ok || data.ok !== true) {
        throw new Error(data.message || `Tankerkoenig request failed with status ${response.status}.`);
      }

      return (data.stations || []).slice(0, city.maxStations);
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(cityRetryDelayMs * attempt);
    }
  }

  throw new Error(`${city.cityName}: ${lastError?.message || 'Tankerkoenig request failed.'}`);
}

function mergeStation(stationMap, station, pointId) {
  const stationId = String(station.id || '').trim();
  if (!stationId) return;

  const current = stationMap.get(stationId) || {
    stationId,
    name: String(station.name || ''),
    brand: String(station.brand || ''),
    address: [station.street, station.houseNumber, station.postCode, station.place].filter(Boolean).join(' '),
    street: String(station.street || ''),
    houseNumber: String(station.houseNumber || ''),
    postCode: String(station.postCode || ''),
    place: String(station.place || ''),
    lat: Number(station.lat || 0),
    lng: Number(station.lng || 0),
    distanceKm: Number(station.dist || Number.POSITIVE_INFINITY),
    isOpen: station.isOpen === true ? true : station.isOpen === false ? false : null,
    searchPointIds: [],
    diesel: null,
    e5: null,
    e10: null,
  };

  const distance = Number(station.dist);
  if (Number.isFinite(distance) && distance < current.distanceKm) {
    current.distanceKm = distance;
  }

  if (!current.searchPointIds.includes(pointId)) current.searchPointIds.push(pointId);
  current.isOpen = current.isOpen === true || station.isOpen === true
    ? true
    : (current.isOpen === false || station.isOpen === false ? false : null);
  cityFuels.forEach((fuel) => {
    const price = Number(station[fuel]);
    if (validPrice(price)) current[fuel] = roundPrice(price);
  });
  stationMap.set(stationId, current);
}

function statsFor(stations, fuel) {
  const prices = stations
    .map((station) => station[fuel])
    .filter((price) => validPrice(price));

  if (!prices.length) {
    return { count: 0, avg: null, min: null, max: null, range: null };
  }

  const sum = prices.reduce((total, price) => total + price, 0);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return {
    count: prices.length,
    avg: roundPrice(sum / prices.length),
    min: roundPrice(min),
    max: roundPrice(max),
    range: roundPrice(max - min),
  };
}

function rankCities(rankings, fuel) {
  const avgKey = `avg${fuel[0].toUpperCase()}${fuel.slice(1)}`;
  const rankKey = `rank${fuel[0].toUpperCase()}${fuel.slice(1)}`;
  const sorted = rankings
    .filter((item) => validPrice(item[avgKey]))
    .sort((a, b) => a[avgKey] - b[avgKey] || a.cityName.localeCompare(b.cityName, 'de'));

  sorted.forEach((item, index) => {
    item[rankKey] = index + 1;
  });
}

function currentAverageFor(ranking, fuel) {
  const key = `avg${fuel[0].toUpperCase()}${fuel.slice(1)}`;
  return ranking[key];
}

function withPriceDeltas(station, ranking, thresholds) {
  const result = { ...station };
  cityFuels.forEach((fuel) => {
    const suffix = fuel === 'e5' ? 'E5' : fuel === 'e10' ? 'E10' : 'Diesel';
    const avg = currentAverageFor(ranking, fuel);
    const price = station[fuel];
    const delta = validPrice(price) && validPrice(avg) ? roundPrice(price - avg) : null;
    result[`priceDelta${suffix}`] = delta;
    result[`priceCategory${suffix}`] = priceCategory(delta, thresholds);
  });
  return result;
}

function cityStationForTankprofiPersistence(station, city) {
  return {
    tankerkoenig_id: station.stationId,
    source: 'tankkoenig',
    country: city.country || 'DE',
    name: station.name,
    brand: station.brand,
    street: station.street,
    house_number: station.houseNumber,
    postcode: station.postCode,
    city: station.place || city.cityName,
    lat: station.lat,
    lng: station.lng,
    distance: station.distanceKm,
    is_open: station.isOpen === true ? true : station.isOpen === false ? false : null,
    diesel: station.diesel,
    e5: station.e5,
    e10: station.e10,
    last_update: new Date().toISOString(),
  };
}

function cityStationSnapshotDoc(station, ranking, settings, city) {
  const canonicalStation = cityStationForTankprofiPersistence(station, city);
  const addressId = normalizedAddressFromStation(canonicalStation).addressId;
  const withDeltas = withPriceDeltas(station, ranking, settings);
  const {
    address,
    street,
    houseNumber,
    postCode,
    place,
    ...withoutAddressFields
  } = withDeltas;

  return {
    ...withoutAddressFields,
    addressId,
  };
}

async function getCurrentCitySnapshot() {
  const snapshot = await db.collection('fuel_city_snapshots')
    .where('isCurrent', '==', true)
    .limit(1)
    .get();

  return snapshot.docs[0] || null;
}

async function getLatestUsableCitySnapshot() {
  const [current, latest] = await Promise.all([
    getCurrentCitySnapshot(),
    db.collection('fuel_city_snapshots')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()
      .catch(() => ({ docs: [] })),
  ]);
  const latestUsable = latest.docs.find((doc) => {
    const data = doc.data();
    return ['completed', 'partial'].includes(String(data.status || ''))
      && Number(data.stationUniqueCount || 0) > 0;
  }) || null;
  if (!current) return latestUsable;
  if (!latestUsable) return current;
  const currentCompleted = current.data()?.completedAt?.toMillis?.() || 0;
  const latestCompleted = latestUsable.data()?.completedAt?.toMillis?.() || 0;
  return latestCompleted > currentCompleted ? latestUsable : current;
}

async function getCityUpdateState() {
  const [runningSnapshot, latestRequest] = await Promise.all([
    db.collection('fuel_city_snapshots')
      .where('status', '==', 'running')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get()
      .catch(() => ({ docs: [] })),
    db.collection('fuel_city_update_requests')
      .orderBy('requestedAt', 'desc')
      .limit(1)
      .get()
      .catch(() => ({ docs: [] })),
  ]);
  const snapshotDoc = runningSnapshot.docs[0] || null;
  const requestDoc = latestRequest.docs[0] || null;
  const snapshotData = snapshotDoc?.data?.() || null;
  const requestData = requestDoc?.data?.() || null;
  const snapshotStartedAt = snapshotData?.createdAt || requestData?.startedAt || requestData?.requestedAt;
  const snapshotStartedMs = snapshotStartedAt?.toMillis?.() || Date.parse(isoFromTimestamp(snapshotStartedAt) || '');
  const requestTerminal = ['completed', 'partial', 'skipped', 'failed'].includes(String(requestData?.status || ''));
  const staleRunningSnapshot = snapshotData?.status === 'running'
    && Number.isFinite(snapshotStartedMs)
    && Date.now() - snapshotStartedMs > lockTtlMs
    && requestTerminal;
  const isRunning = snapshotData?.status === 'running' && !staleRunningSnapshot;

  return {
    running: isRunning,
    snapshotId: snapshotData?.snapshotId || snapshotDoc?.id || null,
    snapshotStatus: staleRunningSnapshot ? 'stale-running' : snapshotData?.status || null,
    cityCount: Number(snapshotData?.cityCount || 0),
    citiesProcessed: Number(snapshotData?.citiesProcessed || 0),
    stationUniqueCount: Number(snapshotData?.stationUniqueCount || 0),
    errorCount: Number(snapshotData?.errorCount || 0),
    currentStep: snapshotData?.currentStep || requestData?.currentStep || null,
    currentDetail: snapshotData?.currentDetail || requestData?.currentDetail || null,
    currentCity: snapshotData?.currentCity || requestData?.currentCity || null,
    currentCityIndex: Number(snapshotData?.currentCityIndex || requestData?.currentCityIndex || 0),
    currentPoint: snapshotData?.currentPoint || requestData?.currentPoint || null,
    currentPointIndex: Number(snapshotData?.currentPointIndex || requestData?.currentPointIndex || 0),
    currentPointCount: Number(snapshotData?.currentPointCount || requestData?.currentPointCount || 0),
    progressUpdatedAt: isoFromTimestamp(snapshotData?.progressUpdatedAt || requestData?.progressUpdatedAt),
    startedAt: isoFromTimestamp(snapshotStartedAt),
    requestId: requestDoc?.id || null,
    requestStatus: requestData?.status || null,
    requestCompletedAt: isoFromTimestamp(requestData?.completedAt),
    requestError: requestData?.errorMessage || null,
  };
}

async function acquireCityUpdateLock(force) {
  if (!force) {
    const current = await getCurrentCitySnapshot();
    const validUntil = current?.data()?.validUntil;
    if (validUntil?.toMillis?.() > Date.now()) {
      return {
        acquired: false,
        reason: 'Aktueller Snapshot ist jünger als 60 Minuten.',
        snapshotId: current.id,
        validUntil: isoFromTimestamp(validUntil),
      };
    }
  }

  const lockRef = db.collection('fuel_city_update_lock').doc('city-averages');
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(Date.now() + lockTtlMs);

  return db.runTransaction(async (transaction) => {
    const lockSnapshot = await transaction.get(lockRef);
    const lock = lockSnapshot.exists ? lockSnapshot.data() : null;
    const lockActive = lock
      && ['locked', 'running'].includes(lock.status)
      && lock.expiresAt?.toMillis?.() > Date.now();

    if (lockActive) {
      return { acquired: false, reason: 'Aktualisierung läuft bereits.' };
    }

    transaction.set(lockRef, {
      lockId: 'city-averages',
      lockedAt: now,
      lockedBy: 'city-average-update',
      expiresAt,
      status: 'running',
    });

    return { acquired: true, lockRef };
  });
}

async function releaseCityUpdateLock(status = 'released') {
  await db.collection('fuel_city_update_lock').doc('city-averages').set({
    status,
    releasedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function updateCityImportProgress(snapshotRef, requestRef, patch) {
  const progress = {
    ...patch,
    progressUpdatedAt: FieldValue.serverTimestamp(),
  };
  await snapshotRef.set(progress, { merge: true });
  if (requestRef) {
    await requestRef.set({
      ...progress,
      snapshotId: snapshotRef.id,
      status: 'running',
    }, { merge: true });
  }
}

async function runCityAverageUpdate({ force = false, requestRef = null } = {}) {
  const lock = await acquireCityUpdateLock(force);
  if (!lock.acquired) return { started: false, ...lock };

  const snapshotRef = db.collection('fuel_city_snapshots').doc();
  const snapshotId = snapshotRef.id;
  const startedAt = Timestamp.now();

  await snapshotRef.set({
    snapshotId,
    createdAt: startedAt,
    completedAt: null,
    status: 'running',
    scope: 'german_major_cities',
    radiusKm: 25,
    maxStationsPerQuery: 100,
    cityCount: 0,
    citiesProcessed: 0,
    stationRawCount: 0,
    stationUniqueCount: 0,
    errorCount: 0,
    currentStep: 'Vorbereitung',
    currentDetail: 'Staedtekonfiguration wird geladen',
    currentCity: null,
    currentPoint: null,
    isCurrent: false,
    validUntil: null,
  });

  try {
    await updateCityImportProgress(snapshotRef, requestRef, {
      currentStep: 'Konfiguration',
      currentDetail: 'Staedte und Importregeln werden geladen',
    });
    const cities = await loadCityConfig();
    const settings = await loadCitySettings();
    let stationRawCount = 0;
    let stationUniqueCount = 0;
    let errorCount = 0;
    const tankprofiPersistenceStats = {
      stationsCreated: 0,
      stationsUpdated: 0,
      addressesCreated: 0,
      errors: [],
    };
    const rankingDocs = [];

    let cityRequestCount = 0;
    for (const [cityIndex, city] of cities.entries()) {
      const stationMap = new Map();
      await updateCityImportProgress(snapshotRef, requestRef, {
        cityCount: cities.length,
        currentStep: 'Livepreise laden',
        currentCity: city.cityName,
        currentCityIndex: cityIndex + 1,
        currentPoint: null,
        currentDetail: `${city.cityName}: ${city.searchPoints.length} Suchpunkte`,
      });
      for (const [pointIndex, point] of city.searchPoints.entries()) {
        try {
          if (cityRequestCount > 0) await sleep(cityRequestDelayMs);
          cityRequestCount += 1;
          await updateCityImportProgress(snapshotRef, requestRef, {
            currentStep: 'Livepreise laden',
            currentCity: city.cityName,
            currentCityIndex: cityIndex + 1,
            currentPoint: point.label || point.id,
            currentPointIndex: pointIndex + 1,
            currentPointCount: city.searchPoints.length,
            currentDetail: `${city.cityName}: Suchpunkt ${pointIndex + 1}/${city.searchPoints.length} (${point.label || point.id})`,
          });
          const stations = await fetchCityStations(city, point);
          stationRawCount += stations.length;
          stations.forEach((station) => mergeStation(stationMap, station, point.id));
        } catch (error) {
          errorCount += 1;
          console.warn(error.message);
        }
      }

      const uniqueStations = [...stationMap.values()]
        .filter((station) => station.stationId && Number.isFinite(station.lat) && Number.isFinite(station.lng));
      stationUniqueCount += uniqueStations.length;

      await updateCityImportProgress(snapshotRef, requestRef, {
        currentStep: 'Tankstellen speichern',
        currentCity: city.cityName,
        currentCityIndex: cityIndex + 1,
        currentPoint: null,
        stationRawCount,
        stationUniqueCount,
        errorCount,
        currentDetail: `${city.cityName}: ${uniqueStations.length} eindeutige Tankstellen werden gespeichert`,
      });
      const cityPersistenceStats = await rememberTankprofiStations(
        uniqueStations.map((station) => cityStationForTankprofiPersistence(station, city)),
        {
          source: 'tankkoenig',
          writePriceHistory: false,
          concurrency: 6,
        },
      );
      tankprofiPersistenceStats.stationsCreated += cityPersistenceStats.stationsCreated;
      tankprofiPersistenceStats.stationsUpdated += cityPersistenceStats.stationsUpdated;
      tankprofiPersistenceStats.addressesCreated += cityPersistenceStats.addressesCreated;
      tankprofiPersistenceStats.errors.push(...cityPersistenceStats.errors);

      const diesel = statsFor(uniqueStations, 'diesel');
      const e5 = statsFor(uniqueStations, 'e5');
      const e10 = statsFor(uniqueStations, 'e10');
      const ranking = {
        snapshotId,
        cityId: city.cityId,
        cityName: city.cityName,
        state: city.state,
        sortOrder: city.sortOrder,
        stationCount: uniqueStations.length,
        validDieselCount: diesel.count,
        validE5Count: e5.count,
        validE10Count: e10.count,
        avgDiesel: diesel.avg,
        avgE5: e5.avg,
        avgE10: e10.avg,
        minDiesel: diesel.min,
        maxDiesel: diesel.max,
        minE5: e5.min,
        maxE5: e5.max,
        minE10: e10.min,
        maxE10: e10.max,
        rangeDiesel: diesel.range,
        rangeE5: e5.range,
        rangeE10: e10.range,
        rankDiesel: null,
        rankE5: null,
        rankE10: null,
        collectedAt: startedAt,
        centerLat: city.centerLat,
        centerLng: city.centerLng,
      };
      rankingDocs.push(ranking);

      const cityStationDocs = uniqueStations.map((station) => ({
          ...cityStationSnapshotDoc(station, ranking, settings, city),
          snapshotId,
          cityId: city.cityId,
          collectedAt: startedAt,
          source: 'tankerkoenig',
      }));

      await writeInChunks(cityStationDocs, (batch, station) => {
        batch.set(
          db.collection('fuel_city_station_prices').doc(cityStationDocId(snapshotId, station.cityId, station.stationId)),
          station,
        );
      });

      await updateCityImportProgress(snapshotRef, requestRef, {
        cityCount: cities.length,
        citiesProcessed: FieldValue.increment(1),
        stationRawCount,
        stationUniqueCount,
        tankprofiStationsCreated: tankprofiPersistenceStats.stationsCreated,
        tankprofiStationsUpdated: tankprofiPersistenceStats.stationsUpdated,
        tankprofiAddressesCreated: tankprofiPersistenceStats.addressesCreated,
        tankprofiPersistErrorCount: tankprofiPersistenceStats.errors.length,
        errorCount,
        currentStep: 'Stadt abgeschlossen',
        currentCity: city.cityName,
        currentCityIndex: cityIndex + 1,
        currentDetail: `${city.cityName}: ${uniqueStations.length} Tankstellen importiert`,
      });
    }

    await updateCityImportProgress(snapshotRef, requestRef, {
      currentStep: 'Staedte sortieren',
      currentDetail: 'Ranglisten fuer Diesel, E5 und E10 werden berechnet',
    });
    cityFuels.forEach((fuel) => rankCities(rankingDocs, fuel));

    await updateCityImportProgress(snapshotRef, requestRef, {
      currentStep: 'Ranglisten speichern',
      currentDetail: `${rankingDocs.length} Staedte-Rankings werden geschrieben`,
    });
    await writeInChunks(rankingDocs, (batch, ranking) => {
      batch.set(
        db.collection('fuel_city_rankings').doc(`${snapshotId}_${ranking.cityId}`),
        ranking,
      );
    });

    const completedAt = Timestamp.now();
    const validUntil = Timestamp.fromMillis(completedAt.toMillis() + snapshotTtlMs);
    if (errorCount) {
      const previous = await db.collection('fuel_city_snapshots')
        .where('isCurrent', '==', true)
        .get();

      const batch = db.batch();
      if (stationUniqueCount > 0) {
        previous.docs.forEach((doc) => batch.set(doc.ref, { isCurrent: false }, { merge: true }));
      }
      batch.set(snapshotRef, {
        completedAt,
        status: 'partial',
        cityCount: cities.length,
        citiesProcessed: cities.length,
        stationRawCount,
        stationUniqueCount,
        tankprofiStationsCreated: tankprofiPersistenceStats.stationsCreated,
        tankprofiStationsUpdated: tankprofiPersistenceStats.stationsUpdated,
        tankprofiAddressesCreated: tankprofiPersistenceStats.addressesCreated,
        tankprofiPersistErrorCount: tankprofiPersistenceStats.errors.length,
        errorCount,
        currentStep: 'Mit Fehlern abgeschlossen',
        currentDetail: `${stationUniqueCount} Tankstellen importiert, ${errorCount} Suchanfragen fehlgeschlagen`,
        currentCity: null,
        currentPoint: null,
        isCurrent: stationUniqueCount > 0,
        validUntil: stationUniqueCount > 0 ? validUntil : null,
      }, { merge: true });
      await batch.commit();
    } else {
      const previous = await db.collection('fuel_city_snapshots')
        .where('isCurrent', '==', true)
        .get();

      const batch = db.batch();
      previous.docs.forEach((doc) => batch.set(doc.ref, { isCurrent: false }, { merge: true }));
      batch.set(snapshotRef, {
        completedAt,
        status: 'completed',
        cityCount: cities.length,
        citiesProcessed: cities.length,
        stationRawCount,
        stationUniqueCount,
        tankprofiStationsCreated: tankprofiPersistenceStats.stationsCreated,
        tankprofiStationsUpdated: tankprofiPersistenceStats.stationsUpdated,
        tankprofiAddressesCreated: tankprofiPersistenceStats.addressesCreated,
        tankprofiPersistErrorCount: tankprofiPersistenceStats.errors.length,
        errorCount,
        currentStep: 'Abgeschlossen',
        currentDetail: `${stationUniqueCount} Tankstellen in ${cities.length} Staedten importiert`,
        currentCity: null,
        currentPoint: null,
        isCurrent: true,
        validUntil,
      }, { merge: true });
      await batch.commit();
    }

    if (errorCount) {
      await releaseCityUpdateLock('released-with-errors');
      return { started: true, snapshotId, status: 'partial', errorCount };
    }

    await releaseCityUpdateLock('released');
    return { started: true, snapshotId, status: 'completed', validUntil: validUntil.toDate().toISOString() };
  } catch (error) {
    await snapshotRef.set({
      status: 'failed',
      completedAt: FieldValue.serverTimestamp(),
      isCurrent: false,
      errorMessage: error.message || 'Update failed.',
      currentStep: 'Fehler',
      currentDetail: error.message || 'Update failed.',
    }, { merge: true });
    await releaseCityUpdateLock('failed');
    throw error;
  }
}

async function handleCitySnapshot(req, res) {
  const [current, update] = await Promise.all([
    getLatestUsableCitySnapshot(),
    getCityUpdateState(),
  ]);
  if (!current) return sendJson(res, { snapshot: null, rankings: [], stale: true, update });

  const snapshotData = current.data();
  const rankingsSnapshot = await db.collection('fuel_city_rankings')
    .where('snapshotId', '==', current.id)
    .get();
  const rankings = rankingsSnapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        ...data,
        collectedAt: isoFromTimestamp(data.collectedAt),
      };
    })
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || String(a.cityName).localeCompare(String(b.cityName), 'de'));

  return sendJson(res, {
    snapshot: {
      snapshotId: current.id,
      createdAt: isoFromTimestamp(snapshotData.createdAt),
      completedAt: isoFromTimestamp(snapshotData.completedAt),
      status: snapshotData.status,
      scope: snapshotData.scope,
      radiusKm: snapshotData.radiusKm,
      maxStationsPerQuery: snapshotData.maxStationsPerQuery,
      cityCount: snapshotData.cityCount,
      citiesProcessed: snapshotData.citiesProcessed,
      stationRawCount: snapshotData.stationRawCount,
      stationUniqueCount: snapshotData.stationUniqueCount,
      errorCount: snapshotData.errorCount,
      validUntil: isoFromTimestamp(snapshotData.validUntil),
      isCurrent: snapshotData.isCurrent === true,
    },
    rankings,
    stale: snapshotData.validUntil?.toMillis
      ? snapshotData.validUntil.toMillis() <= Date.now()
      : Date.now() - (snapshotData.completedAt?.toMillis?.() || 0) >= snapshotTtlMs,
    update,
  });
}

async function handleCityStations(req, res) {
  const snapshotId = String(req.query.snapshotId || '').trim();
  const cityId = String(req.query.cityId || '').trim();
  if (!snapshotId || !cityId) return sendJson(res, { error: 'Missing snapshotId or cityId.' }, 422);

  const stationsSnapshot = await db.collection('fuel_city_station_prices')
    .where('snapshotId', '==', snapshotId)
    .where('cityId', '==', cityId)
    .get();

  const stations = await hydrateCanonicalAddresses(stationsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      collectedAt: isoFromTimestamp(data.collectedAt),
    };
  }));

  stations.sort((a, b) => Number(a.distanceKm || 0) - Number(b.distanceKm || 0));
  return sendJson(res, { snapshotId, cityId, stations });
}

async function handleCityUpdate(req, res) {
  if (!['POST', 'GET'].includes(req.method)) return sendJson(res, { error: 'Method not allowed.' }, 405);
  const force = String(req.query.force || '') === '1' || String(req.body?.force || '') === 'true';
  const request = await db.collection('fuel_city_update_requests').add({
    force,
    status: 'queued',
    requestedAt: FieldValue.serverTimestamp(),
    requestedBy: 'admin-endpoint',
  });
  return sendJson(res, {
    started: true,
    queued: true,
    requestId: request.id,
    status: 'queued',
  }, 202);
}

async function handleScanInit(req, res) {
  if (!['POST', 'GET'].includes(req.method)) return sendJson(res, { error: 'Method not allowed.' }, 405);
  const country = String(req.query.country || req.body?.country || 'DE').trim().toUpperCase();
  const source = String(req.query.source || req.body?.source || 'tankkoenig').trim().toLowerCase();
  const mode = String(req.query.mode || req.body?.mode || 'seed_de_grid').trim();
  const limit = Math.round(numberParam(req.query.limit || req.body?.limit, 0, 0, 10000));
  const result = await createTankprofiScanRun({ country, source, mode, limit });
  return sendJson(res, result, 202);
}

async function handleScanProcess(req, res) {
  if (!['POST', 'GET'].includes(req.method)) return sendJson(res, { error: 'Method not allowed.' }, 405);
  const country = String(req.query.country || req.body?.country || 'DE').trim().toUpperCase();
  const source = String(req.query.source || req.body?.source || 'tankkoenig').trim().toLowerCase();
  const limit = Math.round(numberParam(req.query.limit || req.body?.limit, 5, 1, 25));
  const retryErrors = String(req.query.retryErrors || req.body?.retryErrors || '') === '1'
    || String(req.query.retryErrors || req.body?.retryErrors || '').toLowerCase() === 'true';
  const result = await processTankprofiScanCells({ country, source, limit, retryErrors });
  return sendJson(res, result);
}

async function handleAutobahnImport(req, res) {
  if (!['POST', 'GET'].includes(req.method)) return sendJson(res, { error: 'Method not allowed.' }, 405);
  const limit = Math.round(numberParam(req.query.limit || req.body?.limit, 0, 0, 500));
  const highway = String(req.query.highway || req.body?.highway || '').trim().toUpperCase().replace(/\s+/g, '');
  const offset = Math.round(numberParam(req.query.offset || req.body?.offset, 0, 0, 10000));
  const result = await importRaststaettenDirectory({ limit, highway, offset });
  return sendJson(res, result);
}

async function latestStoredPrice(stationId, fuel) {
  if (!stationId) return null;
  const doc = await db.collection('tankprofi_stations').doc(`tankkoenig_${stationId}`).get();
  const data = doc.data();
  const current = data?.currentPrices?.[fuel];
  if (!current) return null;
  return {
    price: roundPrice(current.price),
    recordedAt: current.reportedAt?.toDate?.().toISOString?.() || data.currentPricesUpdatedAt?.toDate?.().toISOString?.() || null,
  };
}

async function fetchAutobahnPriceMatch(autobahnStation) {
  const lat = Number(autobahnStation.lat);
  const lng = Number(autobahnStation.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const upstream = new URL('https://creativecommons.tankerkoenig.de/json/list.php');
  upstream.search = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    rad: '3',
    sort: 'dist',
    type: 'all',
    apikey: tankerkoenigKey(),
  }).toString();

  const { response, data } = await fetchJsonWithTimeout(upstream, { headers: { accept: 'application/json' } }, 6500);
  if (!response.ok || data.ok !== true) return null;

  const fuelBrands = [
    autobahnStation.primaryFuelBrand,
    ...(Array.isArray(autobahnStation.fuelBrands) ? autobahnStation.fuelBrands : []),
    ...fuelBrandsFromText(autobahnStation.name, autobahnStation.operator, autobahnStation.brand),
  ].filter(Boolean).map((brand) => normalizeText(brand));
  const candidateTokens = stationNameTokens([
    autobahnStation.name,
    autobahnStation.operator,
    autobahnStation.brand,
  ].filter(Boolean).join(' '));

  let best = null;
  (data.stations || []).forEach((station) => {
    const distanceKm = Number(station.dist);
    if (!Number.isFinite(distanceKm) || distanceKm > 3) return;
    const brand = normalizeText(station.brand || station.name || '');
    const stationText = normalizeText([station.name, station.brand].filter(Boolean).join(' '));
    const brandHit = Boolean(fuelBrands.length && fuelBrands.some((candidate) => brand.includes(candidate) || stationText.includes(candidate)));
    const stationTokens = stationNameTokens(stationText);
    const nameHit = Boolean(candidateTokens.length && candidateTokens.some((token) => stationTokens.includes(token)));
    const score = distanceKm + (brandHit ? -0.25 : 0.65) + (nameHit ? -0.12 : 0);
    if (!best || score < best.score) best = { ...station, score };
  });

  if (!best?.id) return null;
  const bestBrand = normalizeText(best.brand || best.name || '');
  const bestText = normalizeText([best.name, best.brand].filter(Boolean).join(' '));
  const bestBrandHit = Boolean(fuelBrands.length && fuelBrands.some((candidate) => bestBrand.includes(candidate) || bestText.includes(candidate)));
  const bestNameHit = stationNamesSimilar(autobahnStation.name, best.name);
  const bestDistanceKm = Number(best.dist);
  if (!bestBrandHit && !bestNameHit && bestDistanceKm > 0.18) return null;

  const archiveRows = cityFuels
    .map((fuel) => ({
      ...normalizeStation({ ...best, price: best[fuel] }, fuel),
      fuel_type: fuel,
      price: validPrice(best[fuel]) ? roundPrice(best[fuel]) : null,
    }))
    .filter((station) => station.price !== null);
  if (archiveRows.length) await rememberStations(archiveRows);

  const recordedAt = new Date().toISOString();
  return {
    tankerkoenigId: String(best.id),
    priceMatch: {
      stationId: String(best.id),
      name: String(best.name || ''),
      brand: String(best.brand || ''),
      distanceKm: roundPrice(best.dist),
      brandHit: bestBrandHit,
      nameHit: bestNameHit,
    },
    prices: {
      diesel: validPrice(best.diesel) ? { price: roundPrice(best.diesel), recordedAt } : null,
      e5: validPrice(best.e5) ? { price: roundPrice(best.e5), recordedAt } : null,
      e10: validPrice(best.e10) ? { price: roundPrice(best.e10), recordedAt } : null,
    },
  };
}

function tankerkoenigStationForPersistence(station) {
  return {
    tankerkoenig_id: String(station.id || ''),
    source: 'tankkoenig',
    country: 'DE',
    name: station.name || '',
    brand: station.brand || '',
    street: station.street || '',
    house_number: station.houseNumber || '',
    postcode: station.postCode || '',
    city: station.place || '',
    lat: Number(station.lat),
    lng: Number(station.lng),
    distance: Number(station.dist || 0),
    is_open: station.isOpen === true ? true : station.isOpen === false ? false : null,
    diesel: station.diesel,
    e5: station.e5,
    e10: station.e10,
    last_update: new Date().toISOString(),
  };
}

async function fetchTankerkoenigStationsAround(point, radiusKm = autobahnPriceRefreshRadiusKm) {
  const upstream = new URL('https://creativecommons.tankerkoenig.de/json/list.php');
  upstream.search = new URLSearchParams({
    lat: String(point.lat),
    lng: String(point.lng),
    rad: String(radiusKm),
    sort: 'dist',
    type: 'all',
    apikey: tankerkoenigKey(),
  }).toString();

  const { response, data } = await fetchJsonWithTimeout(upstream, {
    headers: {
      accept: 'application/json',
      'user-agent': 'Tankprofi/1.0 (autobahn-price-refresh)',
    },
  }, 9000);
  if (!response.ok || data.ok !== true) {
    throw new Error(data.message || `Tankerkoenig request failed with status ${response.status}.`);
  }
  return data.stations || [];
}

function pointRefreshAgeMs(point) {
  const last = Date.parse(point.lastAutobahnPriceRefreshAt || '');
  if (!Number.isFinite(last) || last <= 0) return Number.POSITIVE_INFINITY;
  return Date.now() - last;
}

function pointRefreshSortValue(point) {
  const last = Date.parse(point.lastAutobahnPriceRefreshAt || '');
  return Number.isFinite(last) && last > 0 ? last : 0;
}

function routePointRefreshRef(point) {
  if (!point?.sourceCollection || !point.sourceDocId) return null;
  return db.collection(point.sourceCollection).doc(point.sourceDocId);
}

function buildAutobahnRefreshClusters(points, { radiusKm = autobahnPriceRefreshRadiusKm, maxQueries = autobahnPriceRefreshMaxQueries } = {}) {
  const clusters = [];
  points.forEach((point) => {
    const covered = clusters.some((cluster) => distanceKmBetween(point.lat, point.lng, cluster.lat, cluster.lng) <= radiusKm * 0.65);
    if (covered || clusters.length >= maxQueries) return;
    clusters.push({
      id: `cluster-${clusters.length + 1}`,
      lat: point.lat,
      lng: point.lng,
      routeId: point.routeId || point.autobahn || '',
      sourcePointId: point.id,
      points: [],
    });
  });

  clusters.forEach((cluster) => {
    cluster.points = points.filter((point) => distanceKmBetween(point.lat, point.lng, cluster.lat, cluster.lng) <= radiusKm);
  });
  return clusters;
}

async function markAutobahnPointsRefreshed(points, cluster, stationCount, radiusKm = autobahnPriceRefreshRadiusKm, now = FieldValue.serverTimestamp()) {
  const refs = new Map();
  points.forEach((point) => {
    const ref = routePointRefreshRef(point);
    if (ref) refs.set(ref.path, ref);
  });
  const items = [...refs.values()];
  await writeInChunks(items, (batch, ref) => {
    batch.set(ref, {
      lastAutobahnPriceRefreshAt: now,
      lastAutobahnPriceRefreshRadiusKm: radiusKm,
      lastAutobahnPriceRefreshStationCount: stationCount,
      lastAutobahnPriceRefreshCluster: {
        lat: cluster.lat,
        lng: cluster.lng,
        routeId: cluster.routeId || null,
      },
      updatedAt: now,
    }, { merge: true });
  });
}

async function runAutobahnPriceRefresh({
  maxQueries = autobahnPriceRefreshMaxQueries,
  radiusKm = autobahnPriceRefreshRadiusKm,
  force = false,
  route = 'ALL',
} = {}) {
  const normalizedRoute = String(route || 'ALL').trim().toUpperCase().replace(/\s+/g, '');
  const [prepared, unified] = await Promise.all([
    loadRouteTankpointsFromCollection('autobahnTankpunkte', normalizedRoute).catch(() => []),
    loadRouteTankpointsFromCollection('tankprofi_stations', normalizedRoute).catch(() => []),
  ]);
  const allPoints = mergeDirectoryStations([...unified, ...prepared])
    .filter((point) => point.active && Number.isFinite(point.lat) && Number.isFinite(point.lng));
  const targetDueCount = Math.max(20, Math.ceil(allPoints.length / Math.max(1, Math.floor(autobahnPriceRefreshTargetMs / autobahnPriceRefreshScheduleMs))));
  const duePoints = allPoints
    .filter((point) => force || pointRefreshAgeMs(point) >= autobahnPriceRefreshTargetMs)
    .sort((a, b) => pointRefreshSortValue(a) - pointRefreshSortValue(b) || String(a.name).localeCompare(String(b.name), 'de'))
    .slice(0, targetDueCount * 2);
  const clusters = buildAutobahnRefreshClusters(duePoints, { radiusKm, maxQueries });
  const discovered = new Map();
  const clusterResults = [];

  for (const [index, cluster] of clusters.entries()) {
    if (index > 0) await sleep(autobahnPriceRefreshDelayMs);
    try {
      const stations = await fetchTankerkoenigStationsAround(cluster, radiusKm);
      stations.forEach((station) => {
        if (station.id) discovered.set(String(station.id), station);
      });
      await markAutobahnPointsRefreshed(cluster.points, cluster, stations.length, radiusKm);
      clusterResults.push({
        ...cluster,
        pointCount: cluster.points.length,
        stationCount: stations.length,
        status: 'completed',
      });
    } catch (error) {
      clusterResults.push({
        ...cluster,
        pointCount: cluster.points.length,
        stationCount: 0,
        status: 'failed',
        error: error.message,
      });
    }
  }

  const stations = [...discovered.values()].map(tankerkoenigStationForPersistence)
    .filter((station) => station.tankerkoenig_id && Number.isFinite(station.lat) && Number.isFinite(station.lng));
  const persistStats = stations.length
    ? await rememberTankprofiStations(stations, { source: 'tankkoenig', writePriceHistory: false, concurrency: 6 })
    : { stationsCreated: 0, stationsUpdated: 0, addressesCreated: 0, errors: [] };

  const refreshedPointIds = new Set(clusterResults
    .filter((cluster) => cluster.status === 'completed')
    .flatMap((cluster) => cluster.points.map((point) => `${point.sourceCollection}:${point.sourceDocId}`)));

  await db.collection('tankprofi_jobs').doc('autobahn-price-refresh').set({
    jobId: 'autobahn-price-refresh',
    updatedAt: FieldValue.serverTimestamp(),
    route: normalizedRoute,
    force,
    radiusKm,
    maxQueries,
    totalTankpoints: allPoints.length,
    dueTankpoints: duePoints.length,
    refreshedTankpoints: refreshedPointIds.size,
    clusterCount: clusters.length,
    discoveredStations: stations.length,
    stationsCreated: persistStats.stationsCreated,
    stationsUpdated: persistStats.stationsUpdated,
    addressesCreated: persistStats.addressesCreated,
    errorCount: clusterResults.filter((cluster) => cluster.status === 'failed').length + persistStats.errors.length,
    clusters: clusterResults.map((cluster) => ({
      id: cluster.id,
      routeId: cluster.routeId,
      lat: cluster.lat,
      lng: cluster.lng,
      pointCount: cluster.pointCount,
      stationCount: cluster.stationCount,
      status: cluster.status,
      error: cluster.error || null,
    })),
  }, { merge: true });

  return {
    status: 'completed',
    route: normalizedRoute,
    radiusKm,
    targetWindowMinutes: Math.round(autobahnPriceRefreshTargetMs / 60000),
    totalTankpoints: allPoints.length,
    dueTankpoints: duePoints.length,
    refreshedTankpoints: refreshedPointIds.size,
    clusterCount: clusters.length,
    discoveredStations: stations.length,
    stationsCreated: persistStats.stationsCreated,
    stationsUpdated: persistStats.stationsUpdated,
    addressesCreated: persistStats.addressesCreated,
    errors: [
      ...clusterResults.filter((cluster) => cluster.status === 'failed').map((cluster) => cluster.error),
      ...persistStats.errors,
    ],
  };
}

function findStoredStationMatch(autobahnStation, storedStations) {
  const fuelBrands = [
    autobahnStation.primaryFuelBrand,
    ...(Array.isArray(autobahnStation.fuelBrands) ? autobahnStation.fuelBrands : []),
  ].filter(Boolean).map((brand) => String(brand).toLowerCase());

  let best = null;
  storedStations.forEach((stored) => {
    const distanceKm = distanceKmBetween(autobahnStation.lat, autobahnStation.lng, stored.lat, stored.lng);
    if (distanceKm > 1.2) return;
    const storedBrand = String(stored.brand || '').toLowerCase().trim();
    const brandHit = Boolean(storedBrand) && fuelBrands.length
      && fuelBrands.some((brand) => storedBrand.includes(brand) || brand.includes(storedBrand));
    const nameHit = stationNamesSimilar(autobahnStation.name, stored.name);
    const score = distanceKm + (brandHit ? -0.12 : 0.45) + (nameHit ? -0.08 : 0);
    if (!best || score < best.score) {
      best = {
        ...stored,
        score,
        brandHit: Boolean(brandHit),
        nameHit: Boolean(nameHit),
        matchDistanceKm: roundPrice(distanceKm),
      };
    }
  });
  return best;
}

function autobahnStationPriceStandMs(station) {
  const timestamps = ['diesel', 'e5', 'e10']
    .map((fuel) => station.prices?.[fuel]?.recordedAt)
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);
  return timestamps.length ? Math.max(...timestamps) : 0;
}

function shouldRefreshAutobahnPrices(station) {
  const lastPriceMs = autobahnStationPriceStandMs(station);
  if (!lastPriceMs) return true;
  return Date.now() - lastPriceMs >= 30 * 60 * 1000;
}

async function enrichAutobahnStationsWithPrices(stations, refresh = false) {
  const storedSnapshot = await db.collection('tankprofi_stations')
    .where('source', '==', 'tankkoenig')
    .limit(5000)
    .get();
  const storedStations = storedSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      stationId: String(data.externalStationId || doc.id.replace(/^tankkoenig_/, '')),
      name: data.name || '',
      brand: data.brand || '',
      lat: Number(data.latitude),
      lng: Number(data.longitude),
    };
  }).filter((station) => Number.isFinite(station.lat) && Number.isFinite(station.lng));

  return Promise.all(stations.map(async (station) => {
    if (refresh && shouldRefreshAutobahnPrices(station)) {
      const liveMatch = await fetchAutobahnPriceMatch(station).catch(() => null);
      if (liveMatch) {
        return {
          ...station,
          ...liveMatch,
          priceSource: 'tankerkoenig_cached',
        };
      }
    }

    const match = findStoredStationMatch(station, storedStations);
    if (!match) {
      return {
        ...station,
        priceSource: 'stored_db',
        priceMatch: null,
        prices: null,
      };
    }

    const [diesel, e5, e10] = await Promise.all([
      latestStoredPrice(match.stationId, 'diesel'),
      latestStoredPrice(match.stationId, 'e5'),
      latestStoredPrice(match.stationId, 'e10'),
    ]);

    return {
      ...station,
      tankerkoenigId: match.stationId,
      priceSource: 'stored_db',
      priceMatch: {
        stationId: match.stationId,
        name: match.name,
        brand: match.brand,
        distanceKm: match.matchDistanceKm,
      },
      prices: { diesel, e5, e10 },
    };
  }));
}

async function loadStoredTankerkoenigStationsForMatch() {
  const snapshot = await db.collection('tankprofi_stations')
    .where('source', '==', 'tankkoenig')
    .limit(5000)
    .get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      stationId: String(data.externalStationId || doc.id.replace(/^tankkoenig_/, '')),
      name: data.name || '',
      brand: data.brand || '',
      lat: Number(data.latitude),
      lng: Number(data.longitude),
    };
  }).filter((station) => station.stationId && Number.isFinite(station.lat) && Number.isFinite(station.lng));
}

function serviceStationMatchCandidateFromDoc(doc) {
  const data = doc.data();
  const stationTypes = Array.isArray(data.standortTyp) ? data.standortTyp : [];
  const priceStationId = String(data.priceStationId || data.tankerkoenigId || '').trim();
  if (priceStationId) return null;
  if (data.source === 'tankkoenig') return null;
  if (!stationTypes.some((type) => ['RaststÃ¤tte', 'Autohof', 'Truck Stop', 'Ladepark', 'Service Area'].includes(type))) return null;
  const lat = Number(data.latitude);
  const lng = Number(data.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    doc,
    stationId: data.stationId || doc.id,
    name: data.name || '',
    primaryFuelBrand: data.primaryFuelBrand || data.brand || fuelBrandsFromText(data.name, data.operator)[0] || null,
    fuelBrands: uniq([
      ...(Array.isArray(data.fuelBrands) ? data.fuelBrands : []),
      ...(data.brand ? [data.brand] : []),
      ...fuelBrandsFromText(data.name, data.operator, data.primaryFuelBrand, data.brand),
    ]),
    lat,
    lng,
  };
}

async function collectTankIdMatchCandidates(limit) {
  const byId = new Map();
  const addSnapshot = async (query) => {
    const snapshot = await query.limit(limit).get();
    snapshot.docs.forEach((doc) => {
      const candidate = serviceStationMatchCandidateFromDoc(doc);
      if (candidate) byId.set(doc.id, candidate);
    });
  };

  await Promise.all([
    addSnapshot(db.collection('tankprofi_stations').where('standortTyp', 'array-contains', 'RaststÃ¤tte')),
    addSnapshot(db.collection('tankprofi_stations').where('standortTyp', 'array-contains', 'Autohof')),
    addSnapshot(db.collection('tankprofi_stations').where('standortTyp', 'array-contains', 'Truck Stop')),
    addSnapshot(db.collection('tankprofi_stations').where('standortTyp', 'array-contains', 'Ladepark')),
  ]);

  return [...byId.values()].slice(0, limit);
}

async function matchStoredTankIds({ limit = 300, dryRun = false, maxDistanceKm = 0.25, live = false } = {}) {
  const safeLimit = Math.round(numberParam(limit, 300, 1, 1000));
  const safeMaxDistanceKm = numberParam(maxDistanceKm, 0.25, 0.02, 1.2);
  const [storedStations, candidates] = await Promise.all([
    loadStoredTankerkoenigStationsForMatch(),
    collectTankIdMatchCandidates(safeLimit),
  ]);
  const matches = [];
  const skipped = [];
  let liveMatched = 0;
  let storedMatched = 0;

  for (const candidate of candidates) {
    let match = findStoredStationMatch(candidate, storedStations);
    let matchSource = 'stored_tankprofi_stations';
    if (!match) {
      if (live) {
        const liveMatch = await fetchAutobahnPriceMatch(candidate).catch(() => null);
        if (liveMatch?.tankerkoenigId) {
          match = {
            stationId: liveMatch.tankerkoenigId,
            name: liveMatch.priceMatch?.name || '',
            brand: liveMatch.priceMatch?.brand || '',
            matchDistanceKm: liveMatch.priceMatch?.distanceKm || 0,
            brandHit: liveMatch.priceMatch?.brandHit === true,
            nameHit: liveMatch.priceMatch?.nameHit === true,
          };
          matchSource = 'tankerkoenig_live_match';
        }
      }
      if (!match) {
        skipped.push({ stationId: candidate.stationId, name: candidate.name, reason: 'no_match' });
        continue;
      }
    }
    if (Number(match.matchDistanceKm) > safeMaxDistanceKm) {
      skipped.push({
        stationId: candidate.stationId,
        name: candidate.name,
        reason: 'distance_too_high',
        priceStationId: match.stationId,
        matchName: match.name,
        distanceKm: match.matchDistanceKm,
      });
      continue;
    }
    if (Number(match.matchDistanceKm) > 0.35 && !match.brandHit && !match.nameHit) {
      skipped.push({
        stationId: candidate.stationId,
        name: candidate.name,
        reason: 'needs_review_no_brand_signal',
        priceStationId: match.stationId,
        matchName: match.name,
        matchBrand: match.brand,
        distanceKm: match.matchDistanceKm,
      });
      continue;
    }
    if (matchSource === 'tankerkoenig_live_match') liveMatched += 1;
    else storedMatched += 1;
    matches.push({ candidate, match, matchSource });
  }

  if (!dryRun && matches.length) {
    const now = FieldValue.serverTimestamp();
    for (let index = 0; index < matches.length; index += 400) {
      const batch = db.batch();
      matches.slice(index, index + 400).forEach(({ candidate, match, matchSource }) => {
        batch.set(candidate.doc.ref, {
          priceStationId: match.stationId,
          tankerkoenigId: match.stationId,
          priceMatch: {
            stationId: match.stationId,
            name: match.name,
            brand: match.brand,
            distanceKm: match.matchDistanceKm,
            source: matchSource,
            matchedAt: now,
          },
          tankstelleVorhanden: true,
          tankstellenReferenzen: FieldValue.arrayUnion({
            source: 'tankkoenig',
            stationId: match.stationId,
            distanceKm: match.matchDistanceKm,
          }),
          updatedAt: now,
        }, { merge: true });
      });
      await batch.commit();
    }
  }

  return {
    status: 'completed',
    dryRun,
    live,
    maxDistanceKm: safeMaxDistanceKm,
    scanned: candidates.length,
    storedTankStations: storedStations.length,
    matched: matches.length,
    storedMatched,
    liveMatched,
    updated: dryRun ? 0 : matches.length,
    skipped: skipped.length,
    sampleMatches: matches.slice(0, 20).map(({ candidate, match, matchSource }) => ({
      stationId: candidate.stationId,
      name: candidate.name,
      priceStationId: match.stationId,
      matchName: match.name,
      matchBrand: match.brand,
      distanceKm: match.matchDistanceKm,
      matchSource,
    })),
    sampleSkipped: skipped.slice(0, 10),
  };
}

async function writeVerifiedTankIdMatches(pairs = [], { dryRun = false } = {}) {
  const safePairs = Array.isArray(pairs) ? pairs.slice(0, 200) : [];
  const now = FieldValue.serverTimestamp();
  const results = [];
  let updated = 0;

  for (let index = 0; index < safePairs.length; index += 400) {
    const batch = db.batch();
    for (const item of safePairs.slice(index, index + 400)) {
      const stationId = String(item.stationId || '').trim();
      const priceStationId = String(item.priceStationId || item.tankerkoenigId || '').trim();
      if (!stationId || !priceStationId) {
        results.push({ stationId, priceStationId, status: 'skipped_missing_id' });
        continue;
      }
      const ref = db.collection('tankprofi_stations').doc(stationId);
      const snap = await ref.get();
      if (!snap.exists) {
        results.push({ stationId, priceStationId, status: 'missing_station_doc' });
        continue;
      }
      if (!dryRun) {
        batch.set(ref, {
          priceStationId,
          tankerkoenigId: priceStationId,
          priceMatch: {
            stationId: priceStationId,
            name: String(item.matchName || item.name || ''),
            brand: String(item.matchBrand || item.brand || ''),
            distanceKm: roundPrice(item.distanceKm || 0),
            source: String(item.source || 'verified_manual_match'),
            matchedAt: now,
          },
          tankstelleVorhanden: true,
          tankstellenReferenzen: FieldValue.arrayUnion({
            source: 'tankkoenig',
            stationId: priceStationId,
            distanceKm: roundPrice(item.distanceKm || 0),
          }),
          updatedAt: now,
        }, { merge: true });
      }
      updated += 1;
      results.push({ stationId, priceStationId, status: dryRun ? 'would_update' : 'updated' });
    }
    if (!dryRun && updated) await batch.commit();
  }

  return {
    status: 'completed',
    dryRun,
    scanned: safePairs.length,
    updated: dryRun ? 0 : updated,
    wouldUpdate: dryRun ? updated : 0,
    results,
  };
}

function tankIdCandidateScores(candidate, storedStations, radiusKm) {
  const fuelBrands = [
    candidate.primaryFuelBrand,
    ...(Array.isArray(candidate.fuelBrands) ? candidate.fuelBrands : []),
  ].filter(Boolean).map((brand) => String(brand).toLowerCase());
  const candidateName = String(candidate.name || '').toLowerCase();
  return storedStations
    .map((station) => {
      const distanceKm = distanceKmBetween(candidate.lat, candidate.lng, station.lat, station.lng);
      if (!Number.isFinite(distanceKm) || distanceKm > radiusKm) return null;
      const brand = String(station.brand || station.name || '').toLowerCase();
      const name = String(station.name || '').toLowerCase();
      const brandHit = fuelBrands.length && fuelBrands.some((item) => brand.includes(item) || item.includes(brand));
      const nameHit = candidateName && name && (
        stationNamesSimilar(candidateName, name)
        || candidateName.includes(name)
        || name.includes(candidateName)
      );
      const score = distanceKm + (brandHit ? -0.08 : 0) + (nameHit ? -0.05 : 0);
      return {
        stationId: station.stationId,
        name: station.name,
        brand: station.brand,
        distanceKm: roundPrice(distanceKm),
        brandHit: Boolean(brandHit),
        nameHit: Boolean(nameHit),
        score: Math.round(score * 1000) / 1000,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score || a.distanceKm - b.distanceKm)
    .slice(0, 5);
}

async function reportTankIdCandidates({ limit = 200, radiusKm = 0.8 } = {}) {
  const safeLimit = Math.round(numberParam(limit, 200, 1, 1000));
  const safeRadiusKm = numberParam(radiusKm, 0.8, 0.05, 2);
  const [storedStations, candidates] = await Promise.all([
    loadStoredTankerkoenigStationsForMatch(),
    collectTankIdMatchCandidates(safeLimit),
  ]);
  const items = candidates.map((candidate) => {
    const matches = tankIdCandidateScores(candidate, storedStations, safeRadiusKm);
    const best = matches[0] || null;
    let category = 'no_nearby_candidate';
    if (best) {
      if (best.distanceKm <= 0.25 && (best.brandHit || best.nameHit)) category = 'strong_auto_candidate';
      else if (best.distanceKm <= 0.5 && (best.brandHit || best.nameHit)) category = 'review_good_candidate';
      else if (best.distanceKm <= 0.8) category = 'review_distance_candidate';
    }
    return {
      stationId: candidate.stationId,
      name: candidate.name,
      lat: candidate.lat,
      lng: candidate.lng,
      category,
      candidates: matches,
    };
  });
  const totals = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  return {
    status: 'completed',
    radiusKm: safeRadiusKm,
    scanned: candidates.length,
    storedTankStations: storedStations.length,
    totals,
    items: items.slice(0, safeLimit),
  };
}

function directoryStationFromTankprofiDoc(doc) {
  const data = doc.data();
  const tankerkoenigId = explicitTankerkoenigId(data, doc.id);
  const stationTypes = data.standortTyp || [];
  const directoryType = data.autohofTyp || (stationTypes.includes('Raststätte') ? 'autobahn_raststaette' : 'autohof');
  const prices = {};
  cityFuels.forEach((fuel) => {
    const current = data.currentPrices?.[fuel];
    prices[fuel] = current?.price !== undefined
      ? {
          price: roundPrice(current.price),
          recordedAt: isoFromTimestamp(current.reportedAt || data.currentPricesUpdatedAt),
        }
      : null;
  });
  return {
    stationId: tankerkoenigId || data.stationId || doc.id,
    priceStationId: tankerkoenigId,
    tankerkoenigId,
    source: Array.isArray(data.quelle) ? data.quelle[0] : data.source,
    sourceUrl: data.sourceUrl || null,
    name: data.name || 'Standort',
    type: directoryType,
    operator: data.operator || null,
    brand: data.brand || data.primaryFuelBrand || null,
    primaryFuelBrand: data.primaryFuelBrand || data.brand || null,
    fuelBrands: data.fuelBrands || (data.brand ? [data.brand] : []),
    highway: data.autobahn || null,
    exitRef: data.ausfahrt || null,
    sideLabel: data.sideLabel || directionSideFromName(data.name),
    directionSource: data.directionSource || null,
    directionText: data.directionText || null,
    addressId: data.addressId || null,
    country: data.country || 'DE',
    lat: Number(data.latitude),
    lng: Number(data.longitude),
    hasFuel: data.tankstelleVorhanden === true || stationTypes.includes('Tankstelle'),
    hasTruckDiesel: Boolean(data.hasTruckDiesel || data.lkwParkplaetze),
    hasEvCharging: Boolean(data.eLadesaeulen),
    hgv: Boolean(data.lkwParkplaetze),
    parking: data.pkwParkplaetze || null,
    openingHours: data.openingHours || null,
    phone: data.phone || null,
    website: data.website || null,
    features: data.serviceMerkmale || [],
    prices,
    priceSource: 'tankprofi_stations',
    importedAt: isoFromTimestamp(data.updatedAt || data.lastSeenAt),
  };
}

async function loadUnifiedServiceStation(stationId) {
  const direct = await db.collection('tankprofi_stations').doc(stationId).get();
  if (direct.exists) {
    const stationRecord = directoryStationFromTankprofiDoc(direct);
    if (!stationRecord.tankerkoenigId) return null;
    const [station] = await hydrateCanonicalAddresses([stationRecord]);
    return station;
  }

  const snapshot = await db.collection('tankprofi_stations')
    .where('externalStationId', '==', stationId)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const stationRecord = directoryStationFromTankprofiDoc(snapshot.docs[0]);
  if (!stationRecord.tankerkoenigId) return null;
  const [station] = await hydrateCanonicalAddresses([stationRecord]);
  return station;
}

async function loadUnifiedServiceStations({ highway, hasFuel }) {
  const byId = new Map();
  const addSnapshot = async (query) => {
    const snapshot = await query.limit(1000).get();
    snapshot.docs.forEach((doc) => {
      const station = directoryStationFromTankprofiDoc(doc);
      if (!station.tankerkoenigId) return;
      const types = doc.data().standortTyp || [];
      if (!types.some((type) => ['Autohof', 'Raststätte', 'Truck Stop', 'Ladepark', 'Service Area'].includes(type))) return;
      if (highway && station.highway !== highway) return;
      if (hasFuel && !station.hasFuel) return;
      if (Number.isFinite(station.lat) && Number.isFinite(station.lng)) byId.set(station.stationId, station);
    });
  };

  await Promise.all([
    addSnapshot(db.collection('tankprofi_stations').where('standortTyp', 'array-contains', 'Raststätte')),
    addSnapshot(db.collection('tankprofi_stations').where('standortTyp', 'array-contains', 'Autohof')),
    addSnapshot(db.collection('tankprofi_stations').where('standortTyp', 'array-contains', 'Truck Stop')),
    addSnapshot(db.collection('tankprofi_stations').where('standortTyp', 'array-contains', 'Ladepark')),
  ]);

  return await hydrateCanonicalAddresses([...byId.values()]);
}

async function loadDirectoryStation(collectionName, stationId) {
  const doc = await db.collection(collectionName).doc(stationId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  const tankerkoenigId = explicitTankerkoenigId(data, doc.id);
  if (!tankerkoenigId) return null;
  const [station] = await hydrateCanonicalAddresses([{
    ...data,
    stationId: tankerkoenigId,
    priceStationId: tankerkoenigId,
    tankerkoenigId,
    directorySource: collectionName,
    importedAt: isoFromTimestamp(data.importedAt),
  }]);
  return station;
}

async function loadDirectoryStations(collectionName, { highway, hasFuel }) {
  let query = db.collection(collectionName);
  if (highway) query = query.where('highway', '==', highway);
  if (hasFuel) query = query.where('hasFuel', '==', true);
  const snapshot = await query.limit(500).get();
  return await hydrateCanonicalAddresses(snapshot.docs.map((doc) => {
    const data = doc.data();
    const tankerkoenigId = explicitTankerkoenigId(data, doc.id);
    if (!tankerkoenigId) return null;
    return {
      ...data,
      stationId: tankerkoenigId,
      priceStationId: tankerkoenigId,
      tankerkoenigId,
      directorySource: collectionName,
      importedAt: isoFromTimestamp(data.importedAt),
    };
  }).filter(Boolean));
}

function mergeDirectoryStationRecords(preferred = {}, secondary = {}) {
  return {
    ...secondary,
    ...preferred,
    features: uniq([...(secondary.features || []), ...(preferred.features || [])]),
    serviceMerkmale: uniq([...(secondary.serviceMerkmale || []), ...(preferred.serviceMerkmale || [])]),
    standortTyp: uniq([...(secondary.standortTyp || []), ...(preferred.standortTyp || [])]),
    prices: preferred.prices || secondary.prices || null,
    currentPricesUpdatedAt: preferred.currentPricesUpdatedAt || secondary.currentPricesUpdatedAt || null,
  };
}

function mergeDirectoryStations(stations) {
  const byId = new Map();
  const keyToId = new Map();

  stations.forEach((station) => {
    if (!station?.stationId) return;
    const keys = serviceStationMergeKeys(station);
    const existingKey = keys.find((key) => keyToId.has(key));
    const primaryKey = existingKey ? keyToId.get(existingKey) : keys[0] || `station:${station.stationId}`;
    const existing = byId.get(primaryKey);
    const next = shouldReplaceServiceStation(existing, station)
      ? mergeDirectoryStationRecords(station, existing || {})
      : mergeDirectoryStationRecords(existing, station);

    byId.set(primaryKey, next);
    serviceStationMergeKeys(next).forEach((key) => {
      keyToId.set(key, primaryKey);
    });

    for (const [otherPrimaryKey, otherStation] of [...byId.entries()]) {
      if (otherPrimaryKey === primaryKey) continue;
      const sameAddress = next.addressId && otherStation.addressId && next.addressId === otherStation.addressId;
      const sameNameNearby = stationNamesSimilar(next.name, otherStation.name)
        && distanceKmBetween(next.lat, next.lng, otherStation.lat, otherStation.lng) <= 0.12;
      if (!sameAddress && !sameNameNearby) continue;
      const merged = shouldReplaceServiceStation(otherStation, next)
        ? mergeDirectoryStationRecords(next, otherStation)
        : mergeDirectoryStationRecords(otherStation, next);
      byId.set(primaryKey, merged);
      byId.delete(otherPrimaryKey);
      serviceStationMergeKeys(merged).forEach((key) => {
        keyToId.set(key, primaryKey);
      });
    }
  });

  return [...byId.values()];
}

async function handleAutobahnStations(req, res) {
  const stationId = String(req.query.stationId || '').trim();
  const highway = String(req.query.highway || '').trim().toUpperCase().replace(/\s+/g, '');
  const hasFuel = String(req.query.hasFuel || '') === '1';
  const includePrices = String(req.query.prices || '0') === '1';
  const refreshPrices = includePrices && String(req.query.refresh || '0') === '1' && Boolean(highway || stationId);
  let stations = [];

  if (stationId) {
    const station = await loadUnifiedServiceStation(stationId)
      || await loadDirectoryStation('autobahn_station_directory', stationId)
      || await loadDirectoryStation('autohof_station_directory', stationId);
    if (station) stations = [station];
  } else {
    const unifiedStations = await loadUnifiedServiceStations({ highway, hasFuel });
    const [raststaetten, autohoefe] = await Promise.all([
      loadDirectoryStations('autobahn_station_directory', { highway, hasFuel }),
      loadDirectoryStations('autohof_station_directory', { highway, hasFuel }),
    ]);
    stations = mergeDirectoryStations([...unifiedStations, ...raststaetten, ...autohoefe]);
  }

  stations = stations.filter((station) => explicitTankerkoenigId(station, ''));
  if (includePrices) stations = await enrichAutobahnStationsWithPrices(stations, refreshPrices);
  stations.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'de'));
  return sendJson(res, { count: stations.length, stations });
}

function routePriceFromCurrent(data, fuel) {
  const current = data.currentPrices?.[fuel] || data.prices?.[fuel] || null;
  if (!current) return null;
  const price = roundPrice(current.price ?? current);
  if (!validPrice(price)) return null;
  return {
    price,
    recordedAt: isoFromTimestamp(current.reportedAt || current.recordedAt || data.currentPricesUpdatedAt || data.updatedAt)
      || (typeof current.recordedAt === 'string' ? current.recordedAt : null),
  };
}

function routeTankpointFromDoc(doc, data, sourceCollection) {
  const stationTypes = Array.isArray(data.standortTyp) ? data.standortTyp : [];
  const priceStationId = explicitTankerkoenigId(data, doc.id);
  const hasFuel = data.tankstelleVorhanden === true
    || data.hasFuel === true
    || stationTypes.includes('Tankstelle')
    || Array.isArray(data.fuelBrands) && data.fuelBrands.length > 0
    || Boolean(data.primaryFuelBrand || data.brand);
  if (!priceStationId && !hasFuel) return null;
  const typ = String(
    data.typ
    || data.type
    || data.autohofTyp
    || (stationTypes.includes('Raststätte') ? 'raststaette' : '')
    || (stationTypes.includes('Autohof') ? 'autohof' : '')
    || (stationTypes.includes('Tankstelle') ? 'tankstelle_nahe_abfahrt' : '')
    || 'tankpunkt',
  );
  const lat = Number(data.lat ?? data.latitude);
  const lng = Number(data.lng ?? data.longitude);
  const stationId = priceStationId || `route_missing_${sourceCollection}_${doc.id}`;

  return {
    id: stationId,
    sourceDocId: doc.id,
    stationId,
    priceStationId,
    missingPriceStationId: !priceStationId,
    name: String(data.name || 'Tankpunkt'),
    brand: String(data.brand || data.primaryFuelBrand || ''),
    street: data.street || data.addressStreet || data.address || '',
    house_number: data.house_number || data.houseNumber || data.houseNumberText || '',
    postcode: data.postcode || data.postCode || data.zip || '',
    city: data.city || data.place || data.town || '',
    country: data.country || 'DE',
    autobahn: String(data.autobahn || data.highway || '').toUpperCase().replace(/\s+/g, ''),
    routeId: String(data.routeId || data.autobahn || data.highway || '').toUpperCase().replace(/\s+/g, ''),
    typ,
    lat,
    lng,
    richtung: String(data.richtung || data.direction || data.sideLabel || data.directionText || 'beide'),
    direktAnAutobahn: data.direktAnAutobahn ?? data.directlyOnHighway ?? (typ === 'raststaette'),
    abfahrtName: data.abfahrtName || data.exitName || data.ausfahrt || data.exitRef || null,
    abfahrtNummer: data.abfahrtNummer || data.exitNumber || data.exitRef || null,
    abfahrtEntfernungKm: Number.isFinite(Number(data.abfahrtEntfernungKm)) ? Number(data.abfahrtEntfernungKm) : null,
    abfahrtEntfernungMin: Number.isFinite(Number(data.abfahrtEntfernungMin)) ? Number(data.abfahrtEntfernungMin) : null,
    streckenIndex: Number.isFinite(Number(data.streckenIndex)) ? Number(data.streckenIndex) : null,
    kmPosition: Number.isFinite(Number(data.kmPosition)) ? Number(data.kmPosition) : null,
    active: data.active !== false && data.isActive !== false,
    isOpen: data.isOpen ?? data.is_open ?? null,
    source: data.source || sourceCollection,
    sourceCollection,
    lastUpdated: isoFromTimestamp(data.lastUpdated || data.updatedAt || data.lastSeenAt || data.importedAt),
    lastAutobahnPriceRefreshAt: isoFromTimestamp(data.lastAutobahnPriceRefreshAt),
    prices: {
      diesel: routePriceFromCurrent(data, 'diesel'),
      e5: routePriceFromCurrent(data, 'e5'),
      e10: routePriceFromCurrent(data, 'e10'),
    },
  };
}

async function loadRouteTankpointsFromCollection(collectionName, route) {
  const query = route === 'ALL'
    ? db.collection(collectionName).limit(5000)
    : db.collection(collectionName).where('autobahn', '==', route).limit(1000);
  const snapshot = await query.get();
  return snapshot.docs
    .map((doc) => routeTankpointFromDoc(doc, doc.data(), collectionName))
    .filter((point) => (
      point
      && point.active
      && /^A\d+$/i.test(point.autobahn)
      && (route === 'ALL' || point.autobahn === route)
      && Number.isFinite(point.lat)
      && Number.isFinite(point.lng)
    ));
}

async function mergeRouteTankpointPrices(points) {
  return Promise.all(points.map(async (point) => {
    const hasPrice = cityFuels.some((fuel) => point.prices?.[fuel]?.price);
    const priceStationId = String(point.priceStationId || '').replace(/^tankkoenig_/, '');
    if (hasPrice || !priceStationId) return point;
    const [diesel, e5, e10] = await Promise.all([
      latestStoredPrice(priceStationId, 'diesel'),
      latestStoredPrice(priceStationId, 'e5'),
      latestStoredPrice(priceStationId, 'e10'),
    ]);
    return {
      ...point,
      prices: { diesel, e5, e10 },
    };
  }));
}

async function handleRouteTankpoints(req, res) {
  const route = String(req.query.route || req.query.autobahn || 'ALL').trim().toUpperCase().replace(/\s+/g, '');
  if (route !== 'ALL' && !/^A\d+$/i.test(route)) return sendJson(res, { error: 'Unsupported route.' }, 422);

  const [prepared, unified] = await Promise.all([
    loadRouteTankpointsFromCollection('autobahnTankpunkte', route).catch(() => []),
    loadRouteTankpointsFromCollection('tankprofi_stations', route).catch(() => []),
  ]);

  const byId = new Map();
  [...unified, ...prepared].forEach((point) => {
    const key = point.priceStationId || point.id || point.stationId;
    const existing = byId.get(key);
    byId.set(key, { ...existing, ...point });
  });

  const tankpoints = await mergeRouteTankpointPrices([...byId.values()]);
  tankpoints.sort((a, b) => {
    const aSort = Number.isFinite(a.kmPosition) ? a.kmPosition : Number.isFinite(a.streckenIndex) ? a.streckenIndex : a.lat;
    const bSort = Number.isFinite(b.kmPosition) ? b.kmPosition : Number.isFinite(b.streckenIndex) ? b.streckenIndex : b.lat;
    return aSort - bSort || String(a.name).localeCompare(String(b.name), 'de');
  });

  return sendJson(res, {
    route,
    count: tankpoints.length,
    updatedAt: new Date().toISOString(),
    tankpoints,
  });
}

async function handleAutohofImport(req, res) {
  if (!['POST', 'GET'].includes(req.method)) return sendJson(res, { error: 'Method not allowed.' }, 405);
  const limit = Math.round(numberParam(req.query.limit || req.body?.limit, 0, 0, 500));
  const highway = String(req.query.highway || req.body?.highway || '').trim().toUpperCase().replace(/\s+/g, '');
  const maxPoints = Math.round(numberParam(req.query.maxPoints || req.body?.maxPoints, 0, 0, 40));
  const pointOffset = Math.round(numberParam(req.query.pointOffset || req.body?.pointOffset, 0, 0, 200));
  const result = await importAutohofDirectory({ limit, highway, maxPoints, pointOffset });
  return sendJson(res, result);
}

async function handleAutobahnPriceRefresh(req, res) {
  if (!['POST', 'GET'].includes(req.method)) return sendJson(res, { error: 'Method not allowed.' }, 405);
  const force = String(req.query.force || req.body?.force || '') === '1' || String(req.body?.force || '') === 'true';
  const route = String(req.query.route || req.query.autobahn || req.body?.route || req.body?.autobahn || 'ALL').trim().toUpperCase().replace(/\s+/g, '');
  if (route !== 'ALL' && !/^A\d+$/i.test(route)) return sendJson(res, { error: 'Unsupported route.' }, 422);
  const maxQueries = Math.round(numberParam(req.query.maxQueries || req.body?.maxQueries, autobahnPriceRefreshMaxQueries, 1, 40));
  const radiusKm = numberParam(req.query.radiusKm || req.body?.radiusKm, autobahnPriceRefreshRadiusKm, 2, 12);
  const result = await runAutobahnPriceRefresh({ force, route, maxQueries, radiusKm });
  return sendJson(res, result);
}

async function handleAutohofTankerkoenigImport(req, res) {
  if (!['POST', 'GET'].includes(req.method)) return sendJson(res, { error: 'Method not allowed.' }, 405);
  const limit = Math.round(numberParam(req.query.limit || req.body?.limit, 0, 0, 500));
  const radiusKm = numberParam(req.query.radius || req.body?.radius, 25, 1, 25);
  const highway = String(req.query.highway || req.body?.highway || 'A9').trim().toUpperCase().replace(/\s+/g, '');
  const maxPoints = Math.round(numberParam(req.query.maxPoints || req.body?.maxPoints, 10, 1, 40));
  const delayMs = Math.round(numberParam(req.query.delayMs || req.body?.delayMs, 650, 0, 5000));
  if (highway === 'ALL') {
    const maxHighways = Math.round(numberParam(req.query.maxHighways || req.body?.maxHighways, 12, 1, 80));
    const highways = await availableHighwaysForServiceImport(maxHighways);
    const results = [];
    for (const currentHighway of highways) {
      try {
        results.push(await importTankerkoenigAutohofDirectory({
          highway: currentHighway,
          limit,
          radiusKm,
          maxPoints,
          delayMs,
        }));
      } catch (error) {
        results.push({
          highway: currentHighway,
          status: 'failed',
          error: error.message,
        });
      }
    }
    return sendJson(res, {
      status: 'completed',
      highway: 'ALL',
      highwaysProcessed: highways.length,
      importedCount: results.reduce((sum, item) => sum + Number(item.importedCount || 0), 0),
      stationsCreated: results.reduce((sum, item) => sum + Number(item.stationsCreated || 0), 0),
      stationsUpdated: results.reduce((sum, item) => sum + Number(item.stationsUpdated || 0), 0),
      errorCount: results.reduce((sum, item) => sum + Number(item.errorCount || (item.status === 'failed' ? 1 : 0) || 0), 0),
      results,
    });
  }
  const result = await importTankerkoenigAutohofDirectory({ highway, limit, radiusKm, maxPoints, delayMs });
  return sendJson(res, result);
}

async function handleTankIdMatch(req, res) {
  if (!['POST', 'GET'].includes(req.method)) return sendJson(res, { error: 'Method not allowed.' }, 405);
  if (Array.isArray(req.body?.pairs)) {
    const dryRunBody = String(req.query.dryRun || req.body?.dryRun || '') === '1'
      || String(req.query.dryRun || req.body?.dryRun || '').toLowerCase() === 'true';
    const result = await writeVerifiedTankIdMatches(req.body.pairs, { dryRun: dryRunBody });
    return sendJson(res, result);
  }
  const limit = Math.round(numberParam(req.query.limit || req.body?.limit, 300, 1, 1000));
  const dryRun = String(req.query.dryRun || req.body?.dryRun || '') === '1'
    || String(req.query.dryRun || req.body?.dryRun || '').toLowerCase() === 'true';
  const live = String(req.query.live || req.body?.live || '') === '1'
    || String(req.query.live || req.body?.live || '').toLowerCase() === 'true';
  const maxDistanceKm = numberParam(req.query.maxDistanceKm || req.body?.maxDistanceKm, 0.25, 0.02, 1.2);
  const result = await matchStoredTankIds({ limit, dryRun, maxDistanceKm, live });
  return sendJson(res, result);
}

async function handleTankIdCandidates(req, res) {
  if (!['POST', 'GET'].includes(req.method)) return sendJson(res, { error: 'Method not allowed.' }, 405);
  const limit = Math.round(numberParam(req.query.limit || req.body?.limit, 200, 1, 1000));
  const radiusKm = numberParam(req.query.radiusKm || req.body?.radiusKm, 0.8, 0.05, 2);
  const result = await reportTankIdCandidates({ limit, radiusKm });
  return sendJson(res, result);
}

async function handleAutohofStations(req, res) {
  const highway = String(req.query.highway || '').trim().toUpperCase().replace(/\s+/g, '');
  const hasFuel = String(req.query.hasFuel || '') === '1';
  const unifiedStations = await loadUnifiedServiceStations({ highway, hasFuel });
  let query = db.collection('autohof_station_directory');
  if (highway) query = query.where('highway', '==', highway);
  if (hasFuel) query = query.where('hasFuel', '==', true);
  const snapshot = await query.limit(500).get();
  const legacyStations = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      importedAt: isoFromTimestamp(data.importedAt),
    };
  });
  const stations = mergeDirectoryStations([...unifiedStations, ...legacyStations]);
  stations.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'de'));
  return sendJson(res, { count: stations.length, stations });
}

function requestDeviceSummary(req) {
  const userAgent = String(req.headers['user-agent'] || '');
  const lower = userAgent.toLowerCase();
  let deviceType = 'Desktop';
  if (lower.includes('iphone')) deviceType = 'iPhone';
  else if (lower.includes('ipad')) deviceType = 'iPad';
  else if (lower.includes('android')) deviceType = lower.includes('mobile') ? 'Android Phone' : 'Android Tablet';
  else if (lower.includes('mobile')) deviceType = 'Mobile';

  let browser = 'Browser';
  if (lower.includes('edg/')) browser = 'Edge';
  else if (lower.includes('crios') || lower.includes('chrome/')) browser = 'Chrome';
  else if (lower.includes('firefox/')) browser = 'Firefox';
  else if (lower.includes('safari/')) browser = 'Safari';

  return {
    deviceType,
    browser,
    deviceLabel: `${deviceType} ${browser}`.trim(),
  };
}

async function rememberSearch({ searchText, lat, lng, radius, fuel, resultCount, device = null }) {
  await db.collection('searches').add({
    searched_at: FieldValue.serverTimestamp(),
    search_text: searchText || null,
    lat,
    lng,
    radius_km: radius,
    fuel_type: fuel,
    result_count: resultCount,
    device: device || null,
  });
}

async function rememberStations(stations) {
  return await rememberTankprofiStations(stations, {
    source: 'tankkoenig',
    writePriceHistory: true,
  });
}

async function collectionCount(collectionName) {
  const snapshot = await db.collection(collectionName).count().get();
  return Number(snapshot.data().count || 0);
}

async function loadSearchDeviceStats(limit = 500) {
  const snapshot = await db.collection('searches')
    .orderBy('searched_at', 'desc')
    .limit(limit)
    .get();
  const devices = new Map();
  snapshot.docs.forEach((doc) => {
    const data = doc.data() || {};
    const label = data.device?.deviceLabel || data.device?.deviceType || 'Unbekannt';
    devices.set(label, (devices.get(label) || 0) + 1);
  });
  return [...devices.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'de'))
    .slice(0, 6);
}

async function loadTankkoenigAddressStats() {
  const snapshot = await db.collection('tankprofi_stations')
    .where('source', '==', 'tankkoenig')
    .limit(20000)
    .get();
  const addressIds = new Set();
  let stationsWithKoenigId = 0;
  let stationsWithKoenigIdAndAddress = 0;
  snapshot.docs.forEach((doc) => {
    const data = doc.data() || {};
    if (!explicitTankerkoenigId(data, doc.id)) return;
    stationsWithKoenigId += 1;
    if (data.addressId) {
      stationsWithKoenigIdAndAddress += 1;
      addressIds.add(String(data.addressId));
    }
  });
  return {
    stationsWithKoenigId,
    stationsWithKoenigIdAndAddress,
    addressesWithKoenigId: addressIds.size,
  };
}

async function loadTankkoenigCityStats(targetCities = ['berlin']) {
  const snapshot = await db.collection('tankprofi_stations')
    .where('source', '==', 'tankkoenig')
    .limit(20000)
    .get();
  const wanted = new Set(targetCities.map((city) => normalizeText(city)));
  const addressIds = new Set();
  const stations = [];

  snapshot.docs.forEach((doc) => {
    const data = doc.data() || {};
    const tankerkoenigId = explicitTankerkoenigId(data, doc.id);
    if (!tankerkoenigId) return;
    const stationCity = normalizeText(data.city || data.place || data.town);
    const addressId = data.addressId ? String(data.addressId) : '';
    if (addressId) addressIds.add(addressId);
    stations.push({
      tankerkoenigId,
      stationCity,
      addressId,
      hasPrices: Boolean(data.currentPrices),
    });
  });

  const addressCityById = new Map();
  const ids = [...addressIds];
  for (let index = 0; index < ids.length; index += 300) {
    const batchIds = ids.slice(index, index + 300);
    const docs = await db.getAll(...batchIds.map((id) => db.collection('tankprofi_addresses').doc(id)));
    docs.forEach((doc, docIndex) => {
      if (!doc.exists) return;
      const data = doc.data() || {};
      addressCityById.set(batchIds[docIndex], normalizeText(data.city || data.place));
    });
  }

  const byCity = new Map([...wanted].map((city) => [city, {
    city,
    uniqueKoenigIds: new Set(),
    directCityMatches: 0,
    addressCityMatches: 0,
    withStoredPrices: 0,
  }]));

  stations.forEach((station) => {
    const addressCity = addressCityById.get(station.addressId) || '';
    byCity.forEach((stats, city) => {
      const directMatch = station.stationCity === city;
      const addressMatch = addressCity === city;
      if (!directMatch && !addressMatch) return;
      stats.uniqueKoenigIds.add(station.tankerkoenigId);
      if (directMatch) stats.directCityMatches += 1;
      if (addressMatch) stats.addressCityMatches += 1;
      if (station.hasPrices) stats.withStoredPrices += 1;
    });
  });

  return [...byCity.values()].map((stats) => ({
    city: stats.city,
    uniqueKoenigIds: stats.uniqueKoenigIds.size,
    directCityMatches: stats.directCityMatches,
    addressCityMatches: stats.addressCityMatches,
    withStoredPrices: stats.withStoredPrices,
  }));
}

function newestPriceTimeMs(data = {}) {
  const candidates = [data.currentPricesUpdatedAt, data.updatedAt, data.lastSeenAt];
  cityFuels.forEach((fuel) => {
    const priceData = data.currentPrices?.[fuel] || data.prices?.[fuel] || null;
    if (priceData) candidates.push(priceData.reportedAt || priceData.recordedAt || priceData.updatedAt);
  });
  return candidates
    .map((value) => value?.toMillis?.() || Date.parse(value || ''))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0] || null;
}

async function loadTankkoenigAuditStats() {
  const snapshot = await db.collection('tankprofi_stations')
    .limit(20000)
    .get();
  const now = Date.now();
  const idRecords = new Map();
  const sourceCounts = new Map();
  const matchSourceCounts = new Map();
  const addressGroups = new Map();
  const coordinateGroups = new Map();
  let withoutKoenigId = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data() || {};
    const tankerkoenigId = explicitTankerkoenigId(data, doc.id);
    if (!tankerkoenigId) {
      withoutKoenigId += 1;
      return;
    }

    const record = idRecords.get(tankerkoenigId) || {
      tankerkoenigId,
      hasPrice: false,
      newestMs: null,
      activeTrue: false,
      inactiveFalse: false,
      sources: new Set(),
      matchSources: new Set(),
      docCount: 0,
    };
    record.docCount += 1;
    const source = String(data.source || 'unbekannt');
    record.sources.add(source);
    const matchSource = String(data.priceMatch?.source || data.tankIdMatch?.source || (source === 'tankkoenig' ? 'direct_tankkoenig' : 'unknown_match'));
    record.matchSources.add(matchSource);
    if (data.isActive === true) record.activeTrue = true;
    if (data.isActive === false) record.inactiveFalse = true;

    const hasPrice = cityFuels.some((fuel) => validPrice(data.currentPrices?.[fuel]?.price));
    if (hasPrice) record.hasPrice = true;

    const newestMs = newestPriceTimeMs(data);
    if (newestMs && (!record.newestMs || newestMs > record.newestMs)) record.newestMs = newestMs;
    idRecords.set(tankerkoenigId, record);

    const addressId = String(data.addressId || '');
    if (addressId) {
      const group = addressGroups.get(addressId) || new Set();
      group.add(tankerkoenigId);
      addressGroups.set(addressId, group);
    }
    const lat = Number(data.latitude ?? data.lat);
    const lng = Number(data.longitude ?? data.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const key = `${lat.toFixed(4)}:${lng.toFixed(4)}`;
      const group = coordinateGroups.get(key) || new Set();
      group.add(tankerkoenigId);
      coordinateGroups.set(key, group);
    }
  });

  [...idRecords.values()].forEach((record) => {
    const source = record.sources.has('tankkoenig') ? 'tankkoenig' : [...record.sources][0] || 'unbekannt';
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    const matchSource = record.matchSources.has('direct_tankkoenig')
      ? 'direct_tankkoenig'
      : [...record.matchSources][0] || 'unknown_match';
    matchSourceCounts.set(matchSource, (matchSourceCounts.get(matchSource) || 0) + 1);
  });

  const mapToItems = (map) => [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'de'));
  const records = [...idRecords.values()];
  const withAnyPrice = records.filter((record) => record.hasPrice).length;
  const fresh2h = records.filter((record) => record.newestMs && now - record.newestMs <= 2 * 60 * 60 * 1000).length;
  const fresh24h = records.filter((record) => record.newestMs && now - record.newestMs <= 24 * 60 * 60 * 1000).length;
  const staleOver24h = records.length - fresh24h;
  const activeTrue = records.filter((record) => record.activeTrue).length;
  const inactiveFalse = records.filter((record) => record.inactiveFalse && !record.activeTrue).length;
  const duplicateIdDocs = records.filter((record) => record.docCount > 1);
  const multiAddressGroups = [...addressGroups.values()].filter((group) => group.size > 1);
  const multiCoordinateGroups = [...coordinateGroups.values()].filter((group) => group.size > 1);

  return {
    scannedStationDocs: snapshot.size,
    uniqueKoenigIds: records.length,
    duplicateKoenigIdGroups: duplicateIdDocs.length,
    duplicateKoenigIdDocs: duplicateIdDocs.reduce((sum, record) => sum + record.docCount, 0),
    withoutKoenigId,
    withAnyStoredPrice: withAnyPrice,
    noStoredPrice: records.length - withAnyPrice,
    freshPrice2h: fresh2h,
    freshPrice24h: fresh24h,
    stalePriceOver24h: staleOver24h,
    activeTrue,
    inactiveFalse,
    multiAddressGroups: multiAddressGroups.length,
    idsInMultiAddressGroups: multiAddressGroups.reduce((sum, group) => sum + group.size, 0),
    multiCoordinateGroups: multiCoordinateGroups.length,
    idsInMultiCoordinateGroups: multiCoordinateGroups.reduce((sum, group) => sum + group.size, 0),
    sourceCounts: mapToItems(sourceCounts),
    matchSourceCounts: mapToItems(matchSourceCounts),
  };
}

async function handleAdminStats(req, res) {
  const quick = String(req.query.quick || '0') === '1';
  if (quick) {
    const [addresses, stations, pendingCells, autohoefe, raststaetten, ladeparks, truckStops, searchCount] = await Promise.all([
      collectionCount('tankprofi_addresses'),
      collectionCount('tankprofi_stations'),
      db.collection('tankprofi_scan_cells').where('status', '==', 'pending').count().get(),
      db.collection('tankprofi_stations').where('standortTyp', 'array-contains', 'Autohof').count().get(),
      db.collection('tankprofi_stations').where('standortTyp', 'array-contains', 'RaststÃ¤tte').count().get(),
      db.collection('tankprofi_stations').where('standortTyp', 'array-contains', 'Ladepark').count().get(),
      db.collection('tankprofi_stations').where('standortTyp', 'array-contains', 'Truck Stop').count().get(),
      collectionCount('searches'),
    ]);

    return sendJson(res, {
      addresses,
      stations,
      autohoefe: Number(autohoefe.data().count || 0),
      raststaetten: Number(raststaetten.data().count || 0),
      ladeparks: Number(ladeparks.data().count || 0),
      truckStops: Number(truckStops.data().count || 0),
      scanCellsPending: Number(pendingCells.data().count || 0),
      tankkoenig: {
        appSearches: searchCount,
      },
      partial: true,
      updatedAt: new Date().toISOString(),
    });
  }

  const [addresses, stations, pendingCells, autohoefe, raststaetten, ladeparks, truckStops, searchCount, deviceStats, tankkoenigAddressStats, tankkoenigCityStats, tankkoenigAuditStats] = await Promise.all([
    collectionCount('tankprofi_addresses'),
    collectionCount('tankprofi_stations'),
    db.collection('tankprofi_scan_cells').where('status', '==', 'pending').count().get(),
    db.collection('tankprofi_stations').where('standortTyp', 'array-contains', 'Autohof').count().get(),
    db.collection('tankprofi_stations').where('standortTyp', 'array-contains', 'Raststätte').count().get(),
    db.collection('tankprofi_stations').where('standortTyp', 'array-contains', 'Ladepark').count().get(),
    db.collection('tankprofi_stations').where('standortTyp', 'array-contains', 'Truck Stop').count().get(),
    collectionCount('searches'),
    loadSearchDeviceStats(),
    loadTankkoenigAddressStats(),
    loadTankkoenigCityStats(),
    loadTankkoenigAuditStats(),
  ]);

  return sendJson(res, {
    addresses,
    stations,
    autohoefe: Number(autohoefe.data().count || 0),
    raststaetten: Number(raststaetten.data().count || 0),
    ladeparks: Number(ladeparks.data().count || 0),
    truckStops: Number(truckStops.data().count || 0),
    scanCellsPending: Number(pendingCells.data().count || 0),
    tankkoenig: {
      appSearches: searchCount,
      deviceStats,
      cityStats: tankkoenigCityStats,
      audit: tankkoenigAuditStats,
      ...tankkoenigAddressStats,
    },
    updatedAt: new Date().toISOString(),
  });
}

function csvValue(value) {
  if (value === null || value === undefined) return '';
  const raw = Array.isArray(value)
    ? value.filter((item) => item !== null && item !== undefined && String(item).trim() !== '').join('|')
    : value?.toDate
      ? value.toDate().toISOString()
      : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

function csvLine(values) {
  return values.map(csvValue).join(';');
}

function parseDelimitedLine(line, delimiter = ';') {
  const values = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === delimiter && !quoted) {
      values.push(value);
      value = '';
      continue;
    }
    value += char;
  }
  values.push(value);
  return values;
}

function parseDelimitedRecords(text, delimiter = ';') {
  const records = [];
  let record = [];
  let value = '';
  let quoted = false;
  const source = String(text || '').replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === delimiter && !quoted) {
      record.push(value);
      value = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      record.push(value);
      if (record.some((item) => String(item).trim() !== '')) records.push(record);
      record = [];
      value = '';
      continue;
    }
    value += char;
  }
  record.push(value);
  if (record.some((item) => String(item).trim() !== '')) records.push(record);
  return records;
}

function normalizeCsvText(value) {
  return String(value || '').replace(/\u00a0/g, ' ').trim();
}

function numberFromGerman(value) {
  const normalized = normalizeCsvText(value).replace(/\./g, '').replace(',', '.');
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

const chargingCsvColumnIndex = new Map(Object.entries({
  'Ladeeinrichtungs-ID': 0,
  Betreiber: 1,
  'Anzeigename (Karte)': 2,
  Status: 3,
  'Art der Ladeeinrichtung': 4,
  'Anzahl Ladepunkte': 5,
  'Nennleistung Ladeeinrichtung [kW]': 6,
  Inbetriebnahmedatum: 7,
  'Straße': 8,
  Hausnummer: 9,
  Adresszusatz: 10,
  Postleitzahl: 11,
  Ort: 12,
  'Kreis/kreisfreie Stadt': 13,
  Bundesland: 14,
  Breitengrad: 15,
  'Längengrad': 16,
  Standortbezeichnung: 17,
  'Informationen zum Parkraum': 18,
  Bezahlsysteme: 19,
  'Öffnungszeiten': 20,
  'Öffnungszeiten: Wochentage': 21,
  'Öffnungszeiten: Tageszeiten': 22,
}));

for (let index = 1; index <= 6; index += 1) {
  const base = 23 + ((index - 1) * 4);
  chargingCsvColumnIndex.set(`Steckertypen${index}`, base);
  chargingCsvColumnIndex.set(`Nennleistung Stecker${index}`, base + 1);
  chargingCsvColumnIndex.set(`EVSE-ID${index}`, base + 2);
  chargingCsvColumnIndex.set(`Public Key${index}`, base + 3);
}

function splitCsvList(value) {
  return normalizeCsvText(value).split(';').map((item) => normalizeCsvText(item)).filter(Boolean);
}

function connectorMode(type) {
  const text = String(type || '').toLowerCase();
  if (text.includes('dc') || text.includes('combo') || text.includes('chademo')) return 'DC';
  if (text.includes('ac') || text.includes('typ 2') || text.includes('schuko')) return 'AC';
  return '';
}

function normalizeChargingRow(row, headers) {
  const get = (name) => {
    const headerIndex = headers.get(name);
    const fallbackIndex = chargingCsvColumnIndex.get(name);
    const index = Number.isInteger(headerIndex) ? headerIndex : fallbackIndex;
    return normalizeCsvText(Number.isInteger(index) ? row[index] : '');
  };
  const sourceId = get('Ladeeinrichtungs-ID');
  if (!/^\d+$/.test(sourceId)) return null;
  const lat = numberFromGerman(get('Breitengrad'));
  const lng = numberFromGerman(get('Längengrad'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const connectors = [];
  for (let index = 1; index <= 6; index += 1) {
    const type = get(`Steckertypen${index}`);
    const powerRaw = get(`Nennleistung Stecker${index}`);
    const evseId = get(`EVSE-ID${index}`);
    const publicKey = get(`Public Key${index}`);
    if (!type && !powerRaw && !evseId && !publicKey) continue;
    const powers = splitCsvList(powerRaw).map(numberFromGerman).filter((number) => Number.isFinite(number));
    connectors.push({
      index,
      type,
      mode: connectorMode(type),
      powerKw: powers.length ? Math.max(...powers) : numberFromGerman(powerRaw),
      powerRaw,
      evseId,
      publicKey,
    });
  }
  const connectorModes = new Set(connectors.map((connector) => connector.mode).filter(Boolean));
  const maxConnectorPowerKw = connectors
    .map((connector) => Number(connector.powerKw))
    .filter((number) => Number.isFinite(number))
    .reduce((max, number) => Math.max(max, number), 0);
  const operatorName = get('Betreiber');
  const displayName = get('Anzeigename (Karte)');
  const stationName = displayName || get('Standortbezeichnung') || operatorName || `Ladeeinrichtung ${sourceId}`;
  const street = get('Straße');
  const houseNumber = get('Hausnummer');
  return {
    source: 'bnetza',
    sourceId,
    stationId: `bnetza_${sourceId}`,
    name: stationName,
    operatorName,
    displayName,
    status: get('Status'),
    facilityType: get('Art der Ladeeinrichtung'),
    chargingPointCount: Math.max(Number(numberFromGerman(get('Anzahl Ladepunkte')) || 0), connectors.length),
    nominalPowerKw: numberFromGerman(get('Nennleistung Ladeeinrichtung [kW]')),
    maxConnectorPowerKw: maxConnectorPowerKw || null,
    acDc: connectorModes.has('DC') ? 'DC' : connectorModes.has('AC') ? 'AC' : '',
    fastCharging: connectorModes.has('DC') || maxConnectorPowerKw >= 50,
    commissioningDateRaw: get('Inbetriebnahmedatum'),
    street,
    houseNumber,
    addressLine: [street, houseNumber].filter(Boolean).join(' '),
    postcode: get('Postleitzahl'),
    city: get('Ort'),
    district: get('Kreis/kreisfreie Stadt'),
    state: get('Bundesland'),
    lat,
    lng,
    siteName: get('Standortbezeichnung'),
    parkingInfo: get('Informationen zum Parkraum'),
    paymentSystems: splitCsvList(get('Bezahlsysteme')),
    openingHours: get('Öffnungszeiten'),
    openingWeekdays: splitCsvList(get('Öffnungszeiten: Wochentage')),
    openingTimes: splitCsvList(get('Öffnungszeiten: Tageszeiten')),
    connectors,
    connectorTypes: [...new Set(connectors.map((connector) => connector.type).filter(Boolean))],
    evseIds: connectors.map((connector) => connector.evseId).filter(Boolean),
    publicKeys: connectors.map((connector) => connector.publicKey).filter(Boolean),
    sourceUrl: bnetzaChargingCsvUrl,
    sourceName: 'Bundesnetzagentur Ladesaeulenregister',
    sourceLicense: 'CC BY 4.0',
    sourceUpdatedAt: bnetzaChargingSourceDate,
    updatedAt: FieldValue.serverTimestamp(),
    importedAt: FieldValue.serverTimestamp(),
  };
}

async function loadBnetzaChargingCsvRows() {
  const text = await fetchText(bnetzaChargingCsvUrl, 'Tankprofi/1.0 (charging-import)', 'windows-1252');
  const rows = [];
  let headers = null;
  let dataIndex = 0;
  let totalRows = 0;
  let record = [];
  let value = '';
  let quoted = false;
  let completedCsvScan = true;
  const source = String(text || '').replace(/^\uFEFF/, '');
  const offset = Number(arguments[0] || 0);
  const limit = Number(arguments[1] || 5000);
  const pushRecord = () => {
    record.push(value);
    const current = record;
    record = [];
    value = '';
    if (!current.some((item) => String(item).trim() !== '')) return;
    if (!headers) {
      if (current.includes('Ladeeinrichtungs-ID') && current.includes('Betreiber')) {
        headers = new Map(current.map((name, index) => [normalizeCsvText(name), index]));
      }
      return;
    }
    if (dataIndex >= offset && rows.length < limit) rows.push(current);
    dataIndex += 1;
    totalRows += 1;
  };
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === ';' && !quoted) {
      record.push(value);
      value = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      pushRecord();
      if (headers && rows.length >= limit && dataIndex >= offset + limit) {
        completedCsvScan = false;
        break;
      }
      continue;
    }
    value += char;
  }
  if (record.length || value) pushRecord();
  if (!headers) {
    throw new Error(`BNetzA CSV-Header nicht gefunden: ${text.slice(0, 80).replace(/\s+/g, ' ')}`);
  }
  return { headers, dataRows: rows, totalRows: completedCsvScan ? totalRows : null, completedCsvScan };
}

async function handleChargingImport(req, res) {
  const offset = Math.max(0, Math.round(numberParam(req.query.offset || req.body?.offset, 0, 0, 1000000)));
  const limit = Math.round(numberParam(req.query.limit || req.body?.limit, 5000, 1, 20000));
  const startedAt = Date.now();
  const { headers, dataRows, totalRows, completedCsvScan } = await loadBnetzaChargingCsvRows(offset, limit);
  const slice = dataRows;
  const stats = {
    offset,
    limit,
    totalRows,
    processedRows: 0,
    importedStations: 0,
    importedChargingPoints: 0,
    skippedRows: 0,
    nextOffset: offset + slice.length,
    done: completedCsvScan && slice.length < limit,
    source: 'Bundesnetzagentur Ladesaeulenregister',
    sourceUpdatedAt: bnetzaChargingSourceDate,
  };
  let batch = db.batch();
  let batchSize = 0;
  for (const row of slice) {
    stats.processedRows += 1;
    const station = normalizeChargingRow(row, headers);
    if (!station) {
      stats.skippedRows += 1;
      continue;
    }
    batch.set(db.collection('charging_stations').doc(station.stationId), station, { merge: true });
    batchSize += 1;
    stats.importedStations += 1;
    stats.importedChargingPoints += Number(station.chargingPointCount || station.connectors?.length || 0);
    if (batchSize >= 450) {
      await batch.commit();
      batch = db.batch();
      batchSize = 0;
    }
  }
  if (batchSize) await batch.commit();
  await db.collection('tankprofi_jobs').doc('charging-import').set({
    jobId: 'charging-import',
    ...stats,
    lastRunAt: FieldValue.serverTimestamp(),
    durationMs: Date.now() - startedAt,
  }, { merge: true });
  sendJson(res, { ok: true, ...stats, durationMs: Date.now() - startedAt });
}

function invalidChargingDocument(data) {
  const sourceId = String(data?.sourceId || '').trim();
  const stationId = String(data?.stationId || '').trim();
  const lat = Number(data?.lat);
  const lng = Number(data?.lng);
  return !/^\d+$/.test(sourceId)
    || !/^bnetza_\d+$/.test(stationId)
    || !Number.isFinite(lat)
    || !Number.isFinite(lng)
    || lat < 47
    || lat > 56
    || lng < 5
    || lng > 16;
}

async function handleChargingCleanup(req, res) {
  const limit = Math.round(numberParam(req.query.limit || req.body?.limit, 500, 1, 500));
  const snapshot = await db.collection('charging_stations').limit(2500).get();
  const batch = db.batch();
  let scanned = 0;
  let deleted = 0;
  for (const doc of snapshot.docs) {
    scanned += 1;
    if (!invalidChargingDocument({ ...doc.data(), stationId: doc.data().stationId || doc.id })) continue;
    batch.delete(doc.ref);
    deleted += 1;
    if (deleted >= limit) break;
  }
  if (deleted) await batch.commit();
  sendJson(res, {
    ok: true,
    scanned,
    deleted,
    limit,
    done: deleted < limit,
  });
}

function normalizeChargingForClient(doc, origin = null) {
  const data = doc.data ? doc.data() : doc;
  const station = {
    id: doc.id || data.stationId || data.sourceId,
    stationId: data.stationId || doc.id || data.sourceId,
    sourceId: data.sourceId || '',
    name: data.name || data.displayName || data.operatorName || 'Ladepunkt',
    operatorName: data.operatorName || '',
    displayName: data.displayName || '',
    status: data.status || '',
    facilityType: data.facilityType || '',
    chargingPointCount: Number(data.chargingPointCount || 0),
    nominalPowerKw: Number(data.nominalPowerKw || 0),
    maxConnectorPowerKw: Number(data.maxConnectorPowerKw || 0),
    acDc: data.acDc || '',
    fastCharging: data.fastCharging === true,
    street: data.street || '',
    houseNumber: data.houseNumber || '',
    addressLine: data.addressLine || [data.street, data.houseNumber].filter(Boolean).join(' '),
    postcode: data.postcode || '',
    city: data.city || '',
    district: data.district || '',
    state: data.state || '',
    lat: Number(data.lat),
    lng: Number(data.lng),
    siteName: data.siteName || '',
    paymentSystems: Array.isArray(data.paymentSystems) ? data.paymentSystems : [],
    openingHours: data.openingHours || '',
    connectorTypes: Array.isArray(data.connectorTypes) ? data.connectorTypes : [],
    connectors: Array.isArray(data.connectors) ? data.connectors.slice(0, 6) : [],
    sourceName: data.sourceName || 'Bundesnetzagentur Ladesaeulenregister',
    sourceLicense: data.sourceLicense || 'CC BY 4.0',
    sourceUpdatedAt: data.sourceUpdatedAt || bnetzaChargingSourceDate,
  };
  if (origin && Number.isFinite(station.lat) && Number.isFinite(station.lng)) {
    station.distance = distanceKmBetween(origin.lat, origin.lng, station.lat, station.lng);
  }
  return station;
}

function normalizeChargingForDistribution(doc) {
  const station = normalizeChargingForClient(doc);
  return {
    id: station.id,
    stationId: station.stationId,
    sourceId: station.sourceId,
    name: station.name,
    operatorName: station.operatorName,
    displayName: station.displayName,
    status: station.status,
    chargingPointCount: station.chargingPointCount,
    nominalPowerKw: station.nominalPowerKw,
    maxConnectorPowerKw: station.maxConnectorPowerKw,
    acDc: station.acDc,
    fastCharging: station.fastCharging,
    city: station.city,
    postcode: station.postcode,
    state: station.state,
    lat: station.lat,
    lng: station.lng,
  };
}

async function handleChargingStations(req, res) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const hasOrigin = Number.isFinite(lat) && Number.isFinite(lng);
  const distributionMode = req.query.distribution === '1' || req.query.all === '1';
  const radiusKm = numberParam(req.query.radius, hasOrigin ? 25 : 0, 1, 100);
  const maxLimit = distributionMode && !hasOrigin ? 30000 : 500;
  const limit = Math.round(numberParam(req.query.limit, distributionMode ? 30000 : 100, 1, maxLimit));
  let docs = [];
  if (hasOrigin) {
    const latDelta = radiusKm / 111;
    const snapshot = await db.collection('charging_stations')
      .where('lat', '>=', lat - latDelta)
      .where('lat', '<=', lat + latDelta)
      .limit(1200)
      .get();
    docs = snapshot.docs;
  } else {
    const snapshot = await db.collection('charging_stations').orderBy('sourceId').limit(limit).get();
    docs = snapshot.docs;
  }
  const origin = hasOrigin ? { lat, lng } : null;
  const stations = docs
    .map((doc) => (distributionMode && !hasOrigin ? normalizeChargingForDistribution(doc) : normalizeChargingForClient(doc, origin)))
    .filter((station) => Number.isFinite(station.lat) && Number.isFinite(station.lng))
    .filter((station) => !hasOrigin || station.distance <= radiusKm)
    .sort((a, b) => (a.distance ?? 999999) - (b.distance ?? 999999))
    .slice(0, limit);
  const pointCount = stations.reduce((sum, station) => sum + Number(station.chargingPointCount || 0), 0);
  sendJson(res, {
    ok: true,
    stations,
    count: stations.length,
    chargingPointCount: pointCount,
    source: 'Bundesnetzagentur Ladesaeulenregister',
    sourceUpdatedAt: bnetzaChargingSourceDate,
    license: 'CC BY 4.0',
  });
}

function exportDateValue(value) {
  if (!value) return '';
  if (value.toDate) return value.toDate().toISOString();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : String(value);
}

async function handleAddressExport(req, res) {
  const [addressSnapshot, stationSnapshot] = await Promise.all([
    db.collection('tankprofi_addresses').limit(30000).get(),
    db.collection('tankprofi_stations').limit(30000).get(),
  ]);
  const stationsByAddress = new Map();
  stationSnapshot.docs.forEach((doc) => {
    const data = doc.data() || {};
    const addressId = String(data.addressId || '').trim();
    if (!addressId) return;
    const list = stationsByAddress.get(addressId) || [];
    list.push({ docId: doc.id, data });
    stationsByAddress.set(addressId, list);
  });

  const headers = [
    'addressId',
    'country',
    'postcode',
    'city',
    'street',
    'houseNumber',
    'latitude',
    'longitude',
    'addressHash',
    'createdAt',
    'updatedAt',
    'lastUsedAt',
    'stationCount',
    'koenigIds',
    'stationIds',
    'stationNames',
    'brands',
    'sources',
    'standortTyp',
    'autobahnen',
  ];

  const rows = [csvLine(headers)];
  addressSnapshot.docs
    .map((doc) => ({ doc, data: doc.data() || {} }))
    .sort((a, b) => {
      const cityCompare = String(a.data.city || '').localeCompare(String(b.data.city || ''), 'de');
      if (cityCompare) return cityCompare;
      const streetCompare = String(a.data.street || '').localeCompare(String(b.data.street || ''), 'de');
      if (streetCompare) return streetCompare;
      return String(a.data.houseNumber || '').localeCompare(String(b.data.houseNumber || ''), 'de');
    })
    .forEach(({ doc, data }) => {
      const addressId = String(data.addressId || doc.id);
      const stations = stationsByAddress.get(addressId) || [];
      const stationValues = (fieldNames) => uniq(stations
        .map(({ docId, data: station }) => {
          if (fieldNames.includes('__docId')) return docId;
          for (const fieldName of fieldNames) {
            if (station[fieldName] !== null && station[fieldName] !== undefined && String(station[fieldName]).trim() !== '') return station[fieldName];
          }
          return '';
        })
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .map((value) => String(value || '').trim())
        .filter(Boolean));
      rows.push(csvLine([
        addressId,
        data.country || 'DE',
        data.postcode || data.postCode || '',
        data.city || data.place || '',
        data.street || '',
        data.houseNumber || data.house_number || '',
        data.latitude ?? data.lat ?? '',
        data.longitude ?? data.lng ?? '',
        data.addressHash || '',
        exportDateValue(data.createdAt),
        exportDateValue(data.updatedAt),
        exportDateValue(data.lastUsedAt),
        stations.length,
        stationValues(['externalStationId', 'tankerkoenigId', 'tankerkoenig_id', 'priceStationId']),
        stationValues(['stationId', '__docId']),
        stationValues(['name']),
        stationValues(['brand', 'operator', 'primaryFuelBrand']),
        stationValues(['source', 'directorySource']),
        stationValues(['standortTyp']),
        stationValues(['autobahn', 'highway', 'routeId']),
      ]));
    });

  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="tankprofi-addressdaten.csv"');
  return res.status(200).send(`\uFEFF${rows.join('\n')}\n`);
}

function legacyAddressStationFromDoc(data) {
  return {
    country: data.country || 'DE',
    street: data.street || data.address || '',
    houseNumber: data.houseNumber || data.house_number || '',
    postCode: data.postCode || data.postcode || '',
    place: data.place || data.city || '',
    lat: data.lat ?? data.latitude,
    lng: data.lng ?? data.longitude,
  };
}

async function consolidateAddressCollection(collectionName, limit) {
  const snapshot = await db.collection(collectionName).limit(limit).get();
  const batch = db.batch();
  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    scanned += 1;
    const data = doc.data();
    const station = legacyAddressStationFromDoc(data);
    const hasAddressSource = [
      station.street,
      station.houseNumber,
      station.postCode,
      station.place,
      station.lat,
      station.lng,
    ].some((value) => value !== null && value !== undefined && String(value).trim() !== '');

    if (!hasAddressSource && data.addressId) {
      skipped += 1;
      continue;
    }
    if (!hasAddressSource) {
      skipped += 1;
      continue;
    }

    const { address } = await upsertTankprofiAddress(station);
    batch.set(doc.ref, {
      addressId: address.addressId,
      address: FieldValue.delete(),
      street: FieldValue.delete(),
      houseNumber: FieldValue.delete(),
      house_number: FieldValue.delete(),
      postCode: FieldValue.delete(),
      postcode: FieldValue.delete(),
      place: FieldValue.delete(),
      city: FieldValue.delete(),
      country: FieldValue.delete(),
      lat: FieldValue.delete(),
      lng: FieldValue.delete(),
      latitude: FieldValue.delete(),
      longitude: FieldValue.delete(),
      addressConsolidatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    updated += 1;
  }

  if (updated) await batch.commit();
  return { collectionName, scanned, updated, skipped };
}

function canonicalAddressKeyFromAddressDoc(data) {
  const country = normalizeCountry(data.country || 'DE');
  const postcode = normalizeText(data.postcode || data.postCode);
  const city = normalizeText(data.city || data.place);
  const street = normalizeText(data.street);
  const houseNumber = normalizeText(data.houseNumber || data.house_number);
  const hasAddressText = Boolean(postcode || city || street || houseNumber);
  if (!hasAddressText) return '';
  return [country, postcode, city, street, houseNumber].filter(Boolean).join('|');
}

function canonicalStationFromAddressData(data) {
  return {
    country: data.country || 'DE',
    postcode: data.postcode || data.postCode || '',
    city: data.city || data.place || '',
    street: data.street || '',
    houseNumber: data.houseNumber || data.house_number || '',
    lat: data.latitude ?? data.lat,
    lng: data.longitude ?? data.lng,
  };
}

async function updateAddressReferences(collectionName, fromAddressIds, toAddressId) {
  let updated = 0;
  for (let index = 0; index < fromAddressIds.length; index += 10) {
    const ids = fromAddressIds.slice(index, index + 10);
    let hasMore = true;
    while (hasMore) {
      const snapshot = await db.collection(collectionName)
        .where('addressId', 'in', ids)
        .limit(400)
        .get();
      if (snapshot.empty) {
        hasMore = false;
        continue;
      }
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.set(doc.ref, {
          addressId: toAddressId,
          addressMergedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        updated += 1;
      });
      await batch.commit();
      hasMore = snapshot.size >= 400;
    }
  }
  return updated;
}

async function consolidateDuplicateAddresses(limit = 5000) {
  const snapshot = await db.collection('tankprofi_addresses').limit(limit).get();
  const groups = new Map();
  snapshot.docs.forEach((doc) => {
    const data = doc.data() || {};
    const key = canonicalAddressKeyFromAddressDoc(data);
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ doc, data });
  });

  let groupsMerged = 0;
  let addressesDeleted = 0;
  let stationRefsUpdated = 0;
  let priceRefsUpdated = 0;
  let directoryRefsUpdated = 0;

  for (const entries of groups.values()) {
    if (entries.length < 2) continue;
    const canonicalAddress = normalizedAddressFromStation(canonicalStationFromAddressData(entries[0].data));
    const targetRef = db.collection('tankprofi_addresses').doc(canonicalAddress.addressId);
    const duplicateEntries = entries.filter((entry) => entry.doc.id !== canonicalAddress.addressId);
    if (!duplicateEntries.length) continue;

    await targetRef.set({
      ...canonicalAddress,
      mergedFromAddressIds: FieldValue.arrayUnion(...duplicateEntries.map((entry) => entry.doc.id)),
      updatedAt: FieldValue.serverTimestamp(),
      lastUsedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    const duplicateIds = duplicateEntries.map((entry) => entry.doc.id);
    stationRefsUpdated += await updateAddressReferences('tankprofi_stations', duplicateIds, canonicalAddress.addressId);
    priceRefsUpdated += await updateAddressReferences('tankprofi_prices', duplicateIds, canonicalAddress.addressId);
    directoryRefsUpdated += await updateAddressReferences('fuel_city_station_prices', duplicateIds, canonicalAddress.addressId);
    directoryRefsUpdated += await updateAddressReferences('autobahn_station_directory', duplicateIds, canonicalAddress.addressId);
    directoryRefsUpdated += await updateAddressReferences('autohof_station_directory', duplicateIds, canonicalAddress.addressId);

    for (let index = 0; index < duplicateEntries.length; index += 400) {
      const batch = db.batch();
      duplicateEntries.slice(index, index + 400).forEach((entry) => {
        batch.delete(entry.doc.ref);
        addressesDeleted += 1;
      });
      await batch.commit();
    }
    groupsMerged += 1;
  }

  return {
    scanned: snapshot.size,
    groupsMerged,
    addressesDeleted,
    stationRefsUpdated,
    priceRefsUpdated,
    directoryRefsUpdated,
  };
}

async function handleAddressConsolidate(req, res) {
  if (!['POST', 'GET'].includes(req.method)) return sendJson(res, { error: 'Method not allowed.' }, 405);
  const limit = Math.round(numberParam(req.query.limit || req.body?.limit, 500, 1, 10000));
  const mergeDuplicates = String(req.query.mergeDuplicates || req.body?.mergeDuplicates || '1') !== '0';
  const collections = [
    'fuel_city_station_prices',
    'autobahn_station_directory',
    'autohof_station_directory',
  ];
  const results = [];
  for (const collectionName of collections) {
    results.push(await consolidateAddressCollection(collectionName, Math.min(limit, 500)));
  }
  const duplicateMerge = mergeDuplicates ? await consolidateDuplicateAddresses(limit) : null;
  return sendJson(res, {
    status: 'completed',
    canonicalCollection: 'tankprofi_addresses',
    results,
    duplicateMerge,
  });
}

export const api = onRequest({
  region: 'europe-west3',
  secrets: [tankerkoenigApiKey],
  invoker: 'public',
  cors: false,
  timeoutSeconds: 540,
  memory: '1GiB',
}, async (req, res) => {
  try {
    const endpoint = endpointFrom(req);
    if (endpoint === 'geocode') return await handleGeocode(req, res);
    if (endpoint === 'reverse') return await handleReverse(req, res);
    if (endpoint === 'search') return await handleSearch(req, res);
    if (endpoint === 'history') return await handleHistory(req, res);
    if (endpoint === 'citySnapshot') return await handleCitySnapshot(req, res);
    if (endpoint === 'cityStations') return await handleCityStations(req, res);
    if (endpoint === 'cityUpdate') return await handleCityUpdate(req, res);
    if (endpoint === 'scanInit') return await handleScanInit(req, res);
    if (endpoint === 'scanProcess') return await handleScanProcess(req, res);
    if (endpoint === 'adminStats') return await handleAdminStats(req, res);
    if (endpoint === 'addressExport') return await handleAddressExport(req, res);
    if (endpoint === 'addressConsolidate') return await handleAddressConsolidate(req, res);
    if (endpoint === 'chargingImport') return await handleChargingImport(req, res);
    if (endpoint === 'chargingCleanup') return await handleChargingCleanup(req, res);
    if (endpoint === 'chargingStations') return await handleChargingStations(req, res);
    if (endpoint === 'autobahnImport') return await handleAutobahnImport(req, res);
    if (endpoint === 'autobahnPriceRefresh') return await handleAutobahnPriceRefresh(req, res);
    if (endpoint === 'autobahnStations') return await handleAutobahnStations(req, res);
    if (endpoint === 'routeTankpoints') return await handleRouteTankpoints(req, res);
    if (endpoint === 'autohofImport') return await handleAutohofImport(req, res);
    if (endpoint === 'autohofTankerkoenigImport') return await handleAutohofTankerkoenigImport(req, res);
    if (endpoint === 'tankIdMatch') return await handleTankIdMatch(req, res);
    if (endpoint === 'tankIdCandidates') return await handleTankIdCandidates(req, res);
    if (endpoint === 'autohofStations') return await handleAutohofStations(req, res);
    return sendJson(res, { error: 'Unknown API endpoint.' }, 404);
  } catch (error) {
    return sendJson(res, { error: error.message || 'Server error.' }, 500);
  }
});

export const updateCityAveragePrices = onSchedule({
  region: 'europe-west3',
  schedule: 'every 60 minutes',
  timeZone: 'Europe/Berlin',
  secrets: [tankerkoenigApiKey],
  timeoutSeconds: 540,
  memory: '512MiB',
}, async () => {
  await runCityAverageUpdate({ force: false });
});

export const processTankprofiScanQueue = onSchedule({
  region: 'europe-west3',
  schedule: 'every 15 minutes',
  timeZone: 'Europe/Berlin',
  secrets: [tankerkoenigApiKey],
  timeoutSeconds: 540,
  memory: '512MiB',
}, async () => {
  await processTankprofiScanCells({ country: 'DE', source: 'tankkoenig', limit: 25, retryErrors: true });
});

export const refreshAutobahnPrices = onSchedule({
  region: 'europe-west3',
  schedule: 'every 15 minutes',
  timeZone: 'Europe/Berlin',
  secrets: [tankerkoenigApiKey],
  timeoutSeconds: 540,
  memory: '512MiB',
}, async () => {
  await runAutobahnPriceRefresh({ force: false });
});

export const cityAverageUpdateRequest = onDocumentCreated({
  region: 'europe-west3',
  document: 'fuel_city_update_requests/{requestId}',
  secrets: [tankerkoenigApiKey],
  timeoutSeconds: 540,
  memory: '512MiB',
}, async (event) => {
  const ref = event.data?.ref;
  const data = event.data?.data() || {};
  if (!ref) return;

  await ref.set({
    status: 'running',
    startedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  try {
    const result = await runCityAverageUpdate({ force: data.force === true, requestRef: ref });
    await ref.set({
      status: result.status || (result.started === false ? 'skipped' : 'completed'),
      completedAt: FieldValue.serverTimestamp(),
      result,
    }, { merge: true });
  } catch (error) {
    await ref.set({
      status: 'failed',
      completedAt: FieldValue.serverTimestamp(),
      errorMessage: error.message || 'Update failed.',
    }, { merge: true });
    throw error;
  }
});
