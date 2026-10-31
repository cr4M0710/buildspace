#!/usr/bin/env node
/* Setzt ein neues Kennwort für protect.js – es wird nur als Hash gespeichert.
   Aufruf:  node tools/passwort-setzen.js full "neues Kennwort"
            node tools/passwort-setzen.js kollegen "neues Kennwort"
   Danach committen. Wer schon angemeldet ist, bleibt angemeldet. */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const [level, pw] = process.argv.slice(2);
if (!["full", "kollegen"].includes(level) || !pw) {
  console.error('Aufruf: node tools/passwort-setzen.js full|kollegen "Kennwort"');
  process.exit(1);
}
if (pw.length < 10) console.warn("Hinweis: Mindestens 10 Zeichen sind sicherer.");

const file = path.join(__dirname, "..", "protect.js");
const src = fs.readFileSync(file, "utf8");
const iter = Number((/const PW_ITER = (\d+);/.exec(src) || [])[1]);
if (!iter) { console.error("PW_ITER nicht gefunden"); process.exit(1); }
const salt = crypto.randomBytes(16);
const hash = crypto.pbkdf2Sync(pw, salt, iter, 32, "sha256").toString("hex");
const re = new RegExp("(" + level + ': \\{ salt: ")[0-9a-f]+(", hash: ")[0-9a-f]+(" \\})');
if (!re.test(src)) { console.error("Eintrag für " + level + " nicht gefunden"); process.exit(1); }
fs.writeFileSync(file, src.replace(re, "$1" + salt.toString("hex") + "$2" + hash + "$3"));
console.log("Kennwort für „" + level + "“ gesetzt.");
