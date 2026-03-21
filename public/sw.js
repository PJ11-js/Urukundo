const CACHE_NAME = 'urukundo-v2';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Ne pas cacher — toujours fetch depuis le réseau
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
