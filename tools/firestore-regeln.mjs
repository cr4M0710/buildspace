// Spielt firebase/firestore.rules in das Firebase-Projekt ein (läuft als GitHub Action,
// siehe .github/workflows/firestore-regeln.yml und firebase/ANLEITUNG.md).
//
// Ablauf: aktuelle Regeln aus Firebase holen und als Sicherung ablegen → prüfen, dass
// keine Sammlung verschwindet, die live noch eine Regel hat → neue Regeln hochladen
// (Firebase prüft dabei die Schreibweise) → freischalten.
//
// Umgebung: TOKEN (Zugriffs-Token des Dienstkontos), TROTZDEM=true überspringt die
// Sammlungs-Prüfung, NUR_VERGLEICHEN=true lädt nichts hoch.
import fs from "node:fs";

const PROJEKT = "kanban-board-281da";
const API = "https://firebaserules.googleapis.com/v1";
const RELEASE = `projects/${PROJEKT}/releases/cloud.firestore`;
const DATEI = "firebase/firestore.rules";
const summary = process.env.GITHUB_STEP_SUMMARY;
const log = (t) => { console.log(t); if (summary) fs.appendFileSync(summary, t + "\n"); };

// Alle match-Pfade, Platzhalter-Namen vereinheitlicht ({uid} = {userId})
export function pfade(text) {
  const ohneKommentare = text.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const out = new Set();
  for (const m of ohneKommentare.matchAll(/match\s+(\/[^\s{]*(?:\{[^}]*\}[^\s{]*)*)\s*\{/g)) {
    const p = m[1].replace(/\{[^}=]*(=\*\*)?\}/g, (_, d) => (d ? "{**}" : "{}"));
    if (p !== "/databases/{}/documents") out.add(p);
  }
  return out;
}

async function api(method, pfad, body) {
  const r = await fetch(`${API}/${pfad}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text();
  if (!r.ok) {
    let msg = text;
    try { msg = JSON.parse(text).error.message; } catch {}
    const e = new Error(`${method} ${pfad}: ${r.status} ${msg}`);
    e.status = r.status;
    throw e;
  }
  return text ? JSON.parse(text) : {};
}

async function main() {
  if (!process.env.TOKEN) { log("❌ Kein Zugriffs-Token – ist das Geheimnis FIREBASE_SERVICE_ACCOUNT eingetragen?"); process.exit(1); }
  const neu = fs.readFileSync(DATEI, "utf8");

  // 1. Aktuelle Regeln holen und sichern
  let alt = "";
  try {
    const rel = await api("GET", RELEASE);
    const rs = await api("GET", rel.rulesetName);
    alt = (rs.source.files || []).map((f) => f.content).join("\n");
    fs.writeFileSync("vorherige-regeln.rules", alt);
    log(`Gesicherte Regeln: ${rel.rulesetName} (Stand ${rel.updateTime})`);
  } catch (e) {
    if (e.status === 404) log("Noch keine Regeln veröffentlicht.");
    else throw e;
  }
  if (alt.trim() === neu.trim()) { log("✅ Die Regeln in Firebase sind schon auf diesem Stand – nichts zu tun."); return; }

  // 2. Prüfen, ob live Sammlungen geregelt sind, die in der Datei fehlen
  const fehlen = [...pfade(alt)].filter((p) => !pfade(neu).has(p));
  if (fehlen.length) {
    log("\n⚠️ Diese Bereiche haben in Firebase eine Regel, in `firebase/firestore.rules` aber nicht:\n");
    fehlen.forEach((p) => log(`- \`${p}\``));
    log("\nOhne Regel wären sie nach dem Einspielen gesperrt. Die Live-Regeln liegen als Sicherung unter „Artifacts“ dieses Laufs.");
    if (process.env.TROTZDEM !== "true") {
      log("Nichts eingespielt. Entweder die Regeln in die Datei übernehmen oder die Aktion mit „trotzdem“ starten.");
      process.exit(1);
    }
    log("„trotzdem“ gewählt – spiele trotzdem ein.");
  }
  const dazu = [...pfade(neu)].filter((p) => !pfade(alt).has(p));
  if (dazu.length) { log("\nNeu geregelte Bereiche:\n"); dazu.forEach((p) => log(`- \`${p}\``)); }

  if (process.env.NUR_VERGLEICHEN === "true") { log("\nNur verglichen, nichts eingespielt."); return; }

  // 3. Hochladen (Firebase prüft die Schreibweise) und freischalten
  const rs = await api("POST", `projects/${PROJEKT}/rulesets`, {
    source: { files: [{ name: "firestore.rules", content: neu }] }
  });
  await api("PATCH", RELEASE, { release: { name: RELEASE, rulesetName: rs.name } });
  log(`\n✅ Neue Regeln sind aktiv (${rs.name}). Zurück geht es in der Firebase-Konsole unter Firestore › Regeln › Verlauf.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { log(`\n❌ ${e.message}`); process.exit(1); });
}
