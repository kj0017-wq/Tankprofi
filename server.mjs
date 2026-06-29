import http from 'node:http';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');
const apiKey = process.env.TANKERKOENIG_API_KEY || readLocalSecret();
const port = Number(process.env.PORT || 8080);

function readLocalSecret() {
  const secretPath = path.join(root, 'functions', '.secret.local');
  if (!existsSync(secretPath)) return '';
  const content = readFileSync(secretPath, 'utf8');
  const match = content.match(/^TANKERKOENIG_API_KEY=(.+)$/m);
  return match ? match[1].trim() : '';
}

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function sendJson(res, payload, status = 200) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
}

function normalizeFuel(fuel) {
  return ['e10', 'e5', 'diesel'].includes(fuel) ? fuel : 'e10';
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
    is_open: station.isOpen === true ? true : station.isOpen === false ? false : null,
    fuel_type: fuel,
    price: Number.isFinite(price) ? price : null,
    last_update: new Date().toISOString(),
  };
}

async function readJsonResponse(response, sourceName) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    const preview = text.slice(0, 280).replace(/\s+/g, ' ').trim();
    const isRateLimit = /rate limit/i.test(preview);
    const message = isRateLimit
      ? `${sourceName} Rate-Limit erreicht. Bitte kurz warten und gespeicherte Preise nutzen.`
      : `${sourceName} liefert keine JSON-Daten. HTTP ${response.status}: ${preview || response.statusText}`;
    const error = new Error(message);
    error.status = isRateLimit ? 429 : (response.status >= 400 ? response.status : 502);
    throw error;
  }
}

async function handleGeocode(url, res) {
  const query = String(url.searchParams.get('q') || '').trim();
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
      'user-agent': 'Tankprofi/1.0 (local-dev)',
    },
  });
  const data = await readJsonResponse(response, 'Nominatim');
  const items = data.map((item) => ({
    label: String(item.display_name || ''),
    lat: Number(item.lat || 0),
    lng: Number(item.lon || 0),
    type: String(item.type || ''),
  }));
  sendJson(res, { items });
}

async function handleSearch(url, res) {
  if (!apiKey) {
    return sendJson(res, { error: 'TANKERKOENIG_API_KEY is missing.' }, 500);
  }

  const lat = Number(url.searchParams.get('lat'));
  const lng = Number(url.searchParams.get('lng'));
  const radius = Number(url.searchParams.get('radius') || 5);
  const fuel = normalizeFuel(String(url.searchParams.get('fuel') || 'e10'));
  const limit = Math.min(100, Math.max(5, Number(url.searchParams.get('limit') || 25)));
  const onlyOpen = url.searchParams.get('open') === '1';
  const onlyPriced = url.searchParams.get('priced') !== '0';

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return sendJson(res, { error: 'Invalid coordinates.' }, 422);
  }

  const upstream = new URL('https://creativecommons.tankerkoenig.de/json/list.php');
  upstream.search = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    rad: String(radius),
    sort: 'price',
    type: fuel,
    apikey: apiKey,
  }).toString();

  const response = await fetch(upstream, { headers: { accept: 'application/json' } });
  const data = await readJsonResponse(response, 'Tankerkoenig');
  if (!data.ok) return sendJson(res, { error: data.message || 'Tankerkoenig request failed.' }, 502);

  let stations = data.stations.map((station) => normalizeStation(station, fuel)).slice(0, limit);
  if (onlyOpen) stations = stations.filter((station) => station.is_open);
  if (onlyPriced) stations = stations.filter((station) => station.price !== null);
  stations.sort((a, b) => (a.price ?? Number.MAX_VALUE) - (b.price ?? Number.MAX_VALUE) || a.distance - b.distance);

  sendJson(res, {
    fuel,
    count: stations.length,
    updated_at: new Date().toISOString(),
    stations,
  });
}

async function handleRouteTankpoints(url, res) {
  const route = String(url.searchParams.get('route') || 'ALL').trim() || 'ALL';
  const upstream = new URL('https://tankprofi.web.app/api/route/tankpoints.php');
  upstream.searchParams.set('route', route);
  const response = await fetch(upstream, { headers: { accept: 'application/json' } });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return sendJson(res, { error: 'Route-Tankpunkte lokal nicht als JSON erreichbar.', tankpoints: [] }, 502);
  }
  if (!response.ok || data.error) {
    return sendJson(res, { error: data.error || 'Route-Tankpunkte konnten nicht geladen werden.', tankpoints: [] }, response.status || 502);
  }
  sendJson(res, data);
}

async function proxyProductionApi(req, url, res) {
  const upstream = new URL(`https://tankprofi.web.app${url.pathname}${url.search}`);
  const method = String(req.method || 'GET').toUpperCase();
  const headers = {
    accept: 'application/json',
    'user-agent': 'Tankprofi/1.0 (local-dev-proxy)',
  };
  const options = { method, headers };
  if (!['GET', 'HEAD'].includes(method)) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    if (body.length) {
      options.body = body;
      if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
    }
  }
  const response = await fetch(upstream, options);
  const text = await response.text();
  res.writeHead(response.status, {
    'content-type': response.headers.get('content-type') || 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(text);
}

async function serveStatic(url, res) {
  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(publicDir, requested));
  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath);
  res.writeHead(200, { 'content-type': mime[ext] || 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    if (url.pathname === '/api/geocode.php') return await handleGeocode(url, res);
    if (url.pathname === '/api/search.php') return await handleSearch(url, res);
    if (url.pathname === '/api/route/tankpoints.php') return await handleRouteTankpoints(url, res);
    if (url.pathname === '/api/history.php') return sendJson(res, { items: [] });
    if (url.pathname.startsWith('/api/admin/')) return await proxyProductionApi(req, url, res);
    if (url.pathname === '/api/city-snapshot.php'
      || url.pathname === '/api/city-stations.php'
      || url.pathname === '/api/autobahn/stations.php'
      || url.pathname === '/api/charging/stations.php') {
      return await proxyProductionApi(req, url, res);
    }
    if (url.pathname.startsWith('/api/')) return sendJson(res, { error: `Lokaler API-Endpunkt fehlt: ${url.pathname}` }, 404);
    await serveStatic(url, res);
  } catch (error) {
    sendJson(res, { error: error.message || 'Server error.' }, error.status || 500);
  }
});

server.on('error', (error) => {
  console.error(error);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Tankprofi running at http://127.0.0.1:${port}`);
});
