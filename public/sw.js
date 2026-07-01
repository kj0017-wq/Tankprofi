const CACHE_NAME = 'tankprofi-shell-v484';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/assets/css/app.css',
  '/assets/js/app.js',
  '/assets/js/firebase-app.js',
  '/assets/img/tankprofi-splash-popart.png',
  '/assets/img/tankprofi-home-icon.png',
  '/assets/img/tankprofi-electric-icon.svg',
  '/assets/img/star-logo.webp',
  '/assets/img/shell-logo.webp',
  '/assets/img/total-logo.webp',
  '/assets/img/eni-logo.webp',
  '/assets/img/aral-logo.webp',
  '/assets/img/avia-logo.webp',
  '/assets/img/avex-logo.webp',
  '/assets/img/westphal-logo.webp',
  '/assets/img/freie-logo.webp',
  '/assets/img/bp-logo.webp',
  '/assets/img/bft-logo.webp',
  '/assets/img/hoyer-logo.webp',
  '/assets/img/honsel-logo.webp',
  '/assets/img/raiffeisen-logo.webp',
  '/assets/img/svg-logo.webp',
  '/assets/img/q1-logo.webp',
  '/assets/img/a1-logo.webp',
  '/assets/img/tamoil-logo.webp',
  '/assets/img/orlen-logo.webp',
  '/assets/img/oil-logo.webp',
  '/assets/img/sb-tank-logo.webp',
  '/assets/img/markant-logo.webp',
  '/assets/img/access-logo.webp',
  '/assets/img/v-markt-logo.webp',
  '/assets/img/elan-logo.webp',
  '/assets/img/bk-logo.webp',
  '/assets/img/allguth-logo.webp',
  '/assets/img/esso-logo.webp',
  '/assets/img/jet-logo.webp',
  '/assets/img/bavaria-petrol-logo.webp',
  '/assets/img/sprint-logo.webp',
  '/assets/img/seitz-martin-logo.webp',
  '/assets/img/sued-treibstoff-logo.webp',
  '/assets/img/reitmayr-logo.webp',
  '/assets/img/baywa-logo.webp',
  '/assets/img/hem-logo.webp',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
