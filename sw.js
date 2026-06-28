const CACHE_NAME = 'bella-italia-pwa-v2';

// Diese Dateien werden sofort beim ersten Laden in den Offline-Speicher geladen
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  // Externe Libraries (Tailwind, FontAwesome, Leaflet) werden gecacht
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching App Shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  // Erzwingt, dass der Service Worker sofort aktiv wird (ohne Wartezeit)
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Ignoriere Live-Kartenkacheln von Leaflet für den permanenten Cache, 
  // da diese dynamisch sind und den Cache zumüllen würden.
  if (requestUrl.hostname.includes('tile.openstreetmap.org')) {
    return;
  }

  // Strategie: Network First, Fallback to Cache
  // Die App versucht immer, die aktuellste Version aus dem Internet zu laden.
  // Wenn du offline bist (Flugmodus), wird die App aus dem Cache geladen.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Netzwerk-Response klonen und im Cache speichern (fürs nächste Mal offline)
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Keine Internetverbindung -> Lade aus dem Offline-Cache
        console.log('[Service Worker] Offline Modus aktiv. Lade aus Cache:', event.request.url);
        return caches.match(event.request);
      })
  );
});