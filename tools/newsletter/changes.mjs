#!/usr/bin/env node
/* Änderungsliste für den Newsletter
   ---------------------------------
   Schreibt die Commit-Nachrichten der letzten 60 Tage (ohne Bots, ohne [still],
   ohne „Neues Tool: …“) samt geänderten Dateien nach
   assets/newsletter/changes.json. Das Google-Skript liest die Datei von
   buildspaceos.de und baut daraus „Außerdem verbessert“ – so braucht es die
   GitHub-API nicht (die blockt Anfragen von Google-Servern oft).
   Läuft in der GitHub Action „Newsletter – Vorschaubilder“ (braucht volle
   Git-Historie: actions/checkout mit fetch-depth). */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const SEP = "\u001e", FS = "\u001f";
const raw = execFileSync("git", ["log", "--since=60 days ago", "--no-merges", "--name-only",
  `--format=${SEP}%H${FS}%aI${FS}%an${FS}%ae${FS}%s`], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const out = [];
for (const block of raw.split(SEP).slice(1)) {
  const [head, ...rest] = block.split("\n");
  const [sha, date, name, email, subject] = head.split(FS);
  const msg = (subject || "").trim();
  if (/bot$/i.test(name) || /\[bot\]/.test(email)) continue;
  if (!msg || /\[still\]/i.test(msg) || /^(Merge|Revert)\b/.test(msg) || /^Neues (Tool|Programm)\b/i.test(msg)) continue;
  const files = rest.map((l) => l.trim()).filter((f) => f && !f.startsWith("assets/newsletter/") && !f.startsWith("anwurf/data"));
  out.push({ sha: sha.slice(0, 7), date, msg, files });
}
const file = path.join(root, "assets/newsletter/changes.json");
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify({ commits: out }) + "\n");
console.log(`${out.length} Änderungen nach assets/newsletter/changes.json geschrieben.`);
