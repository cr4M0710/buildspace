/* Service Worker – Cockpit (buildspace)
   network-first für gleiche Herkunft: online immer aktuell, offline aus dem Cache.
   Fremde Seiten (IServ, WebUntis, KI-Dienste …) werden nicht angefasst. */
const CACHE = 'cockpit-v16';
const SHELL = ['./', 'index.html', 'bg.jpg', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest', 'cockpit.css', 'cockpit.js', 'ink.js',
  'lib/pdf.min.js', 'lib/pdf.worker.min.js', 'lib/jspdf.umd.min.js'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('cockpit-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !url.pathname.includes('/cockpit/')) return;
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
        const page = await caches.match('index.html') || await caches.match('./');
        if (page) return page;
      }
      throw err;
    }
  })());
});
