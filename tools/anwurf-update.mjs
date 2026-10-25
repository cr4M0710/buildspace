// Anwurf – Datenabruf für die Handball-App (HSG Wettenberg Männer 1 + 2)
// Läuft per GitHub Action (.github/workflows/anwurf-daten.yml).
// Holt Spielplan + Tabelle von hessenschau.de, schreibt anwurf/data.json
// und schickt Push-Nachrichten über ntfy.sh (Anwurf, Endstand, Verlegung).
//
// Lokal testen:  node tools/anwurf-update.mjs --dry   (schreibt nichts, sendet nichts)

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DATA_FILE = path.join(ROOT, "anwurf", "data.json");
const STATE_FILE = path.join(ROOT, "anwurf", "state.json");
const DRY = process.argv.includes("--dry");
const NTFY_TOPIC = process.env.NTFY_TOPIC || "";
const APP_URL = "https://buildspaceos.de/anwurf/";

const BASE = "https://www.hessenschau.de/sport/ergebnisse-tabellen/";
const TEAMS = [
  { id: "m1", name: "HSG Wettenberg", short: "Wettenberg", label: "Männer 1", league: "Oberliga Mitte",
    tableName: "Wettenberg", teamUrl: BASE + "handball-126~team_id-1748.html", tableUrl: BASE + "handball-126.html" },
  { id: "m2", name: "HSG Wettenberg II", short: "Wettenberg II", label: "Männer 2", league: "Bezirksoberliga Gießen",
    tableName: "Wettenberg II", teamUrl: BASE + "handball-116~team_id-5634.html", tableUrl: BASE + "handball-116.html" },
];

// ---------- HTML helpers (no dependencies) ----------
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß", ndash: "–", mdash: "—" };
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENT[e] ?? m;
  });
}
function text(html) {
  return decode(html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ").trim();
}
// "Wettenberg (HSG Wettenberg)" -> "Wettenberg"; screen-reader duplicates removed
function shortName(s) {
  s = s.trim();
  const m = /^(.*?)\s*\((.*)\)$/.exec(s);
  return (m ? m[1] : s).replace(/\s+\.\s*$/, ".").trim();
}
function tables(html) {
  const out = [];
  const re = /<table[\s\S]*?<\/table>/gi;
  let m;
  while ((m = re.exec(html))) {
    const t = m[0];
    const head = [...t.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(x => text(x[1]));
    const rows = [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
      .map(r => [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(c => text(c[1])))
      .filter(r => r.length);
    out.push({ head, rows, raw: t });
  }
  return out;
}
async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Anwurf-App; private Vereinsnutzung)", "Accept-Language": "de-DE" } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

// ---------- parsers ----------
const DATE_RE = /(\d{2})\.(\d{2})\.(\d{4})\s*(\d{2}):(\d{2})/;
function parseSchedule(html, team) {
  const t = tables(html).find(t => t.head.some(h => /^ST/.test(h)) && t.head.some(h => /Erg/.test(h)));
  if (!t) throw new Error(`${team.id}: Spielplan-Tabelle nicht gefunden`);
  const iST = t.head.findIndex(h => /^ST/.test(h));
  const iDate = t.head.findIndex(h => /Datum/.test(h));
  const iMatch = t.head.findIndex(h => /Heim/.test(h));
  const iRes = t.head.findIndex(h => /Erg/.test(h));
  const games = [];
  for (const r of t.rows) {
    const round = parseInt(r[iST], 10);
    const dm = DATE_RE.exec(r[iDate] || "");
    const parts = (r[iMatch] || "").split(":");
    if (!round || !dm || parts.length !== 2) continue;
    const home = shortName(parts[0]), away = shortName(parts[1]);
    const iso = `${dm[3]}-${dm[2]}-${dm[1]}T${dm[4]}:${dm[5]}`;
    const isHome = home === team.tableName;
    if (!isHome && away !== team.tableName) { console.warn(`${team.id}: Spiel ohne eigenes Team? ${home} – ${away}`); }
    const sm = /(\d+)\s*:\s*(\d+)/.exec(r[iRes] || "");
    const g = [round, iso, isHome ? "H" : "A", isHome ? away : home];
    if (sm) {
      const h = +sm[1], a = +sm[2];
      g.push(isHome ? h : a, isHome ? a : h);
    }
    games.push(g);
  }
  if (games.length < 10) throw new Error(`${team.id}: nur ${games.length} Spiele erkannt`);
  return games;
}
function parseTable(html, team) {
  const t = tables(html).find(t => t.head.some(h => /Platz/.test(h)));
  if (!t) throw new Error(`${team.id}: Liga-Tabelle nicht gefunden`);
  const idx = name => t.head.findIndex(h => new RegExp("^" + name + "\\b").test(h));
  const iTeam = t.head.findIndex(h => /Verein/.test(h));
  const iSp = idx("Sp"), iS = idx("S"), iU = idx("U"), iN = idx("N");
  const iTore = t.head.findIndex(h => /Tore/.test(h));
  const iP = t.head.findIndex(h => /^P/.test(h) && !/Platz/.test(h));
  const rows = [];
  for (const r of t.rows) {
    const tm = /(\d+)\s*:\s*(\d+)/.exec(r[iTore] || ""), pm = /(\d+)\s*:\s*(\d+)/.exec(r[iP] || "");
    if (!tm || !pm) continue;
    rows.push([shortName(r[iTeam]), +r[iSp], +r[iS], +r[iU], +r[iN], +tm[1], +tm[2], +pm[1], +pm[2]]);
  }
  if (rows.length < 8) throw new Error(`${team.id}: nur ${rows.length} Tabellenzeilen erkannt`);
  if (!rows.some(r => r[0] === team.tableName)) throw new Error(`${team.id}: "${team.tableName}" nicht in der Tabelle`);
  const st = /Stand:\s*(\d{2})\.(\d{2})\.(\d{2,4}),?\s*(\d{2}):(\d{2})/.exec(text(html));
  const asOf = st ? `${st[1]}.${st[2]}.${st[3].length === 2 ? "20" + st[3] : st[3]}` : null;
  return { rows, asOf };
}

// ---------- push ----------
async function push(title, message, tags) {
  console.log(`PUSH: ${title} – ${message}`);
  if (DRY || !NTFY_TOPIC) return;
  try {
    const res = await fetch("https://ntfy.sh/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: NTFY_TOPIC, title, message, tags, click: APP_URL }),
    });
    if (!res.ok) console.warn("ntfy:", res.status, await res.text());
  } catch (e) { console.warn("ntfy fehlgeschlagen:", e.message); }
}

// Berlin local time -> Date (handles CET/CEST)
function berlinDate(iso) {
  const [d, t] = iso.split("T");
  const guess = new Date(`${d}T${t}:00Z`);
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const [hh, mm] = fmt.format(guess).split(":").map(Number);
  const offsetMin = (hh * 60 + mm) - (guess.getUTCHours() * 60 + guess.getUTCMinutes());
  const off = ((offsetMin + 720) % 1440) - 720;
  return new Date(guess.getTime() - off * 60000);
}
const fmtDE = iso => { const [d, t] = iso.split("T"); const [y, m, dd] = d.split("-"); return `${dd}.${m}. ${t} Uhr`; };
const matchup = (team, g) => g[2] === "H" ? `${team.short} – ${g[3]}` : `${g[3]} – ${team.short}`;
const scoreStr = g => g[2] === "H" ? `${g[4]}:${g[5]}` : `${g[5]}:${g[4]}`;

// one game / table row per line keeps the git history readable
const pretty = o => JSON.stringify(o, null, 1).replace(/\[\s+([^\[\]{}]*?)\s+\]/g, (m, a) => "[" + a.replace(/\s*\n\s*/g, " ") + "]");

// ---------- main ----------
async function main() {
  const prev = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) : null;
  const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) : { kickoff: {} };
  const out = { updatedAt: new Date().toISOString(), source: "hessenschau.de", teams: [] };
  const errors = [];

  for (const team of TEAMS) {
    const old = prev?.teams?.find(t => t.id === team.id);
    try {
      const [schedHtml, tableHtml] = await Promise.all([get(team.teamUrl), get(team.tableUrl)]);
      let games, table;
      try { games = parseSchedule(schedHtml, team); }
      catch (e) { console.log(tables(schedHtml).map(t => t.raw.slice(0, 1500)).join("\n----\n")); throw e; }
      try { table = parseTable(tableHtml, team); }
      catch (e) { console.log(tables(tableHtml).map(t => t.raw.slice(0, 1500)).join("\n----\n")); throw e; }
      const { tableUrl, teamUrl, ...meta } = team;
      out.teams.push({ ...meta, asOf: table.asOf || old?.asOf || null, table: table.rows, games });
      console.log(`${team.id}: ${games.length} Spiele, ${games.filter(g => g.length > 4).length} mit Ergebnis, Tabelle ${table.rows.length} Teams (Stand ${table.asOf})`);
    } catch (e) {
      errors.push(`${team.id}: ${e.message}`);
      if (old) out.teams.push(old); // keep last good data
    }
  }
  if (!out.teams.length) throw new Error("Keine Daten: " + errors.join("; "));
  if (errors.length) { out.errors = errors; console.warn("Fehler:", errors); }

  // ---------- notifications ----------
  const now = Date.now();
  for (const team of out.teams) {
    const old = prev?.teams?.find(t => t.id === team.id);
    for (const g of team.games) {
      const key = `${team.id}-${g[0]}`;
      const start = berlinDate(g[1]).getTime();
      // kickoff: within the first 25 minutes, once
      if (now >= start && now < start + 25 * 60000 && !state.kickoff[key] && g.length <= 4) {
        state.kickoff[key] = true;
        await push(`${team.label}: Anwurf`, `${matchup(team, g)} hat begonnen.`, ["handball"]);
      }
      if (!old) continue; // first run: initialise silently
      const og = old.games.find(x => x[0] === g[0]);
      if (!og) continue;
      if (og.length <= 4 && g.length > 4) {
        const res = g[4] > g[5] ? "Sieg" : g[4] < g[5] ? "Niederlage" : "Unentschieden";
        await push(`${team.label}: ${res}`, `Endstand ${matchup(team, g)} ${scoreStr(g)}`, [g[4] > g[5] ? "tada" : "handball"]);
      }
      if (og[1] !== g[1] && g.length <= 4) {
        await push(`${team.label}: Spiel verlegt`, `${matchup(team, g)}: neu ${fmtDE(g[1])} (vorher ${fmtDE(og[1])})`, ["calendar"]);
      }
    }
  }
  // forget kickoff flags older than 60 days
  for (const k of Object.keys(state.kickoff)) {
    const [tid, r] = k.split("-");
    const g = out.teams.find(t => t.id === tid)?.games.find(x => x[0] === +r);
    if (!g || now - berlinDate(g[1]).getTime() > 60 * 864e5) delete state.kickoff[k];
  }

  if (DRY) { console.log(JSON.stringify(out).slice(0, 2000)); return; }
  // only rewrite when content changed (ignore timestamp)
  const strip = o => JSON.stringify({ ...o, updatedAt: null });
  if (!prev || strip(prev) !== strip(out)) {
    fs.writeFileSync(DATA_FILE, pretty(out) + "\n");
    console.log("data.json aktualisiert");
  } else console.log("Keine Änderungen");
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 1) + "\n");
}

main().catch(e => { console.error(e); process.exit(1); });
