import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';

initializeApp();

const db = getFirestore();
const tankerkoenigApiKey = defineSecret('TANKERKOENIG_API_KEY');
const allowedFuels = new Set(['e10', 'e5', 'diesel']);

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
  return '';
}

function normalizeStation(station, fuel) {
  const price = Number(station.price);
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
    is_open: Boolean(station.isOpen),
    fuel_type: fuel,
    price: Number.isFinite(price) ? price : null,
    last_update: new Date().toISOString(),
  };
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
  const searchText = String(req.query.q || '').trim();

  const upstream = new URL('https://creativecommons.tankerkoenig.de/json/list.php');
  upstream.search = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    rad: String(radius),
    sort: 'price',
    type: fuel,
    apikey: tankerkoenigKey(),
  }).toString();

  const response = await fetch(upstream, { headers: { accept: 'application/json' } });
  const data = await response.json();
  if (!response.ok || data.ok !== true) {
    return sendJson(res, { error: data.message || 'Tankerkoenig request failed.' }, 502);
  }

  let stations = (data.stations || []).map((station) => normalizeStation(station, fuel));
  if (onlyOpen) stations = stations.filter((station) => station.is_open);
  if (onlyPriced) stations = stations.filter((station) => station.price !== null);
  stations.sort((a, b) => (a.price ?? Number.MAX_VALUE) - (b.price ?? Number.MAX_VALUE) || a.distance - b.distance);
  stations = stations.slice(0, limit);

  try {
    await rememberSearch({ searchText, lat, lng, radius, fuel, resultCount: stations.length });
    await rememberStations(stations);
  } catch (error) {
    console.warn('Price archive skipped:', error.message);
  }

  return sendJson(res, {
    fuel,
    count: stations.length,
    updated_at: new Date().toISOString(),
    stations,
  });
}

async function handleHistory(req, res) {
  const tankerkoenigId = String(req.query.tankerkoenig_id || '').trim();
  const fuel = fuelParam(req.query.fuel);
  if (!tankerkoenigId) return sendJson(res, { items: [] });

  const snapshot = await db
    .collection('stations')
    .doc(tankerkoenigId)
    .collection('price_history')
    .where('fuel_type', '==', fuel)
    .orderBy('recorded_at', 'desc')
    .limit(200)
    .get();

  const items = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      fuel_type: data.fuel_type,
      price: data.price,
      recorded_at: data.recorded_at?.toDate?.().toISOString() || null,
    };
  });

  return sendJson(res, { items });
}

async function rememberSearch({ searchText, lat, lng, radius, fuel, resultCount }) {
  await db.collection('searches').add({
    searched_at: FieldValue.serverTimestamp(),
    search_text: searchText || null,
    lat,
    lng,
    radius_km: radius,
    fuel_type: fuel,
    result_count: resultCount,
  });
}

async function rememberStations(stations) {
  await Promise.all(stations.map(async (station) => {
    if (!station.tankerkoenig_id) return;

    const stationRef = db.collection('stations').doc(station.tankerkoenig_id);
    const stationSnapshot = await stationRef.get();
    const stationData = {
      tankerkoenig_id: station.tankerkoenig_id,
      name: station.name,
      brand: station.brand,
      street: station.street,
      house_number: station.house_number,
      postcode: station.postcode,
      city: station.city,
      lat: station.lat,
      lng: station.lng,
      last_seen: FieldValue.serverTimestamp(),
    };

    if (!stationSnapshot.exists) {
      stationData.first_seen = FieldValue.serverTimestamp();
    }

    await stationRef.set(stationData, { merge: true });

    if (station.price === null) return;

    const lastPrice = await stationRef
      .collection('price_history')
      .where('fuel_type', '==', station.fuel_type)
      .orderBy('recorded_at', 'desc')
      .limit(1)
      .get();

    const last = lastPrice.docs[0]?.data();
    if (last && Math.abs(Number(last.price) - station.price) < 0.001) return;

    await stationRef.collection('price_history').add({
      fuel_type: station.fuel_type,
      price: station.price,
      recorded_at: Timestamp.now(),
    });
  }));
}

export const api = onRequest({
  region: 'europe-west3',
  secrets: [tankerkoenigApiKey],
  invoker: 'public',
  cors: false,
  timeoutSeconds: 30,
  memory: '256MiB',
}, async (req, res) => {
  try {
    const endpoint = endpointFrom(req);
    if (endpoint === 'geocode') return await handleGeocode(req, res);
    if (endpoint === 'reverse') return await handleReverse(req, res);
    if (endpoint === 'search') return await handleSearch(req, res);
    if (endpoint === 'history') return await handleHistory(req, res);
    return sendJson(res, { error: 'Unknown API endpoint.' }, 404);
  } catch (error) {
    return sendJson(res, { error: error.message || 'Server error.' }, 500);
  }
});
