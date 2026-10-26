// Anwurf – Datenabruf für die Handball-App der HSG Wettenberg
// Läuft per GitHub Action (.github/workflows/anwurf-daten.yml).
// Quelle: nuLiga des Hessischen Handball-Verbands (hhv-handball.liga.nu).
// Deckt jede Liga ab, in der eine Mannschaft der HSG Wettenberg spielt – mit allen Gegnern:
// Tabelle, kompletter Spielplan, Spielberichte (Spielverlauf Tor für Tor, Torschützen).
//
// Dateien:
//   anwurf/data.json            Ligen, Tabellen, Spielpläne, Spieler-Index (klein genug zum häufigen Laden)
//   anwurf/live.json            nur laufende Spiele der HSG (wird während eines Spiels alle 90 s erneuert)
//   anwurf/leagues/<id>.json    Spielberichte + Spielerwerte einer Liga (lädt die App bei Bedarf)
//   anwurf/state.json           Merker für Push-Nachrichten
// Jugendligen: nur Ergebnisse und Tabellen, keine Spielernamen (Minderjährige).
//
// Lokal testen:  node tools/anwurf-update.mjs --dry
//                node tools/anwurf-update.mjs --watch   (bleibt während eines HSG-Spiels aktiv)

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DIR = path.join(ROOT, "anwurf");
const DATA_FILE = path.join(DIR, "data.json");
const LIVE_FILE = path.join(DIR, "live.json");
const STATE_FILE = path.join(DIR, "state.json");
const LEAGUE_DIR = path.join(DIR, "leagues");
const DRY = process.argv.includes("--dry");
const WATCH = process.argv.includes("--watch");
const NTFY_BASE = process.env.NTFY_TOPIC || "";
const APP_URL = "https://buildspaceos.de/anwurf/";

const NU = "https://hhv-handball.liga.nu/cgi-bin/WebObjects/nuLigaHBDE.woa/wa/";
const CLUB = { id: 70137, name: "HSG Wettenberg", match: /Wettenberg/ };

// ---------- HTML helpers (no dependencies) ----------
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß", ndash: "–", mdash: "—" };
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
  e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENT[e] ?? m));
const text = h => decode(h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
function tables(html) {
  return [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map(m =>
    [...m[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(r => {
      const raw = [...r[1].matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/gi)];
      return { cells: raw.map(c => text(c[2])), attrs: raw.map(c => c[1]), raws: raw.map(c => c[2]), html: r[1] };
    }));
}
const attr = (s, name) => { const m = new RegExp(name + '="([^"]*)"').exec(s || ""); return m ? decode(m[1]) : null; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Anwurf-App; private Vereinsnutzung HSG Wettenberg)", "Accept-Language": "de-DE" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) { if (i === 2) throw new Error(`${url} -> ${e.message}`); await sleep(3000); }
  }
}
const nameFlip = n => { const m = /^([^,]+),\s*(.+)$/.exec(n || ""); return m ? `${m[2]} ${m[1]}` : (n || ""); };
const slug = s => s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---------- parsers ----------
function parseClub(html) {
  // first two sections are the regular season (HHV + Bezirk); skip friendlies, tournaments, qualification
  const out = [];
  let section = "";
  for (const t of tables(html)) for (const r of t) {
    if (r.cells.length === 1) { section = r.cells[0]; continue; }
    const g = /groupPage\?([^"]+)"/.exec(r.html);
    if (!g || /Freundschaft|Turnier|Qualifikation|Quali|FS\b/i.test(section) || /Meldeliste/i.test(r.cells[1] || "")) continue;
    const q = decode(g[1]);
    const id = (/group=(\d+)/.exec(q) || [])[1];
    if (!id) continue;
    out.push({ label: r.cells[0], league: r.cells[1], section, group: q, id: +id });
  }
  return out;
}
function parseTable(html) {
  const t = tables(html).find(rows => rows.some(r => r.cells.includes("Rang") && r.cells.includes("Mannschaft")));
  if (!t) return [];
  const head = t.find(r => r.cells.includes("Rang")).cells;
  const ix = n => head.indexOf(n);
  const rows = [];
  for (const r of t) {
    const c = r.cells;
    const tm = /(\d+)\s*:\s*(\d+)/.exec(c[ix("Tore")] || ""), pm = /(\d+)\s*:\s*(\d+)/.exec(c[ix("Punkte")] || "");
    if (!tm || !pm) continue;
    rows.push([c[ix("Mannschaft")], +c[ix("Begegnungen")], +c[ix("S")], +c[ix("U")], +c[ix("N")], +tm[1], +tm[2], +pm[1], +pm[2]]);
  }
  return rows;
}
function parseHeadline(html) {
  const m = /<h1>([\s\S]*?)<\/h1>/.exec(html);
  return m ? text(m[1]).replace(/\s*Tabelle und Spielplan.*$/, "").trim() : "";
}
function parseSchedule(html) {
  const t = tables(html).find(rows => rows.some(r => r.cells.includes("Heimmannschaft")));
  if (!t) return [];
  let curDate = null;
  const games = [];
  for (const r of t) {
    const c = r.cells;
    if (c.includes("Heimmannschaft") || c.length < 8) continue;
    const dm = /(\d{2})\.(\d{2})\.(\d{4})/.exec(c[1] || "");
    if (dm) curDate = `${dm[3]}-${dm[2]}-${dm[1]}`;
    const tm = /(\d{2}):(\d{2})/.exec(c[2] || "");
    if (!curDate) continue;
    const g = { n: +c[4] || null, d: `${curDate}T${tm ? tm[1] + ":" + tm[2] : "00:00"}`, h: c[5].trim(), a: c[6].trim() };
    if (!g.h || !g.a) continue;
    const venue = attr(r.raws[3], "title"); if (venue) g.v = venue;
    const movedTitle = attr(r.attrs[2], "title");
    if (/verlegt/i.test(movedTitle || "") || /\bv\b/.test(c[2])) {
      g.mv = 1;
      const om = /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/.exec(movedTitle || "");
      if (om) g.fr = `${om[3]}-${om[2]}-${om[1]}T${om[4]}:${om[5]}`;
    }
    const res = c[7] || "";
    const sm = /^(\d+)\s*:\s*(\d+)$/.exec(res);
    if (sm) {
      g.gh = +sm[1]; g.ga = +sm[2];
      const ht = /(\d+):(\d+)\s*zur Halbzeit/.exec(r.raws[7] || "");
      if (ht) g.ht = `${ht[1]}:${ht[2]}`;
    } else if (/^[A-Z]{1,3}$/.test(res)) g.note = res; // Sonderwertung laut Verband, z. B. "WG"
    const mid = /meeting=(\d+)/.exec(r.html);
    if (mid) g.mid = +mid[1];
    games.push(g);
  }
  return games.sort((x, y) => x.d.localeCompare(y.d) || (x.n || 0) - (y.n || 0));
}
function parseReport(html) {
  const ts = tables(html);
  const out = { home: null, away: null, ht: null, result: null, players: { home: [], away: [] }, events: [] };
  for (const r of ts[0] || []) {
    const c = r.cells;
    const ih = c.indexOf("Heimmannschaft"); if (ih >= 0) out.home = c[ih + 1];
    const ia = c.indexOf("Gastmannschaft"); if (ia >= 0) out.away = c[ia + 1];
  }
  let side = 0;
  for (const t of ts) {
    if (t.find(r => r.cells.includes("Trikot"))) {
      const key = side++ === 0 ? "home" : "away";
      for (const r of t) {
        const c = r.cells;
        if (!c[1] || c.includes("Trikot") || !/,/.test(c[1]) || /^[A-E]$/.test(c[0])) continue;
        const sm = /(\d+)\/(\d+)/.exec(c[5] || "");
        const two = [c[7], c[8], c[9]].filter(x => /\d{1,2}:\d{2}/.test(x || "")).length;
        const dq = [c[10], c[11]].some(x => /\d{1,2}:\d{2}/.test(x || "")) ? 1 : 0;
        // [Trikot, Name, Tore, 7m-Tore, 7m-Versuche, Gelb, 2-Min, Disq]
        out.players[key].push([c[0], nameFlip(c[1]), +c[4] || 0, sm ? +sm[1] : 0, sm ? +sm[2] : 0, /\d/.test(c[6] || "") ? 1 : 0, two, dq]);
      }
      continue;
    }
    const res = t.find(r => r.cells[0] === "Ergebnis");
    if (res) { const m = /(\d+):(\d+)\s*\((\d+):(\d+)\)/.exec(res.cells[1] || ""); if (m) { out.result = `${m[1]}:${m[2]}`; out.ht = `${m[3]}:${m[4]}`; } }
    if (t[0]?.cells.includes("Ereignis")) {
      for (const r of t.slice(1)) {
        const [team, time, score, ev, person] = r.cells;
        if (!time) continue;
        // [H|A|"", Zeit, Stand, Ereignis, Name, Trikot]
        out.events.push([team === "Heim" ? "H" : team === "Gast" ? "A" : "", time, score || "", ev, nameFlip((person || "").replace(/^\d+\s+/, "")), (/^(\d+)\s/.exec(person || "") || [])[1] || ""]);
      }
    }
  }
  return out;
}

// Ersatz, falls nuLiga keine Tabelle liefert: 2 Punkte Sieg, 1 Remis; Sortierung Punkte, Minuspunkte, Tordifferenz, Tore
function computeTable(games) {
  const rows = {};
  const row = t => rows[t] ||= [t, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const g of games) {
    row(g.h); row(g.a);
    if (g.gh == null) continue;
    const H = row(g.h), A = row(g.a);
    H[1]++; A[1]++; H[5] += g.gh; H[6] += g.ga; A[5] += g.ga; A[6] += g.gh;
    if (g.gh > g.ga) { H[2]++; A[4]++; H[7] += 2; A[8] += 2; }
    else if (g.gh < g.ga) { A[2]++; H[4]++; A[7] += 2; H[8] += 2; }
    else { H[3]++; A[3]++; H[7]++; H[8]++; A[7]++; A[8]++; }
  }
  return Object.values(rows).sort((x, y) => y[7] - x[7] || x[8] - y[8] || (y[5] - y[6]) - (x[5] - x[6]) || y[5] - x[5]);
}

// ---------- time ----------
function berlinDate(iso) {
  const [d, t] = iso.split("T");
  const guess = new Date(`${d}T${t}:00Z`);
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const [hh, mm] = fmt.format(guess).split(":").map(Number);
  const off = (((hh * 60 + mm) - (guess.getUTCHours() * 60 + guess.getUTCMinutes()) + 720) % 1440) - 720;
  return new Date(guess.getTime() - off * 60000);
}
const fmtDE = iso => { const [d, t] = iso.split("T"); const [, m, dd] = d.split("-"); return `${dd}.${m}. ${t} Uhr`; };
const isLiveWindow = (g, now) => { const s = berlinDate(g.d).getTime(); return g.gh == null && !g.note && now >= s - 10 * 60000 && now <= s + 130 * 60000; };

// ---------- push (ntfy) ----------
// Kanal je HSG-Mannschaft: <Basis>-<mannschaft>, z. B. …-maenner-ii. Männer + Männer II zusätzlich im Basis-Kanal.
async function push(team, title, message, tags) {
  const topics = [`${NTFY_BASE}-${slug(team.label)}`];
  if (/^Männer( II)?$/.test(team.label)) topics.push(NTFY_BASE);
  console.log(`PUSH [${topics.join(", ")}]: ${title} – ${message}`);
  if (DRY || !NTFY_BASE) return;
  for (const topic of topics) {
    try {
      const res = await fetch("https://ntfy.sh/", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, title, message, tags, click: APP_URL }) });
      if (!res.ok) console.warn("ntfy:", res.status, await res.text());
    } catch (e) { console.warn("ntfy fehlgeschlagen:", e.message); }
  }
}

// ---------- files ----------
const pretty = o => JSON.stringify(o, null, 1)
  .replace(/\[\s+([^\[\]{}]*?)\s+\]/g, (m, a) => "[" + a.replace(/\s*\n\s*/g, " ") + "]")
  .replace(/\{\s+([^\[\]{}]*?)\s+\}/g, (m, a) => "{" + a.replace(/\s*\n\s*/g, " ") + "}");
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
function writeIfChanged(file, obj, ignore = []) {
  const prev = readJSON(file, null);
  const strip = o => JSON.stringify(o, (k, v) => ignore.includes(k) ? undefined : v);
  if (prev && strip(prev) === strip(obj)) return false;
  if (!DRY) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, pretty(obj) + "\n"); }
  return true;
}

// ---------- nuScoreLive (öffentlicher Liveticker des Kampfgerichts) ----------
// REST: meetings/<Liga>/time/<t> (Spielliste), meeting/<Spiel>/time/<t> (Stand, uuid), events/<Spiel> (alle Ereignisse).
// Die App verbindet sich zusätzlich selbst mit dem Live-Kanal (WebSocket) und bekommt jedes Ereignis sofort.
const NSL = "https://hbde-live.liga.nu/nuScoreLiveRestBackend/api/1/";
const NSL_TYPES = { 2: "Auszeit Heim", 3: "Auszeit Gast", 4: "Tor", 5: "7m mit Tor", 6: "7m ohne Tor", 7: "Eigentor", 8: "2 Minuten", 9: "Verwarnung",
  10: "Disqualifikation mit Bericht", 11: "Disqualifikation", 12: "2 Minuten (Team)", 13: "2 Minuten (Team)", 14: "Halbzeit", 15: "Anpfiff", 16: "Spielende", 17: "Spielbeginn" };
const nslTime = () => Math.floor(Date.now() / 15000) * 15;
async function nslGet(p) {
  const res = await fetch(NSL + p, { headers: { Accept: "application/json", "User-Agent": "Anwurf-App (private Vereinsnutzung HSG Wettenberg)" } });
  if (!res.ok) throw new Error(`nuScoreLive ${p} -> HTTP ${res.status}`);
  return res.json();
}
const mmss = sec => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
// nuScore-Ereignis -> [Seite, Zeit, Stand, Ereignis, Name, Trikot, idx]
function nslEvent(e, youth) {
  const type = NSL_TYPES[e.event];
  if (!type) return null;
  const side = e.event === 2 || e.event === 12 ? "H" : e.event === 3 || e.event === 13 ? "A" : e.teamHome === true ? "H" : e.teamHome === false ? "A" : "";
  const name = youth ? "" : [e.personFirstname, e.personLastname].filter(Boolean).join(" ");
  return [side, mmss(e.second || 0), `${e.pointsHome ?? 0}:${e.pointsGuest ?? 0}`, type, name, "", e.idx];
}
async function liveCycle(data, state, fallback = []) {
  const now = Date.now();
  const out = [];
  for (const lg of data.leagues || []) {
    const due = lg.games.filter(g => isLiveWindow(g, now) && lg.hsg.some(h => h.team === g.h || h.team === g.a));
    if (!due.length) continue;
    let list = [];
    try { list = (await nslGet(`meetings/${lg.id}/time/${nslTime()}`)).meetings || []; } catch (e) { console.warn(e.message); }
    for (const g of due) {
      const h = lg.hsg.find(x => x.team === g.h || x.team === g.a);
      const m = list.find(x => x.teamHome === g.h && x.teamGuest === g.a) || (g.mid && list.find(x => +x.meetingID === g.mid));
      let entry = null;
      if (m) {
        try {
          const info = await nslGet(`meeting/${m.meetingID}/time/${nslTime()}`);
          const evs = ((await nslGet(`events/${m.meetingID}`)).events || [])
            .sort((a, b) => (a.second - b.second) || (a.idx - b.idx));
          const events = evs.map(e => nslEvent(e, lg.youth)).filter(Boolean);
          const lastIdx = evs.reduce((mx, e) => Math.max(mx, e.idx || 0), 0);
          const lastSec = evs.reduce((mx, e) => Math.max(mx, e.second || 0), 0);
          const timer = [...evs].reverse().find(e => e.event === 0 || e.event === 1);
          entry = { lid: lg.id, n: g.n, d: g.d, h: g.h, a: g.a, label: h.label, src: "nuScore", mid: +m.meetingID, uuid: info.meetingUuid || m.meetingUuid || null,
            live: !!info.live, ended: evs.some(e => e.event === 16), score: `${info.matchesHome ?? 0}:${info.matchesGuest ?? 0}`,
            ht: info.halfTimeScoreHome || info.halfTimeScoreGuest ? `${info.halfTimeScoreHome}:${info.halfTimeScoreGuest}` : null,
            second: lastSec, clock: timer ? (timer.event === 0 ? "running" : "stopped") : null, lastIdx, events: events.slice(-120), at: new Date().toISOString() };
        } catch (e) { console.warn(`nuScoreLive ${m.meetingID}: ${e.message}`); }
      }
      if (!entry) entry = fallback.find(f => f.lid === lg.id && f.n === g.n) || { lid: lg.id, n: g.n, d: g.d, h: g.h, a: g.a, label: h.label, src: null, score: null, events: [] };
      out.push(entry);
      // pushes from live data
      const key = `${lg.id}-${g.n}`, vs = `${g.h} – ${g.a}`, team = { label: h.label };
      const started = entry.live || (entry.events || []).some(e => e[3] === "Spielbeginn" || e[3] === "Tor");
      if (started && !state.kickoff[key]) { state.kickoff[key] = now; await push(team, `${h.label}: Anwurf`, `${vs} hat begonnen.`, ["handball"]); }
      if ((entry.events || []).some(e => e[3] === "Halbzeit") && !state.half[key]) { state.half[key] = now; await push(team, `${h.label}: Halbzeit`, `${vs} ${entry.ht || entry.score}`, ["hourglass"]); }
      if (entry.ended && !state.ended[key]) {
        state.ended[key] = now;
        const [sh, sa] = (entry.score || "0:0").split(":").map(Number);
        const own = h.team === g.h ? sh : sa, opp = h.team === g.h ? sa : sh;
        await push(team, `${h.label}: ${own > opp ? "Sieg" : own < opp ? "Niederlage" : "Unentschieden"}`, `Endstand ${vs} ${entry.score}${entry.ht ? ` (Halbzeit ${entry.ht})` : ""}`, [own > opp ? "tada" : "handball"]);
      }
    }
  }
  return out;
}

// ---------- Vereinslogos (aus nuScoreLive, einmal pro Tag je Liga) ----------
const LOGO_DIR = path.join(DIR, "logos");
const EXT = { "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/svg+xml": "svg" };
async function leagueLogos(id, old, state) {
  state.logosAt ||= {};
  const have = old?.logos || {};
  if (Date.now() - (state.logosAt[id] || 0) < 864e5 && Object.keys(have).length) return have;
  const logos = { ...have };
  try {
    const list = (await nslGet(`meetings/${id}/time/${nslTime()}`)).meetings || [];
    const byTeam = {};
    for (const m of list) { if (m.homeImgUrl) byTeam[m.teamHome] = m.homeImgUrl; if (m.guestImgUrl) byTeam[m.teamGuest] = m.guestImgUrl; }
    for (const [team, uuid] of Object.entries(byTeam)) {
      if (!/^[0-9a-f-]{20,}$/i.test(uuid)) continue;
      const existing = fs.existsSync(LOGO_DIR) && fs.readdirSync(LOGO_DIR).find(f => f.startsWith(uuid + "."));
      if (existing) { logos[team] = existing; continue; }
      try {
        const res = await fetch(NSL + "images/" + uuid, { headers: { "User-Agent": "Anwurf-App (private Vereinsnutzung HSG Wettenberg)" } });
        const type = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
        if (!res.ok || !EXT[type]) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 200 || buf.length > 400000) continue;
        const file = `${uuid}.${EXT[type]}`;
        if (!DRY) { fs.mkdirSync(LOGO_DIR, { recursive: true }); fs.writeFileSync(path.join(LOGO_DIR, file), buf); }
        logos[team] = file;
        await sleep(200);
      } catch (e) { console.warn(`Logo ${team}: ${e.message}`); }
    }
    state.logosAt[id] = Date.now();
  } catch (e) { console.warn(`${id}: Logos: ${e.message}`); }
  return logos;
}

// ---------- one update cycle ----------
async function cycle({ liveOnly = false } = {}) {
  const prev = readJSON(DATA_FILE, null);
  const state = readJSON(STATE_FILE, {});
  for (const k of ["kickoff", "half", "lastScore", "ended"]) state[k] ||= {};
  const now = Date.now();

  // club teams -> leagues (refresh daily)
  let teams = state.clubTeams;
  if (!teams || now - (state.clubTeamsAt || 0) > 864e5) {
    try { teams = parseClub(await get(`${NU}clubTeams?club=${CLUB.id}`)); state.clubTeams = teams; state.clubTeamsAt = now; }
    catch (e) { console.warn("Vereinsseite:", e.message); }
  }
  if (!teams?.length) throw new Error("Keine Mannschaften gefunden");

  const leagueIds = [...new Set(teams.map(t => t.id))];
  const out = { version: 3, updatedAt: new Date().toISOString(), source: "nuLiga HHV", club: CLUB.name, leagues: [], players: [] };
  const errors = [];
  const reportLive = [];

  for (const id of leagueIds) {
    const clubTeams = teams.filter(t => t.id === id);
    const group = clubTeams[0].group;
    const old = prev?.leagues?.find(l => l.id === id);
    const youth = /Jugend/i.test(clubTeams[0].league + " " + clubTeams[0].label);
    const leagueFile = path.join(LEAGUE_DIR, `${id}.json`);
    const lf = readJSON(leagueFile, { reports: {} });
    try {
      const hsgLive = old && old.games.some(g => isLiveWindow(g, now) && old.hsg.some(h => h.team === g.h || h.team === g.a));
      if (liveOnly && !hsgLive) { out.leagues.push(old); out.players.push(...(prev.players || []).filter(p => p[2] === id)); continue; }
      const [tableHtml, schedHtml] = await Promise.all([get(NU + "groupPage?" + group), get(NU + "groupPage?displayTyp=gesamt&displayDetail=meetings&" + group)]);
      let table = parseTable(tableHtml);
      const games = parseSchedule(schedHtml);
      let tableComputed = false;
      if (!table.length && games.some(g => g.gh != null)) { table = computeTable(games); tableComputed = true; console.warn(`${id}: offizielle Tabelle fehlt, aus Ergebnissen berechnet`); }
      const title = parseHeadline(tableHtml) || clubTeams[0].league;
      // which table entries are HSG teams (e.g. "HSG Wettenberg II"); youth leagues may list a JSG
      const names = [...new Set([...table.map(r => r[0]), ...games.flatMap(g => [g.h, g.a])])].filter(n => CLUB.match.test(n));
      const hsg = clubTeams.map((t, i) => {
        const suffix = (/\b(II|III|IV)$/.exec(t.label) || [])[1];
        const team = names.find(n => suffix ? n.endsWith(" " + suffix) : !/\s(II|III|IV)$/.test(n)) || names[i] || names[0] || CLUB.name;
        return { label: t.label, team };
      });
      const league = {
        id, name: clubTeams[0].league, title, cat: /^weibl|Frauen/i.test(clubTeams[0].league) ? (youth ? "Jugend weiblich" : "Frauen") : (youth ? "Jugend männlich" : "Männer"),
        youth, url: NU + "groupPage?" + group, hsg, table, games, asOf: new Date().toISOString().slice(0, 10),
      };
      if (tableComputed) league.tableComputed = true;
      league.logos = liveOnly ? (old?.logos || {}) : await leagueLogos(id, old, state);
      // reports (adult leagues): finished games without a final report, plus HSG games running right now
      if (!youth) {
        for (const g of games) {
          if (!g.mid) continue;
          const isHsg = hsg.some(h => h.team === g.h || h.team === g.a);
          const live = isHsg && isLiveWindow(g, now);
          const have = lf.reports[g.mid];
          if (!(live || (g.gh != null && !have?.final))) continue;
          if (liveOnly && !live) continue;
          try {
            const rep = parseReport(await get(`${NU}groupMeetingReport?meeting=${g.mid}&${group}`));
            rep.final = g.gh != null && rep.events.length > 0;
            lf.reports[g.mid] = rep;
            await sleep(700);
          } catch (e) { console.warn(`${id}: Bericht ${g.mid}: ${e.message}`); }
        }
      }
      // HSG live games (youth too: only score/time, from schedule)
      for (const g of games) {
        const h = hsg.find(x => x.team === g.h || x.team === g.a);
        if (!h || !isLiveWindow(g, now)) continue;
        const rep = lf.reports[g.mid];
        const ev = rep?.events || [];
        const last = [...ev].reverse().find(e => /\d+:\d+/.test(e[2]));
        reportLive.push({ lid: id, mid: g.mid || null, n: g.n, d: g.d, h: g.h, a: g.a, label: h.label, src: "nuLiga", score: last ? last[2] : null, time: ev.length ? ev[ev.length - 1][1] : null, events: youth ? [] : ev.slice(-80) });
      }
      // players (adult leagues) – aggregated per team and name, values per game
      if (!youth) {
        const players = {};
        for (const g of games) {
          const rep = lf.reports[g.mid];
          if (!rep?.final) continue;
          for (const side of ["home", "away"]) {
            const team = side === "home" ? g.h : g.a;
            for (const p of rep.players[side] || []) {
              const key = `${team}|${p[1]}`;
              const pl = players[key] ||= { n: p[1], t: team, no: p[0], g: [] };
              pl.no = p[0];
              pl.g.push([g.mid, p[2], p[3], p[4], p[5], p[6], p[7]]); // [Spiel, Tore, 7m-Tore, 7m-Versuche, Gelb, 2-Min, Disq]
            }
          }
        }
        lf.players = players;
        for (const p of Object.values(players)) {
          const goals = p.g.reduce((s, x) => s + x[1], 0);
          out.players.push([p.n, p.t, id, p.g.length, goals]);
        }
      } else { delete lf.players; lf.reports = {}; }
      lf.updatedAt = new Date().toISOString();
      if (!DRY && writeIfChanged(leagueFile, lf, ["updatedAt"])) console.log(`${id}: Liga-Datei aktualisiert`);
      league.reports = Object.values(lf.reports).filter(r => r.final).length;
      out.leagues.push(league);
      console.log(`${id} ${league.name}: ${table.length} Teams, ${games.length} Spiele (${games.filter(g => g.gh != null).length} gespielt), HSG: ${hsg.map(h => h.team).join(", ")}, Berichte ${league.reports}`);
      await sleep(400);
    } catch (e) {
      errors.push(`${id}: ${e.message}`);
      if (old) { out.leagues.push(old); out.players.push(...(prev.players || []).filter(p => p[2] === id)); }
    }
  }
  if (!out.leagues.length) throw new Error("Keine Daten: " + errors.join("; "));
  if (errors.length) { out.errors = errors; console.warn("Fehler:", errors); }
  out.players.sort((a, b) => b[4] - a[4]);

  // ---------- notifications (HSG games only) ----------
  for (const lg of out.leagues) {
    const old = prev?.leagues?.find(l => l.id === lg.id);
    for (const g of lg.games) {
      const h = lg.hsg.find(x => x.team === g.h || x.team === g.a);
      if (!h) continue;
      const team = { label: h.label };
      const key = `${lg.id}-${g.n}`;
      const vs = `${g.h} – ${g.a}`;
      const start = berlinDate(g.d).getTime();
      if (now >= start && now < start + 30 * 60000 && !state.kickoff[key] && g.gh == null && !g.note) {
        state.kickoff[key] = now;
        await push(team, `${h.label}: Anwurf`, `${vs} hat begonnen.`, ["handball"]);
      }
      const og = old?.games?.find(x => (g.mid && x.mid === g.mid) || (g.n && x.n === g.n));
      if (!og) continue;
      if (og.gh == null && g.gh != null && !state.ended[key]) {
        state.ended[key] = now;
        const ownHome = h.team === g.h, own = ownHome ? g.gh : g.ga, opp = ownHome ? g.ga : g.gh;
        const res = own > opp ? "Sieg" : own < opp ? "Niederlage" : "Unentschieden";
        await push(team, `${h.label}: ${res}`, `Endstand ${vs} ${g.gh}:${g.ga}${g.ht ? ` (Halbzeit ${g.ht})` : ""}`, [own > opp ? "tada" : "handball"]);
      }
      if (og.d !== g.d && g.gh == null) await push(team, `${h.label}: Spiel verlegt`, `${vs}: neu ${fmtDE(g.d)} (vorher ${fmtDE(og.d)})`, ["calendar"]);
    }
  }
  for (const k of ["kickoff", "half", "lastScore", "ended"]) for (const [key, t] of Object.entries(state[k])) if (typeof t === "number" && now - t > 60 * 864e5) delete state[k][key];

  const liveGames = await liveCycle(out, state, reportLive);
  if (DRY) { console.log(JSON.stringify(out).length, "Bytes data.json", liveGames.length, "Live-Spiele"); return liveGames; }
  if (writeIfChanged(DATA_FILE, out, ["updatedAt", "asOf"])) console.log("data.json aktualisiert");
  writeIfChanged(LIVE_FILE, { updatedAt: new Date().toISOString(), games: liveGames }, liveGames.length ? [] : ["updatedAt"]);
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 1) + "\n");
  return liveGames;
}

function commit() {
  if (DRY) return;
  try {
    execSync("git add anwurf/data.json anwurf/live.json anwurf/state.json anwurf/leagues anwurf/logos", { cwd: ROOT });
    try { execSync("git diff --cached --quiet", { cwd: ROOT }); return; } catch {}
    execSync('git commit -q -m "Anwurf: Spieldaten aktualisiert"', { cwd: ROOT });
    for (let i = 0; i < 3; i++) { try { execSync("git pull -q --rebase && git push -q", { cwd: ROOT }); return; } catch (e) { console.warn("push:", e.message); } }
  } catch (e) { console.warn("commit:", e.message); }
}

async function liveOnlyCycle() {
  const data = readJSON(DATA_FILE, null);
  const state = readJSON(STATE_FILE, {});
  for (const k of ["kickoff", "half", "lastScore", "ended"]) state[k] ||= {};
  const live = await liveCycle(data || { leagues: [] }, state);
  if (!DRY) {
    writeIfChanged(LIVE_FILE, { updatedAt: new Date().toISOString(), games: live }, live.length ? [] : ["updatedAt"]);
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 1) + "\n");
  }
  return live;
}
async function main() {
  let live = await cycle();
  if (!WATCH) return;
  // während eines HSG-Spiels: alle 30 Sekunden nuScoreLive, alle 5 Minuten die betroffenen Ligen aus nuLiga; bis zu ~25 Minuten pro Lauf
  const until = Date.now() + 25 * 60000;
  let lastFull = Date.now();
  while (live.length && Date.now() < until) {
    commit();
    await sleep(30000);
    if (Date.now() - lastFull > 5 * 60000) { live = await cycle({ liveOnly: true }); lastFull = Date.now(); }
    else live = await liveOnlyCycle();
  }
  commit();
}
export { parseClub, parseTable, parseSchedule, parseReport, parseHeadline, nslEvent };
if (!process.env.ANWURF_NO_MAIN) main().catch(e => { console.error(e); process.exit(1); });
