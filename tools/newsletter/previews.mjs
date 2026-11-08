#!/usr/bin/env node
/* Vorschaubilder für den Newsletter
   ---------------------------------
   Macht von jeder Tool-Seite aus posts-data.js einen Screenshot (so, wie die
   Seite beim Öffnen aussieht) und legt ihn als JPEG in
   assets/newsletter/previews/ ab. index.json merkt sich je Seite einen
   Fingerabdruck der HTML-Datei – neu fotografiert wird nur, was neu ist oder
   sich geändert hat.

   Läuft automatisch als GitHub Action (.github/workflows/vorschaubilder.yml).
   Lokal:  node tools/newsletter/previews.mjs          (nur Neues/Geändertes)
           node tools/newsletter/previews.mjs --all    (alles neu)
           node tools/newsletter/previews.mjs bruch-werkstatt.html   (nur diese Seite)
   Braucht Playwright (npm i playwright && npx playwright install chromium). */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import vm from "node:vm";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const outDir = path.join(root, "assets/newsletter/previews");
const manifestFile = path.join(outDir, "index.json");
const args = process.argv.slice(2);
const ALL = args.includes("--all");
const only = args.filter((a) => !a.startsWith("--"));

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch (e) { ({ chromium } = require("/opt/npm-tools/node_modules/playwright")); }

/* ---------- Seiten aus posts-data.js ---------- */
const posts = vm.runInNewContext(fs.readFileSync(path.join(root, "posts-data.js"), "utf8") + ";posts");
const pages = [];
const seen = new Set();
for (const p of posts) {
  if (!p || !p.url || p.gate || /^https?:/i.test(p.url)) continue;
  const pagePath = p.url.replace(/^\.?\//, "").replace(/[?#].*$/, "");
  if (!pagePath || seen.has(pagePath)) continue;
  seen.add(pagePath);
  const file = pagePath.endsWith("/") ? pagePath + "index.html" : pagePath;
  if (!fs.existsSync(path.join(root, file))) continue;
  pages.push({ pagePath, url: p.url.replace(/^\.?\//, ""), file, title: p.title });
}

const slug = (p) => p.replace(/\/index\.html$|\.html$|\/$/g, "").replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "start";
const md5 = (s) => crypto.createHash("md5").update(s).digest("hex");

let manifest = {};
try { manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")); } catch (e) {}
fs.mkdirSync(outDir, { recursive: true });

const todo = pages.filter((pg) => {
  if (only.length) return only.includes(pg.pagePath) || only.includes(pg.file);
  const h = md5(fs.readFileSync(path.join(root, pg.file)));
  const m = manifest[pg.pagePath];
  return ALL || !m || m.hash !== h || !fs.existsSync(path.join(outDir, m.file));
});

/* ---------- kleiner Webserver für das Repo ---------- */
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml",
  ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".webp": "image/webp", ".gif": "image/gif", ".mp4": "video/mp4" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let f = path.join(root, p);
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end("404"); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f).toLowerCase()] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port + "/";

/* ---------- Screenshots ---------- */
console.log(`${todo.length} von ${pages.length} Seiten werden fotografiert.`);
const browser = await chromium.launch();
let done = 0, failed = 0;
for (const pg of todo) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 750 }, deviceScaleFactor: 1, locale: "de-DE", colorScheme: "light" });
  const tourKey = "bs-tour:" + (pg.file.split("/").pop() === "index.html" && pg.pagePath.endsWith("/") ? "index" : pg.file.split("/").pop());
  await ctx.addInitScript((key) => {
    try {
      localStorage.setItem("buildspace_access_v1", "full");   // kein Anmelde-Fenster auf dem Bild
      localStorage.setItem(key, "1");                          // Einführungs-Tour nicht starten
    } catch (e) {}
  }, tourKey);
  const page = await ctx.newPage();
  try {
    await page.goto(base + pg.url, { waitUntil: "load", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(2500);
    // Schwebende buildspace-Knöpfe (Zurück, QR-Aushang, Freigabe, Feedback, Tour-„?“) gehören nicht aufs Bild
    await page.addStyleTag({ content: "*{caret-color:transparent!important} ::-webkit-scrollbar{display:none}" +
      "#protect-back-link,#protect-poster-btn,#protect-share-btn,.protect-feedback-widget,#protect-ui-handle,.protect-highscore-btn," +
      ".protect-update-banner,.protect-install-banner,#protect-legal,[data-tour-btn]{display:none!important}" }).catch(() => {});
    await page.waitForTimeout(150);
    const file = slug(pg.pagePath) + ".jpg";
    await page.screenshot({ path: path.join(outDir, file), type: "jpeg", quality: 72 });
    manifest[pg.pagePath] = { file, hash: md5(fs.readFileSync(path.join(root, pg.file))), v: Date.now().toString(36) };
    done++;
    console.log("  ✓ " + pg.pagePath);
  } catch (e) {
    failed++;
    console.log("  ✗ " + pg.pagePath + " – " + e.message.split("\n")[0]);
  }
  await ctx.close();
}
await browser.close();
server.close();

/* Einträge zu Seiten, die es nicht mehr gibt, entfernen */
for (const k of Object.keys(manifest)) {
  if (!seen.has(k)) {
    try { fs.unlinkSync(path.join(outDir, manifest[k].file)); } catch (e) {}
    delete manifest[k];
  }
}
const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
fs.writeFileSync(manifestFile, JSON.stringify(sorted, null, 1) + "\n");
console.log(`Fertig: ${done} neu, ${failed} fehlgeschlagen, ${Object.keys(sorted).length} Vorschaubilder insgesamt.`);
