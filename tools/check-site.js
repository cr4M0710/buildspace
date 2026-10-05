#!/usr/bin/env node
/* buildspace – Prüfskript (Link-Prüfer)
   Aufruf:  node tools/check-site.js
   Prüft vor dem Hochladen, ob alle Einträge in posts-data.js zu den
   Dateien passen. Exit-Code 1 bei Fehlern, Warnungen brechen nicht ab.
   Kein Build-Schritt, keine Abhängigkeiten – nur Node. */
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

/* ---------- posts-data.js laden ---------- */
let posts;
try {
  posts = new Function(read("posts-data.js") + "; return posts;")();
} catch (e) {
  console.error("posts-data.js lässt sich nicht laden:", e.message);
  process.exit(1);
}

const CATS = {
  schule: ["mathematik", "arbeitslehre", "faecheruebergreifend", "weiterefaecher", "sonstiges"],
  handball: ["jugend", "maenner1", "maenner2", "hallendienst", "training"],
  freizeit: [null]
};
/* Seiten, die bewusst ohne protect.js laufen */
const NO_PROTECT = ["lernbereich.html"];
/* Seiten, die weder Tool noch Beitrag sind */
/* lernbereich.html läuft bewusst ohne Eintrag/Schutz, escape-room-baukasten.html
   (2D) wurde auf Wunsch aus der Übersicht genommen, bleibt aber erreichbar. */
const NOT_POSTS = ["index.html", "404.html", "lernbereich.html", "escape-room-baukasten.html"];

const protectSrc = read("protect.js");
const vf = /const VERTRETUNG_FILES = \[([\s\S]*?)\];/.exec(protectSrc);
const vertretungFiles = vf ? (vf[1].match(/"([^"]+)"/g) || []).map((s) => s.replace(/"/g, "")) : [];

const seenKey = new Set();
const used = new Set();

posts.forEach((p, i) => {
  const id = `#${i + 1} „${p.title}“`;
  ["title", "excerpt", "date", "category", "url", "titleEn", "excerptEn"].forEach((k) => {
    if (!p[k]) err(`${id}: Feld "${k}" fehlt`);
  });
  if (p.date && !/^\d{4}-\d{2}-\d{2}$/.test(p.date)) err(`${id}: date "${p.date}" ist nicht JJJJ-MM-TT`);
  if (!CATS[p.category]) err(`${id}: unbekannte category "${p.category}"`);
  else {
    const sub = p.subcategory === undefined ? null : p.subcategory;
    if (!CATS[p.category].includes(sub)) err(`${id}: subcategory "${sub}" passt nicht zu category "${p.category}"`);
  }
  const key = p.url + "|" + p.category + "|" + p.subcategory;
  if (seenKey.has(key)) err(`${id}: doppelter Eintrag (gleiche url, category und subcategory)`);
  seenKey.add(key);

  if (/^https?:\/\//i.test(p.url)) {
    if (!/\(Externe Seite/.test(p.excerpt || "")) warn(`${id}: externer Link ohne "(Externe Seite …)" im excerpt`);
    return;
  }
  const file = p.url.split("?")[0];
  used.add(file);
  const full = path.join(root, file);
  if (!fs.existsSync(full)) { err(`${id}: Datei "${file}" existiert nicht`); return; }
  if (/[^a-z0-9\-\/\.]/.test(file)) warn(`${id}: Dateiname "${file}" sollte Kleinbuchstaben/Bindestriche ohne Umlaute nutzen`);

  const html = fs.readFileSync(full, "utf8");
  if (!NO_PROTECT.includes(file) && !/strafenkasse\//.test(file)) {
    const m = /<script[^>]*data-category="([a-z]+)"[^>]*src="protect\.js"[^>]*>|<script[^>]*src="protect\.js"[^>]*data-category="([a-z]+)"[^>]*>/.exec(html);
    if (!m) err(`${id}: ${file} bindet protect.js nicht mit data-category ein (Freigabe für Lernende fehlt)`);
    else if ((m[1] || m[2]) !== (p.gate || p.category)) err(`${id}: data-category "${m[1] || m[2]}" ≠ category "${p.gate || p.category}" in ${file}`);
  }
  const t = /<title>([\s\S]*?)<\/title>/i.exec(html);
  if (!t) err(`${id}: ${file} hat kein <title>`);
  else if (!t[1].trim().toLowerCase().startsWith(p.title.trim().toLowerCase().slice(0, 8))) warn(`${id}: <title> "${t[1].trim()}" weicht vom Beitragstitel ab`);
  if (!/<html[^>]*lang="de"/i.test(html)) warn(`${id}: ${file} hat kein <html lang="de">`);
  if (!/name="viewport"/i.test(html)) err(`${id}: ${file} hat keinen viewport-Meta-Tag (iPad/iPhone)`);
  if (!/property="og:image"/i.test(html) && !/strafenkasse\//.test(file)) warn(`${id}: ${file} hat keine Vorschau-Tags (og:image)`);
  if (/api\.anthropic\.com|sk-ant-/.test(html)) err(`${id}: ${file} enthält einen Claude-API-Aufruf/Schlüssel (gibt es auf GitHub Pages nicht)`);
  if (/window\.storage/.test(html) && !/localStorage/.test(html)) err(`${id}: ${file} nutzt window.storage ohne localStorage-Ersatz (gibt es auf GitHub Pages nicht)`);
  (html.match(/https:\/\/[^"'\s)]+\.(?:js|css)/g) || []).forEach((u) => {
    if (/@latest|\/latest\//.test(u)) warn(`${id}: ${file} nutzt unversionierte Bibliothek ${u}`);
  });

  const tagged = (p.tags || []).includes("vertretung");
  const listed = vertretungFiles.includes(file);
  if (tagged && !listed) err(`${id}: Tag "vertretung", aber ${file} fehlt in VERTRETUNG_FILES (protect.js)`);
  if (!tagged && listed) err(`${id}: ${file} steht in VERTRETUNG_FILES, aber der Eintrag hat kein Tag "vertretung"`);
});

/* ---------- Dateien ohne Eintrag ---------- */
fs.readdirSync(root).filter((f) => f.endsWith(".html")).forEach((f) => {
  if (!used.has(f) && !NOT_POSTS.includes(f)) warn(`${f} hat keinen Eintrag in posts-data.js (erreichbar nur per direktem Link)`);
});

/* ---------- Service Worker ---------- */
const sw = read("sw.js");
const shell = /const SHELL = \[([\s\S]*?)\];/.exec(sw);
if (shell) {
  (shell[1].match(/'([^']+)'/g) || []).map((s) => s.replace(/'/g, "")).forEach((f) => {
    if (f !== "./" && !fs.existsSync(path.join(root, f))) err(`sw.js: SHELL-Datei "${f}" existiert nicht`);
  });
}
if (!/importScripts\('posts-data\.js'\)/.test(sw)) warn("sw.js lädt posts-data.js nicht — neue Tools werden nicht vorab gecacht");

/* ---------- index.html: Pflicht-Dateien ---------- */
const index = read("index.html");
["style.css", "posts-data.js", "app.js", "protect.js"].forEach((f) => {
  if (!index.includes(f)) err(`index.html bindet ${f} nicht ein`);
  if (!fs.existsSync(path.join(root, f))) err(`${f} fehlt`);
});

/* ---------- Ausgabe ---------- */
const unique = new Set(posts.map((p) => p.url));
console.log(`Geprüft: ${posts.length} Einträge, ${unique.size} verschiedene Seiten.`);
if (warnings.length) { console.log(`\n${warnings.length} Hinweis(e):`); warnings.forEach((w) => console.log("  ! " + w)); }
if (errors.length) { console.log(`\n${errors.length} FEHLER:`); errors.forEach((e) => console.log("  ✗ " + e)); process.exit(1); }
console.log("\nAlles in Ordnung ✓");
