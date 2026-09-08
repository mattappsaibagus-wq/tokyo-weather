// Tokyo Weather — Service Worker
// Caches the app shell for offline use; always fetches fresh weather data from the network.

const CACHE_NAME = 'tokyo-weather-v1';

// App shell assets to cache on install
const SHELL_ASSETS = [
  '/tokyo-weather/',
  '/tokyo-weather/index.html',
  '/tokyo-weather/manifest.json',
  'https://fonts.googleapis.com/css2?family=Sora:wght@200;300;400;600;700&family=Outfit:wght@200;300;400;500&display=swap',
];

// Install: cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Weather API calls → network only (always need fresh data)
// - Google Fonts → cache first, network fallback
// - Everything else → network first, cache fallback (offline shell)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Weather API — always network, never cache
  if (url.hostname === 'api.open-meteo.com') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Google Fonts — cache first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
      )
    );
    return;
  }

  // App shell — network first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
