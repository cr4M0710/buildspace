/* Service Worker – Anwurf (HSG Wettenberg)
   network-first für die eigene Seite: online immer aktuell, offline aus dem Cache.
   Die Spieldaten (data.json, auch von raw.githubusercontent.com) lädt die App
   selbst mit cache:"no-store" und merkt sich die letzte Version im localStorage. */
const CACHE = 'anwurf-v4';
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('anwurf-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/data.json') || url.pathname.endsWith('/state.json')) return;
  event.respondWith((async () => {
    try {
      const net = await fetch(req);
      if (net.ok) (await caches.open(CACHE)).put(req, net.clone());
      return net;
    } catch (err) {
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;
      if (req.mode === 'navigate') { const page = await caches.match('index.html') || await caches.match('./'); if (page) return page; }
      throw err;
    }
  })());
});
