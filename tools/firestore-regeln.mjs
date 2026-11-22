// Spielt firebase/firestore.rules in das Firebase-Projekt ein (läuft als GitHub Action,
// siehe .github/workflows/firestore-regeln.yml und firebase/ANLEITUNG.md).
//
// Ablauf: aktuelle Regeln aus Firebase holen und als Sicherung ablegen → prüfen, dass
// keine Sammlung verschwindet, die live noch eine Regel hat → neue Regeln hochladen
// (Firebase prüft dabei die Schreibweise) → freischalten.
//
// Umgebung: FIREBASE_SA (Schlüssel-JSON des Dienstkontos), TROTZDEM=true überspringt die
// Sammlungs-Prüfung, NUR_VERGLEICHEN=true lädt nichts hoch.
import fs from "node:fs";
import crypto from "node:crypto";

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

// Schlüssel-JSON lesen (verzeiht typografische Anführungszeichen vom iPhone)
export function leseSchluessel(roh) {
  const text = String(roh || "").trim().replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"');
  if (!text) throw new Error("Das Geheimnis FIREBASE_SERVICE_ACCOUNT ist leer.");
  let sa;
  try { sa = JSON.parse(text); }
  catch { throw new Error(`Das Geheimnis ist kein gültiges JSON (${text.length} Zeichen, beginnt mit „${text.slice(0, 1)}“, endet mit „${text.slice(-1)}“). Wahrscheinlich wurde beim Kopieren nicht alles erwischt – Inhalt der JSON-Datei komplett neu einfügen.`); }
  if (sa.type !== "service_account" || !sa.client_email || !sa.private_key)
    throw new Error("Das Geheimnis ist JSON, aber kein Dienstkonto-Schlüssel (es fehlen type, client_email oder private_key).");
  if (sa.project_id && sa.project_id !== PROJEKT)
    throw new Error(`Der Schlüssel gehört zum Projekt „${sa.project_id}“, nicht zu „${PROJEKT}“.`);
  return sa;
}

// Zugriffs-Token direkt bei Google holen (signiertes JWT, keine Zusatzrechte nötig)
async function holeToken(sa) {
  const b64 = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
  const jetzt = Math.floor(Date.now() / 1000);
  const kopf = b64({ alg: "RS256", typ: "JWT" });
  const inhalt = b64({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token", iat: jetzt, exp: jetzt + 3600 });
  let sig;
  try { sig = crypto.createSign("RSA-SHA256").update(`${kopf}.${inhalt}`).sign(sa.private_key.replace(/\\n/g, "\n"), "base64url"); }
  catch { throw new Error("Der private Schlüssel im Geheimnis ist beschädigt – JSON-Datei komplett neu einfügen."); }
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${kopf}.${inhalt}.${sig}` })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error(`Google lehnt den Schlüssel ab: ${d.error_description || d.error || r.status}. Ist der Schlüssel gelöscht oder das Dienstkonto deaktiviert?`);
  return d.access_token;
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
    const hilfe = r.status === 403 ? " – Hat das Dienstkonto die Rolle „Firebase Rules Admin“?" : "";
    const e = new Error(`${method} ${pfad}: ${r.status} ${msg}${hilfe}`);
    e.status = r.status;
    throw e;
  }
  return text ? JSON.parse(text) : {};
}

async function main() {
  if (!process.env.TOKEN) process.env.TOKEN = await holeToken(leseSchluessel(process.env.FIREBASE_SA));
  log("Anmeldung bei Google ✓");
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
