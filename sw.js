/* Service Worker – buildspace (Marc Stroh)
   Strategie: network-first für gleiche Herkunft (immer aktuell online,
   offline aus Cache) — dieselbe bewährte Strategie wie schon bei
   strafenkasse/sw.js. Der App-Shell (Startseite, Styles, Skripte, Icons)
   wird beim Installieren einmal vorab gecacht, damit buildspace auch
   beim allerersten Offline-Aufruf funktioniert (z. B. nach dem
   Hinzufügen zum iPad-Homescreen, siehe buildspace-v3.webmanifest). Die
   einzelnen Spiel-/Tool-Seiten werden automatisch mitgecacht, sobald sie
   einmal online besucht wurden. Fremd-Herkunft (z. B. das PeerJS-CDN im
   Wizard-Kartenspiel) wird nicht angefasst — die geht immer direkt ins
   Netz, ganz ohne Cache. */
const CACHE = 'buildspace-v13';
/* Bibliotheken von Fremd-Servern (three.js, PeerJS, QR, Schriften) landen in
   einem eigenen Cache, der Versions-Wechsel überlebt — sie sind fest
   versioniert und ändern sich nicht. */
const CDN_CACHE = 'buildspace-cdn-v1';
const CDN_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com', 'unpkg.com'];

/* Alle Tool-Seiten aus posts-data.js werden nach der Installation im
   Hintergrund mitgecacht — so sind auch neu eingestellte Tools ohne
   Internet nutzbar, ohne dass hier etwas von Hand ergänzt werden muss. */
try { importScripts('posts-data.js'); } catch (e) { /* ohne Liste nur Shell + Laufzeit-Cache */ }
function postFiles() {
  try {
    const seen = new Set();
    return posts
      .map((p) => String(p.url || '').split('?')[0])
      .filter((u) => u && !/^https?:/i.test(u) && !seen.has(u) && (seen.add(u), true));
  } catch (e) { return []; }
}
const SHELL = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'posts-data.js',
  'protect.js',
  'cursor.js',
  'hero-draw.js',
  'space.js',
  'stars.js',
  'micro.js',
  '404.html',
  'impressum.html',
  'datenschutz.html',
  'qrcode-generator.js',
  'buildspace-v3.webmanifest',
  'assets/favicon.svg',
  'assets/icon-v3-180.png',
  'assets/icon-v3-192.png',
  'assets/icon-v3-512.png',
  'assets/bg-nacht.jpg',
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

/* Holt alle Tool-Seiten (3 gleichzeitig, schon vorhandene werden
   übersprungen) und die dort eingebundenen CDN-Bibliotheken. Einzelne
   Fehlschläge (schwaches WLAN) sind unkritisch — das Laufzeit-Caching holt
   Fehlendes beim nächsten Online-Besuch nach. */
async function precachePosts() {
  const cache = await caches.open(CACHE);
  const cdn = await caches.open(CDN_CACHE);
  const libs = new Set();
  const files = postFiles().filter((f) => !SHELL.includes(f));
  let i = 0;
  async function worker() {
    while (i < files.length) {
      const f = files[i++];
      try {
        let res = await cache.match(f);
        if (!res) {
          res = await fetch(new Request(f, { cache: 'no-store' }));
          if (res && res.ok) await cache.put(f, res.clone());
        }
        if (res && res.ok) {
          const html = await res.clone().text();
          const re = /<(?:script|link)[^>]+(?:src|href)=["'](https:\/\/[^"']+)["']/gi;
          let m;
          while ((m = re.exec(html))) {
            try { if (CDN_HOSTS.includes(new URL(m[1]).hostname)) libs.add(m[1]); } catch (e) {}
          }
        }
      } catch (err) { /* ignorieren */ }
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  for (const url of libs) {
    try {
      if (await cdn.match(url)) continue;
      const r = await fetch(url, { mode: url.includes('fonts.googleapis') ? 'cors' : 'no-cors' });
      await cdn.put(url, r);
    } catch (err) { /* ignorieren */ }
  }
}

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE && k !== CDN_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
    precachePosts().catch(() => {});
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) {
    // Feste CDN-Bibliotheken: Cache zuerst, im Hintergrund auffrischen.
    if (CDN_HOSTS.includes(url.hostname)) {
      event.respondWith((async () => {
        const cache = await caches.open(CDN_CACHE);
        const hit = await cache.match(req);
        const refresh = fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => null);
        if (hit) { refresh.catch(() => {}); return hit; }
        const res = await refresh;
        if (res) return res;
        return Response.error();
      })());
    }
    return; // alles andere: direkt ins Netz
  }

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
