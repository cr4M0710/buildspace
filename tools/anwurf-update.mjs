// Anwurf – Datenabruf für die Handball-App (HSG Wettenberg Männer 1 + 2)
// Läuft per GitHub Action (.github/workflows/anwurf-daten.yml).
// Quelle: nuLiga des Hessischen Handball-Verbands (hhv-handball.liga.nu) –
// Tabelle, Spielplan, Spielberichte mit Spielverlauf (Tor für Tor) und Torschützenliste.
// Schreibt anwurf/data.json (+ anwurf/reports.json) und schickt Push-Nachrichten über ntfy.sh.
//
// Lokal testen:  node tools/anwurf-update.mjs --dry   (schreibt nichts, sendet nichts)
//                node tools/anwurf-update.mjs --watch (bleibt während eines laufenden Spiels aktiv)

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DATA_FILE = path.join(ROOT, "anwurf", "data.json");
const REPORTS_FILE = path.join(ROOT, "anwurf", "reports.json");
const STATE_FILE = path.join(ROOT, "anwurf", "state.json");
const DRY = process.argv.includes("--dry");
const WATCH = process.argv.includes("--watch");
const NTFY_TOPIC = process.env.NTFY_TOPIC || "";
const APP_URL = "https://buildspaceos.de/anwurf/";

const NU = "https://hhv-handball.liga.nu/cgi-bin/WebObjects/nuLigaHBDE.woa/wa/";
const TEAMS = [
  { id: "m1", name: "HSG Wettenberg", short: "Wettenberg", label: "Männer 1", league: "Oberliga Mitte",
    tableName: "HSG Wettenberg", group: "championship=HHV+26%2F27&group=492123" },
  { id: "m2", name: "HSG Wettenberg II", short: "Wettenberg II", label: "Männer 2", league: "Bezirksoberliga Gießen",
    tableName: "HSG Wettenberg II", group: "championship=Gie%C3%9Fen+26%2F27&group=491948" },
];

// ---------- HTML helpers (no dependencies) ----------
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß", ndash: "–", mdash: "—" };
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
  e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENT[e] ?? m));
const text = h => decode(h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
function tables(html) {
  return [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map(m => {
    const rows = [...m[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(r => {
      const raw = [...r[1].matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/gi)];
      return { cells: raw.map(c => text(c[2])), attrs: raw.map(c => c[1]), raws: raw.map(c => c[2]), html: r[1] };
    });
    return rows;
  });
}
const attr = (s, name) => { const m = new RegExp(name + '="([^"]*)"').exec(s || ""); return m ? decode(m[1]) : null; };
async function get(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Anwurf-App; private Vereinsnutzung HSG Wettenberg)", "Accept-Language": "de-DE" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) { if (i === 2) throw new Error(`${url} -> ${e.message}`); await sleep(3000); }
  }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const nameFlip = n => { const m = /^([^,]+),\s*(.+)$/.exec(n || ""); return m ? `${m[2]} ${m[1]}` : (n || ""); };

// ---------- parsers ----------
function parseTable(html, team) {
  const t = tables(html).find(rows => rows.some(r => r.cells.includes("Rang") && r.cells.includes("Mannschaft")));
  if (!t) throw new Error(`${team.id}: Tabelle nicht gefunden`);
  const head = t.find(r => r.cells.includes("Rang")).cells;
  const ix = n => head.indexOf(n);
  const rows = [];
  for (const r of t) {
    const c = r.cells;
    const tm = /(\d+)\s*:\s*(\d+)/.exec(c[ix("Tore")] || ""), pm = /(\d+)\s*:\s*(\d+)/.exec(c[ix("Punkte")] || "");
    if (!tm || !pm) continue;
    rows.push([c[ix("Mannschaft")], +c[ix("Begegnungen")], +c[ix("S")], +c[ix("U")], +c[ix("N")], +tm[1], +tm[2], +pm[1], +pm[2]]);
  }
  if (rows.length < 8) throw new Error(`${team.id}: nur ${rows.length} Tabellenzeilen`);
  if (!rows.some(r => r[0] === team.tableName)) throw new Error(`${team.id}: "${team.tableName}" fehlt in der Tabelle`);
  return rows;
}
function parseSchedule(html, team) {
  const t = tables(html).find(rows => rows.some(r => r.cells.includes("Heimmannschaft")));
  if (!t) throw new Error(`${team.id}: Spielplan nicht gefunden`);
  let curDate = null;
  const games = [];
  for (const r of t) {
    const c = r.cells;
    if (c.includes("Heimmannschaft") || c.length < 8) continue;
    const dm = /(\d{2})\.(\d{2})\.(\d{4})/.exec(c[1] || "");
    if (dm) curDate = `${dm[3]}-${dm[2]}-${dm[1]}`;
    const tm = /(\d{2}):(\d{2})/.exec(c[2] || "");
    if (!curDate || !tm) continue;
    const home = c[5].replace(/\s+$/, ""), away = c[6].replace(/\s+$/, "");
    if (home !== team.tableName && away !== team.tableName) continue;
    const isHome = home === team.tableName;
    const g = { d: `${curDate}T${tm[1]}:${tm[2]}`, ha: isHome ? "H" : "A", opp: isHome ? away : home, nr: +c[4] || null };
    const venue = attr(r.raws[3], "title"); if (venue) g.venue = venue;
    const movedTitle = attr(r.attrs[2], "title");
    if (/verlegt/i.test(movedTitle || "") || /\bv\b/.test(c[2])) {
      g.moved = true;
      const om = /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/.exec(movedTitle || "");
      if (om) g.from = `${om[3]}-${om[2]}-${om[1]}T${om[4]}:${om[5]}`;
    }
    const res = c[7] || "";
    const sm = /^(\d+)\s*:\s*(\d+)$/.exec(res);
    if (sm) {
      const h = +sm[1], a = +sm[2];
      g.gf = isHome ? h : a; g.ga = isHome ? a : h;
      const ht = /(\d+):(\d+)\s*zur Halbzeit/.exec(r.raws[7] || "");
      if (ht) g.ht = isHome ? `${ht[1]}:${ht[2]}` : `${ht[2]}:${ht[1]}`;
    } else if (/^[A-Z]{1,3}$/.test(res)) {
      g.note = res; // Sonderwertung laut Verband, z. B. "WG"
    }
    const mid = /meeting=(\d+)/.exec(r.html);
    if (mid) g.mid = +mid[1];
    games.push(g);
  }
  if (games.length < 10) throw new Error(`${team.id}: nur ${games.length} Spiele erkannt`);
  games.sort((a, b) => a.d.localeCompare(b.d)).forEach((g, i) => { g.r = i + 1; });
  return games;
}
function parseReport(html) {
  const ts = tables(html);
  const out = { home: null, away: null, ht: null, result: null, players: { home: [], away: [] }, events: [] };
  const info = ts[0] || [];
  for (const r of info) {
    const c = r.cells;
    const ih = c.indexOf("Heimmannschaft"); if (ih >= 0) out.home = c[ih + 1];
    const ia = c.indexOf("Gastmannschaft"); if (ia >= 0) out.away = c[ia + 1];
  }
  let side = 0;
  for (const t of ts) {
    const head = t.find(r => r.cells.includes("Trikot"));
    if (head) {
      const key = side++ === 0 ? "home" : "away";
      for (const r of t) {
        const c = r.cells;
        if (!c[1] || c.includes("Trikot") || !/,/.test(c[1])) continue;
        if (/^[A-E]$/.test(c[0])) continue; // Offizielle
        const sm = /(\d+)\/(\d+)/.exec(c[5] || "");
        const twoMin = [c[7], c[8], c[9]].filter(x => /\d{1,2}:\d{2}/.test(x || "")).length;
        const dq = [c[10], c[11]].some(x => /\d{1,2}:\d{2}/.test(x || "")) ? 1 : 0;
        out.players[key].push([c[0], nameFlip(c[1]), +c[4] || 0, sm ? +sm[1] : 0, sm ? +sm[2] : 0, /\d/.test(c[6] || "") ? 1 : 0, twoMin, dq]);
      }
      continue;
    }
    const res = t.find(r => r.cells[0] === "Ergebnis");
    if (res) { const m = /(\d+):(\d+)\s*\((\d+):(\d+)\)/.exec(res.cells[1] || ""); if (m) { out.result = `${m[1]}:${m[2]}`; out.ht = `${m[3]}:${m[4]}`; } }
    if (t[0]?.cells.includes("Ereignis")) {
      for (const r of t.slice(1)) {
        const [team, time, score, ev, person] = r.cells;
        if (!time) continue;
        out.events.push([team === "Heim" ? "H" : team === "Gast" ? "A" : "", time, score || "", ev, nameFlip((person || "").replace(/^\d+\s+/, "")), (/^(\d+)\s/.exec(person || "") || [])[1] || ""]);
      }
    }
  }
  return out;
}
function parseScorers(html) {
  const t = tables(html).find(rows => rows.some(r => r.cells.includes("Spieler") && r.cells.includes("Tore")));
  if (!t) return [];
  return t.filter(r => /^\d+\.?$/.test(r.cells[0] || "")).slice(0, 60)
    .map(r => [nameFlip(r.cells[1]), r.cells[2], +r.cells[3] || 0, +r.cells[4] || 0]);
}

// ---------- time helpers ----------
function berlinDate(iso) {
  const [d, t] = iso.split("T");
  const guess = new Date(`${d}T${t}:00Z`);
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const [hh, mm] = fmt.format(guess).split(":").map(Number);
  const off = (((hh * 60 + mm) - (guess.getUTCHours() * 60 + guess.getUTCMinutes()) + 720) % 1440) - 720;
  return new Date(guess.getTime() - off * 60000);
}
const fmtDE = iso => { const [d, t] = iso.split("T"); const [, m, dd] = d.split("-"); return `${dd}.${m}. ${t} Uhr`; };
const matchup = (team, g) => g.ha === "H" ? `${team.short} – ${g.opp}` : `${g.opp} – ${team.short}`;
const scoreStr = (g, a = g.gf, b = g.ga) => g.ha === "H" ? `${a}:${b}` : `${b}:${a}`;
const isLiveWindow = (g, now) => { const s = berlinDate(g.d).getTime(); return g.gf == null && now >= s - 10 * 60000 && now <= s + 130 * 60000; };

// ---------- push ----------
async function push(title, message, tags) {
  console.log(`PUSH: ${title} – ${message}`);
  if (DRY || !NTFY_TOPIC) return;
  try {
    const res = await fetch("https://ntfy.sh/", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: NTFY_TOPIC, title, message, tags, click: APP_URL }) });
    if (!res.ok) console.warn("ntfy:", res.status, await res.text());
  } catch (e) { console.warn("ntfy fehlgeschlagen:", e.message); }
}

// one game / table row per line keeps the git history readable
const pretty = o => JSON.stringify(o, null, 1).replace(/\[\s+([^\[\]{}]*?)\s+\]/g, (m, a) => "[" + a.replace(/\s*\n\s*/g, " ") + "]")
  .replace(/\{\s+([^\[\]{}]*?)\s+\}/g, (m, a) => "{" + a.replace(/\s*\n\s*/g, " ") + "}");
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };

// ---------- one update cycle ----------
async function cycle() {
  const prev = readJSON(DATA_FILE, null);
  const reports = readJSON(REPORTS_FILE, {});
  const state = readJSON(STATE_FILE, {});
  state.kickoff ||= {}; state.half ||= {}; state.lastScore ||= {};
  const now = Date.now();
  const out = { version: 2, updatedAt: new Date().toISOString(), source: "nuLiga HHV", teams: [], live: [] };
  const errors = [];

  for (const team of TEAMS) {
    const old = prev?.teams?.find(t => t.id === team.id);
    try {
      const [tableHtml, schedHtml] = await Promise.all([get(NU + "groupPage?" + team.group), get(NU + "groupPage?displayTyp=gesamt&displayDetail=meetings&" + team.group)]);
      const table = parseTable(tableHtml, team);
      const games = parseSchedule(schedHtml, team);
      let scorers = old?.scorers || [];
      const lastScorersAt = state["scorers-" + team.id] || 0;
      if (now - lastScorersAt > 3 * 3600e3 || games.some(g => g.gf != null && !(old?.games || []).some(o => o.mid === g.mid && o.gf != null))) {
        try { scorers = parseScorers(await get(NU + "groupMeetingStatistics?displayType=playerGoals&" + team.group)); state["scorers-" + team.id] = now; }
        catch (e) { console.warn(`${team.id}: Torschützen: ${e.message}`); }
      }
      // reports: fetch missing ones for finished games, and keep refreshing live games
      for (const g of games) {
        if (!g.mid) continue;
        const key = String(g.mid);
        const need = (g.gf != null && !reports[key]?.final) || isLiveWindow(g, now);
        if (!need) continue;
        try {
          const rep = parseReport(await get(`${NU}groupMeetingReport?meeting=${g.mid}&${team.group}`));
          rep.us = rep.home === team.tableName ? "home" : "away";
          rep.final = g.gf != null && rep.events.length > 0;
          reports[key] = rep;
          await sleep(800);
        } catch (e) { console.warn(`${team.id}: Bericht ${g.mid}: ${e.message}`); }
      }
      const { group, ...meta } = team;
      out.teams.push({ ...meta, nuliga: NU + "groupPage?" + group, asOf: new Date().toISOString().slice(0, 10), table, games, scorers });
      console.log(`${team.id}: ${games.length} Spiele, ${games.filter(g => g.gf != null).length} mit Ergebnis, Tabelle ${table.length}, Torschützen ${scorers.length}`);
    } catch (e) {
      errors.push(`${team.id}: ${e.message}`);
      if (old) out.teams.push(old);
    }
  }
  if (!out.teams.length) throw new Error("Keine Daten: " + errors.join("; "));
  if (errors.length) { out.errors = errors; console.warn("Fehler:", errors); }

  // live block: the newest events of games that are running right now
  for (const team of out.teams) for (const g of team.games) {
    if (!isLiveWindow(g, now) || !g.mid) continue;
    const rep = reports[String(g.mid)];
    const ev = rep?.events || [];
    const last = [...ev].reverse().find(e => /\d+:\d+/.test(e[2]));
    out.live.push({ team: team.id, mid: g.mid, d: g.d, score: last ? last[2] : null, time: ev.length ? ev[ev.length - 1][1] : null, events: ev.slice(-60), us: rep?.us || (g.ha === "H" ? "home" : "away") });
  }

  // ---------- notifications ----------
  for (const team of out.teams) {
    const old = prev?.teams?.find(t => t.id === team.id);
    for (const g of team.games) {
      const key = `${team.id}-${g.mid || g.nr || g.d}`;
      const start = berlinDate(g.d).getTime();
      if (now >= start && now < start + 30 * 60000 && !state.kickoff[key] && g.gf == null) {
        state.kickoff[key] = now;
        await push(`${team.label}: Anwurf`, `${matchup(team, g)} hat begonnen.`, ["handball"]);
      }
      const lv = out.live.find(l => l.mid === g.mid);
      if (lv?.score && state.lastScore[key] !== lv.score) {
        const halfDone = lv.events.some(e => /Halbzeit|Pause/i.test(e[3])) || (lv.time && parseInt(lv.time) >= 30);
        if (halfDone && !state.half[key]) { state.half[key] = now; await push(`${team.label}: Halbzeit`, `${matchup(team, g)} ${lv.score}`, ["hourglass"]); }
        state.lastScore[key] = lv.score;
      }
      if (!old) continue; // first run: initialise silently
      const og = (old.games || []).find(x => (g.mid && x.mid === g.mid) || (g.nr && x.nr === g.nr));
      if (!og) continue;
      if (og.gf == null && g.gf != null) {
        const res = g.gf > g.ga ? "Sieg" : g.gf < g.ga ? "Niederlage" : "Unentschieden";
        await push(`${team.label}: ${res}`, `Endstand ${matchup(team, g)} ${scoreStr(g)}${g.ht ? ` (Halbzeit ${g.ht})` : ""}`, [g.gf > g.ga ? "tada" : "handball"]);
      }
      if (og.d !== g.d && g.gf == null) await push(`${team.label}: Spiel verlegt`, `${matchup(team, g)}: neu ${fmtDE(g.d)} (vorher ${fmtDE(og.d)})`, ["calendar"]);
    }
  }
  // forget old flags
  for (const k of ["kickoff", "half"]) for (const [key, t] of Object.entries(state[k])) if (now - t > 60 * 864e5) delete state[k][key];

  if (DRY) { console.log(pretty(out).slice(0, 3000)); return out; }
  const strip = o => JSON.stringify({ ...o, updatedAt: null, teams: (o.teams || []).map(t => ({ ...t, asOf: null })) });
  if (!prev || strip(prev) !== strip(out)) { fs.writeFileSync(DATA_FILE, pretty(out) + "\n"); console.log("data.json aktualisiert"); }
  else console.log("Keine Änderungen");
  fs.writeFileSync(REPORTS_FILE, pretty(reports) + "\n");
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 1) + "\n");
  return out;
}

function commit() {
  if (DRY) return;
  try {
    execSync("git add anwurf/data.json anwurf/reports.json anwurf/state.json", { cwd: ROOT });
    try { execSync("git diff --cached --quiet", { cwd: ROOT }); return; } catch {}
    execSync('git commit -q -m "Anwurf: Spieldaten aktualisiert"', { cwd: ROOT });
    for (let i = 0; i < 3; i++) { try { execSync("git pull -q --rebase && git push -q", { cwd: ROOT }); return; } catch (e) { console.warn("push:", e.message); } }
  } catch (e) { console.warn("commit:", e.message); }
}

async function main() {
  let out = await cycle();
  if (!WATCH) return;
  // stay active while one of our games is running: refresh every 90 seconds, up to ~25 minutes per job
  const until = Date.now() + 25 * 60000;
  while (out.live.length && Date.now() < until) {
    commit();
    await sleep(90000);
    out = await cycle();
  }
}
export { parseTable, parseSchedule, parseReport, parseScorers };
if (!process.env.ANWURF_NO_MAIN) main().catch(e => { console.error(e); process.exit(1); });
