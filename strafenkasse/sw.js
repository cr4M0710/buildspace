/* Service Worker – Strafenkasse HSG Wettenberg M2
   Strategie: network-first für gleiche Herkunft (immer aktuell online, offline aus Cache).
   Fremd-Herkunft (z. B. Supabase-API) wird nicht angefasst. */
const CACHE = 'strafenkasse-v2';

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Supabase & Co. -> direkt ins Netz

  event.respondWith((async () => {
    try {
      const net = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, net.clone());
      return net;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const seite = await caches.match('index.html') || await caches.match('strafenkasse.html') || await caches.match('./');
        if (seite) return seite;
      }
      throw err;
    }
  })());
});
