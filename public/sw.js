// Weather Intelligence — Service Worker
const CACHE = 'weather-iq-v1';
const PRECACHE = ['/', '/src/main.tsx'];

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: always try live data, fall back to cache for shell
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never cache API calls or Windy/YouTube iframes
  if (url.pathname.startsWith('/api') ||
      url.hostname.includes('windy') ||
      url.hostname.includes('youtube') ||
      url.hostname.includes('ngrok')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
