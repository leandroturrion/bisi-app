const CACHE_NAME = 'bisi-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/data_trenes.js',
  '/js/rutas.js',
  '/js/app.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignoramos peticiones a APIs externas (Nominatim, Photon, OSRM, Clima) para no cachear datos viejos
  if (event.request.url.includes('photon.komoot.io') || 
      event.request.url.includes('open-meteo.com') || 
      event.request.url.includes('project-osrm.org') ||
      event.request.url.includes('openstreetmap.org') ||
      event.request.url.includes('cartocdn.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});