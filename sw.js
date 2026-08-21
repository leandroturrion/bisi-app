const CACHE_NAME = 'bisi-v4';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (
    event.request.url.includes('photon.komoot.io') ||
    event.request.url.includes('open-meteo.com') ||
    event.request.url.includes('project-osrm.org') ||
    event.request.url.includes('openstreetmap.org') ||
    event.request.url.includes('cartocdn.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});