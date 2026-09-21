/* Service Worker – buildspace (Marc Stroh)
   Strategie: network-first für gleiche Herkunft (immer aktuell online,
   offline aus Cache) — dieselbe bewährte Strategie wie schon bei
   strafenkasse/sw.js. Der App-Shell (Startseite, Styles, Skripte, Icons)
   wird beim Installieren einmal vorab gecacht, damit buildspace auch
   beim allerersten Offline-Aufruf funktioniert (z. B. nach dem
   Hinzufügen zum iPad-Homescreen, siehe site.webmanifest). Die
   einzelnen Spiel-/Tool-Seiten werden automatisch mitgecacht, sobald sie
   einmal online besucht wurden. Fremd-Herkunft (z. B. das PeerJS-CDN im
   Wizard-Kartenspiel) wird nicht angefasst — die geht immer direkt ins
   Netz, ganz ohne Cache. */
const CACHE = 'buildspace-v1';
const SHELL = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'posts-data.js',
  'protect.js',
  'cursor.js',
  'qrcode-generator.js',
  'site.webmanifest',
  'assets/favicon.svg',
  'assets/icon-180.png',
  'assets/icon-192.png',
  'assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL);
    } catch (err) {
      /* Ein einzelner nicht erreichbarer Shell-Pfad soll die Installation
         nicht komplett scheitern lassen — Laufzeit-Caching (siehe unten)
         holt fehlende Dateien beim ersten Online-Besuch ohnehin nach. */
    }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // externe CDNs -> direkt ins Netz

  event.respondWith((async () => {
    try {
      // { cache: 'no-store' } zwingt den Browser, wirklich ins Netz zu gehen,
      // statt eine evtl. noch "frische" (Cache-Control: max-age) Kopie aus
      // seinem eigenen HTTP-Cache zurückzugeben — sonst konnte ein frisches
      // Deployment bis zu 10 Minuten lang unbemerkt alte Dateien ausliefern,
      // obwohl diese Strategie eigentlich "network-first" sein soll.
      const net = await fetch(req, { cache: "no-store" });
      const cache = await caches.open(CACHE);
      cache.put(req, net.clone());
      return net;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const shell = (await caches.match('index.html')) || (await caches.match('./'));
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
