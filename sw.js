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
const CACHE = 'buildspace-v2';
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
  'assets/icon-512.png',
  /* Die neun Vertretungsstunden-Werkzeuge (Tag "vertretung" in
     posts-data.js, siehe auch VERTRETUNG_FILES in protect.js) werden
     hier mit vorab gecacht, damit "kein Internet nötig" auch beim
     allerersten Öffnen stimmt — nicht erst, nachdem jedes Tool einmal
     online besucht wurde. */
  'minigolf-winkel.html',
  'zahlen-werkstatt.html',
  'bruch-quiz-fussball.html',
  'prozent-rennen.html',
  'gleichungs-duell.html',
  'flaechen-fuchs.html',
  'zahlen-detektiv.html',
  'kopfrechen-quiz.html',
  'mathe-fussball.html',
  'vertretung/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    /* Wichtig: NICHT cache.addAll(SHELL) verwenden. addAll() ist
       alles-oder-nichts -- schlägt bei schwachem Schul-WLAN eine EINZIGE
       Datei fehl (z. B. ein größeres Icon oder eine der neun
       Vertretungsstunden-Seiten), verwirft der Browser stillschweigend
       ALLE bereits erfolgreich geladenen Dateien, inklusive so kleiner,
       kritischer Dateien wie qrcode-generator.js. Genau das konnte dazu
       führen, dass der QR-Code später dauerhaft nicht mehr angezeigt
       wurde, obwohl das eigentliche Problem nur eine einzelne, für die
       QR-Anzeige irrelevante Datei betraf. Stattdessen wird hier jede
       Datei einzeln geholt: Ein Fehlschlag betrifft dann nur diese eine
       Datei, alle anderen werden trotzdem zwischengespeichert. */
    await Promise.allSettled(
      SHELL.map(async (path) => {
        try {
          const req = new Request(path, { cache: 'no-store' });
          const res = await fetch(req);
          if (res && res.ok) await cache.put(path, res);
        } catch (err) {
          /* Einzelne fehlende/unerreichbare Datei -- kein Grund, die
             Installation oder das Caching der übrigen Dateien
             abzubrechen. Laufzeit-Caching (siehe fetch-Handler unten)
             holt sie beim nächsten erfolgreichen Online-Besuch nach. */
        }
      })
    );
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
