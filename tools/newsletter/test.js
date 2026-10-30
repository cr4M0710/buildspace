#!/usr/bin/env node
/* Testet Code.gs lokal mit nachgebauten Google-Diensten.
   Aufruf: node tools/newsletter/test.js   (Exit 1 bei Fehlern) */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const root = path.resolve(__dirname, "../..");
let postsSrc = fs.readFileSync(path.join(root, "posts-data.js"), "utf8");

/* ---------- Nachbau der Google-Dienste ---------- */
function makeEnv(opts = {}) {
  const mails = [];
  const props = {};
  const triggers = [];
  let quota = opts.quota ?? 100;
  let now = opts.now ?? Date.parse("2026-11-01T18:00:00+01:00");

  class Sheet {
    constructor(name) { this.name = name; this.rows = []; }
    getName() { return this.name; }
    setName(n) { this.name = n; }
    getLastRow() { return this.rows.length; }
    appendRow(r) { this.rows.push(r.slice()); }
    deleteRow(i) { this.rows.splice(i - 1, 1); }
    setFrozenRows() {}
    getRange(r, c, nr = 1, nc = 1) {
      const sh = this;
      return {
        getValue: () => (sh.rows[r - 1] || [])[c - 1],
        setValue: (v) => { while (sh.rows.length < r) sh.rows.push([]); sh.rows[r - 1][c - 1] = v; },
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (sh.rows[r - 1 + i] || [])[c - 1 + j] ?? "")),
        setValues: (vals) => vals.forEach((row, i) => row.forEach((v, j) => {
          while (sh.rows.length < r + i) sh.rows.push([]);
          sh.rows[r - 1 + i][c - 1 + j] = v;
        }))
      };
    }
  }
  const book = { sheets: [new Sheet("Tabelle1")], getSheets() { return this.sheets; },
    getSheetByName(n) { return this.sheets.find((s) => s.name === n) || null; },
    insertSheet(n) { const s = new Sheet(n); this.sheets.push(s); return s; },
    getId: () => "BOOK1", getUrl: () => "https://docs.google.com/spreadsheets/d/BOOK1" };

  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a) { super(...(a.length ? a : [now])); }
    static now() { return now; }
  }

  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    Date: FakeDate, JSON, Math, Number, String, Object, Array, Error, RegExp,
    ScriptApp: {
      WeekDay: { SUNDAY: "SUNDAY" },
      getProjectTriggers: () => triggers.map((t) => ({ getHandlerFunction: () => t.fn, _t: t })),
      deleteTrigger: (t) => triggers.splice(triggers.indexOf(t._t), 1),
      newTrigger: (fn) => { const t = { fn }; const b = {
        timeBased: () => b, onWeekDay: (d) => (t.day = d, b), atHour: (h) => (t.hour = h, b),
        inTimezone: (z) => (t.tz = z, b), create: () => (triggers.push(t), t) }; return b; }
    },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); } }) },
    SpreadsheetApp: { create: () => book, openById: (id) => { if (id !== "BOOK1") throw new Error("id"); return book; } },
    MailApp: {
      getRemainingDailyQuota: () => quota,
      sendEmail: (m) => { if (opts.failFor && opts.failFor.includes(m.to)) throw new Error("boom");
        if (quota <= 0) throw new Error("quota"); quota--; mails.push(m); }
    },
    UrlFetchApp: { fetch: (url) => {
      if (!url.startsWith("https://buildspaceos.de/posts-data.js")) throw new Error("falsche URL " + url);
      return { getResponseCode: () => (opts.siteDown ? 503 : 200), getContentText: () => postsSrc }; } },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: (s) => ({ text: s, setMimeType() { return this; } }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => "marc@example.org" }) },
    Utilities: {
      DigestAlgorithm: { MD5: "md5" },
      getUuid: () => crypto.randomUUID(),
      computeDigest: (alg, s) => Array.from(crypto.createHash("md5").update(s).digest()).map((b) => (b > 127 ? b - 256 : b)),
      formatDate: (d, tz, f) => {
        const p = new Intl.DateTimeFormat("de-DE", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
        const g = (t) => p.find((x) => x.type === t).value;
        return f.replace("yyyy", g("year")).replace("MM", g("month")).replace("dd", g("day"));
      }
    }
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "Code.gs"), "utf8"), ctx, { filename: "Code.gs" });
  return {
    ctx, mails, props, triggers, book,
    setQuota: (q) => { quota = q; }, advance: (ms) => { now += ms; },
    api: (p) => JSON.parse(ctx.doGet({ parameter: p }).text),
    post: (body) => JSON.parse(ctx.doPost({ parameter: {}, postData: { contents: JSON.stringify(body) } }).text),
    subs: () => (book.getSheetByName("Abonnenten") || { rows: [[]] }).rows.slice(1)
  };
}

module.exports = { makeEnv, setPosts: (src) => { postsSrc = src; } };
if (require.main !== module) return;

/* ---------- Tests ---------- */
let failed = 0, passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("  ✓ " + name); }
  catch (e) { failed++; console.log("  ✗ " + name + "\n      " + e.message); }
}
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || "") + ` erwartet ${JSON.stringify(b)}, bekommen ${JSON.stringify(a)}`); }
function ok(v, msg) { if (!v) throw new Error(msg || "Bedingung nicht erfüllt"); }
const tokenFrom = (mail, key) => new RegExp(key + "=([a-f0-9]{32})").exec(mail.body)[1];
const addPost = (src, url, title) => src.replace(/\]\s*;\s*$/, `,{ title: "${title}", excerpt: "Kurz erklärt.", date: "2026-11-01", category: "schule", subcategory: "mathematik", url: "${url}", emoji: "🧪", titleEn: "x", excerptEn: "x" }];`);

console.log("Newsletter-Backend");
const original = postsSrc;

test("Anmelden legt unbestätigten Eintrag an und schickt Bestätigungs-Mail", () => {
  const e = makeEnv();
  eq(e.post({ action: "subscribe", email: "  Anna@Example.org " }), { ok: true, code: "pending" });
  eq(e.subs().length, 1); eq(e.subs()[0][0], "anna@example.org"); eq(e.subs()[0][1], "pending");
  eq(e.mails.length, 1); eq(e.mails[0].to, "anna@example.org");
  ok(/newsletter\.html\?bestaetigen=[a-f0-9]{32}/.test(e.mails[0].htmlBody), "Bestätigungslink fehlt");
});

test("Ungültige Adressen werden abgelehnt", () => {
  const e = makeEnv();
  for (const bad of ["", "abc", "a@b", "a b@c.de", "<x>@y.de", "x".repeat(250) + "@y.de"])
    eq(e.api({ action: "subscribe", email: bad }).code, "invalid_email", bad);
  eq(e.mails.length, 0);
});

test("Honeypot (Bot) wird still ignoriert", () => {
  const e = makeEnv();
  eq(e.api({ action: "subscribe", email: "bot@example.org", website: "spam" }).code, "pending");
  eq(e.mails.length, 0); eq(e.subs().length, 0);
});

test("Doppelte Anmeldung: keine zweite Zeile, Mail-Sperre 10 Minuten", () => {
  const e = makeEnv();
  e.api({ action: "subscribe", email: "a@example.org" });
  e.api({ action: "subscribe", email: "A@example.org" });
  eq(e.subs().length, 1); eq(e.mails.length, 1);
  e.advance(11 * 60000);
  e.api({ action: "subscribe", email: "a@example.org" });
  eq(e.mails.length, 2, "nach 10 Min erneut senden");
  eq(tokenFrom(e.mails[0], "bestaetigen"), tokenFrom(e.mails[1], "bestaetigen"), "gleicher Link");
});

test("Bestätigen aktiviert das Abo, zweiter Klick schadet nicht", () => {
  const e = makeEnv();
  e.api({ action: "subscribe", email: "a@example.org" });
  const t = tokenFrom(e.mails[0], "bestaetigen");
  eq(e.api({ action: "confirm", token: t }).code, "confirmed");
  eq(e.subs()[0][1], "active");
  eq(e.api({ action: "confirm", token: t }).code, "already_active");
  eq(e.api({ action: "subscribe", email: "a@example.org" }).code, "already_active");
  eq(e.mails.length, 1);
});

test("Falsche oder manipulierte Links werden abgelehnt", () => {
  const e = makeEnv();
  eq(e.api({ action: "confirm", token: "0".repeat(32) }).code, "invalid_token");
  eq(e.api({ action: "confirm", token: "'; DROP" }).code, "invalid_token");
  eq(e.api({ action: "unsubscribe", token: "zz" }).code, "invalid_token");
  eq(e.api({ action: "foo" }).code, "unknown_action");
  eq(e.api({ action: "ping" }).code, "pong");
});

test("Tokens sind 32 Hex-Zeichen und eindeutig", () => {
  const e = makeEnv();
  const seen = new Set();
  for (let i = 0; i < 30; i++) { e.api({ action: "subscribe", email: `u${i}@example.org` }); }
  e.subs().forEach((r) => { ok(/^[a-f0-9]{32}$/.test(r[2]), r[2]); seen.add(r[2]); });
  eq(seen.size, 30);
});

test("Tageslimit für Bestätigungs-Mails greift (busy)", () => {
  const e = makeEnv();
  for (let i = 0; i < 40; i++) e.api({ action: "subscribe", email: `u${i}@example.org` });
  eq(e.api({ action: "subscribe", email: "late@example.org" }).code, "busy");
  eq(e.mails.length, 40);
});

test("Kontingent fast leer → busy statt Fehler", () => {
  const e = makeEnv({ quota: 5 });
  eq(e.api({ action: "subscribe", email: "a@example.org" }).code, "busy");
});

test("setup(): Tabelle, Zeitplan So 18 Uhr, bestehende Tools gemerkt, nichts verschickt", () => {
  const e = makeEnv();
  e.ctx.setup();
  eq(e.triggers.length, 1); eq(e.triggers[0], { fn: "sendWeeklyDigest", day: "SUNDAY", hour: 18, tz: "Europe/Berlin" });
  ok(e.book.getSheetByName("Tools").rows.length > 50, "Tools gemerkt");
  eq(e.mails.length, 0);
  e.ctx.setup();
  eq(e.triggers.length, 1, "kein doppelter Zeitplan");
});

function confirmed(e, email) {
  e.api({ action: "subscribe", email });
  const t = tokenFrom(e.mails[e.mails.length - 1], "bestaetigen");
  e.api({ action: "confirm", token: t });
  return t;
}

test("Wochenversand: nichts Neues → keine Mail", () => {
  const e = makeEnv();
  e.ctx.setup(); confirmed(e, "a@example.org");
  const before = e.mails.length;
  eq(e.ctx.sendWeeklyDigest().sent, 0);
  eq(e.mails.length, before);
});

test("Wochenversand: neue Tools gehen nur an bestätigte Abos, mit persönlichem Abmeldelink", () => {
  postsSrc = original;
  const e = makeEnv();
  e.ctx.setup();
  confirmed(e, "a@example.org");
  confirmed(e, "b@example.org");
  e.api({ action: "subscribe", email: "pending@example.org" });
  postsSrc = addPost(addPost(original, "neu-eins.html", "Neu Eins"), "neu-zwei.html", "Neu <Zwei> & Co");
  const before = e.mails.length;
  const r = e.ctx.sendWeeklyDigest();
  eq(r.sent, 2); eq(r.tools, 2);
  const digest = e.mails.slice(before);
  eq(digest.map((m) => m.to).sort(), ["a@example.org", "b@example.org"]);
  eq(digest[0].subject, "2 neue Tools auf buildspace");
  ok(digest[0].htmlBody.includes("https://buildspaceos.de/neu-eins.html"), "Link fehlt");
  ok(digest[0].htmlBody.includes("Neu &lt;Zwei&gt; &amp; Co"), "HTML nicht escaped");
  ok(digest[0].body.includes("Kurz erklärt."), "Text-Version fehlt");
  ok(tokenFrom(digest[0], "abmelden") !== tokenFrom(digest[1], "abmelden"), "Abmeldelinks müssen persönlich sein");
  eq(e.ctx.sendWeeklyDigest().sent, 0, "dieselben Tools nicht nochmal");
  postsSrc = original;
});

test("Ein neues Tool: Betreff nennt den Titel", () => {
  const e = makeEnv();
  e.ctx.setup(); confirmed(e, "a@example.org");
  postsSrc = addPost(original, "solo.html", "Solo-Tool");
  const before = e.mails.length;
  e.ctx.sendWeeklyDigest();
  eq(e.mails[before].subject, "Neu auf buildspace: Solo-Tool");
  postsSrc = original;
});

test("Geschützte Materialien (gate) und doppelte Einträge", () => {
  const e = makeEnv();
  const list = vm.runInNewContext(original + "; posts");
  const gated = list.filter((p) => p.gate).map((p) => p.url);
  const items = e.ctx.loadPosts_();
  gated.forEach((u) => ok(!items.some((i) => i.url === u), "gesperrt verlinkt: " + u));
  eq(new Set(items.map((i) => i.url)).size, items.length, "doppelte URLs");
});

test("Abmelden löscht die Adresse sofort; danach keine Mails mehr", () => {
  const e = makeEnv();
  e.ctx.setup();
  confirmed(e, "a@example.org"); confirmed(e, "b@example.org");
  postsSrc = addPost(original, "x1.html", "X1");
  const before = e.mails.length;
  e.ctx.sendWeeklyDigest();
  const mailA = e.mails.slice(before).find((m) => m.to === "a@example.org");
  const t = tokenFrom(mailA, "abmelden");
  eq(e.api({ action: "unsubscribe", token: t }).code, "unsubscribed");
  ok(!e.subs().some((r) => r[0] === "a@example.org"), "Adresse noch gespeichert");
  eq(e.api({ action: "unsubscribe", token: t }).code, "unsubscribed", "zweiter Klick ok");
  // One-Click per POST (wie Mail-Programme es machen)
  postsSrc = addPost(postsSrc, "x2.html", "X2");
  const b2 = e.mails.length;
  e.ctx.sendWeeklyDigest();
  eq(e.mails.slice(b2).map((m) => m.to), ["b@example.org"]);
  const tb = tokenFrom(e.mails[e.mails.length - 1], "abmelden");
  eq(JSON.parse(e.ctx.doPost({ parameter: { action: "unsubscribe", token: tb }, postData: { contents: "List-Unsubscribe=One-Click" } }).text).code, "unsubscribed");
  eq(e.subs().length, 0);
  postsSrc = original;
});

test("Wieder anmelden nach Abmeldung klappt (neuer Link)", () => {
  const e = makeEnv();
  confirmed(e, "a@example.org");
  const t1 = e.subs()[0][2];
  eq(e.api({ action: "unsubscribe", token: t1 }).code, "unsubscribed");
  eq(e.api({ action: "subscribe", email: "a@example.org" }).code, "pending");
  eq(e.subs().length, 1); eq(e.subs()[0][1], "pending");
  ok(e.subs()[0][2] !== t1, "alter Link muss ungültig sein");
  eq(e.api({ action: "confirm", token: t1 }).code, "invalid_token");
});

test("Unbestätigte Anmeldungen werden nach 7 Tagen gelöscht", () => {
  const e = makeEnv();
  e.ctx.setup();
  e.api({ action: "subscribe", email: "old@example.org" });
  e.advance(8 * 86400000);
  e.api({ action: "subscribe", email: "new@example.org" });
  e.ctx.sendWeeklyDigest();
  eq(e.subs().map((r) => r[0]), ["new@example.org"]);
});

test("Kontingent erschöpft: Tools bleiben für nächste Woche vorgemerkt", () => {
  const e = makeEnv();
  e.ctx.setup(); confirmed(e, "a@example.org"); confirmed(e, "b@example.org");
  postsSrc = addPost(original, "q.html", "Q");
  e.setQuota(6);  // reicht für eine Mail
  const r = e.ctx.sendWeeklyDigest();
  eq([r.sent, r.failed], [1, 1]);
  e.setQuota(100);
  eq(e.ctx.sendWeeklyDigest().sent, 2, "nächster Lauf schickt erneut");
  postsSrc = original;
});

test("Fehler beim Versand an eine Adresse stoppt die anderen nicht", () => {
  const e = makeEnv({ failFor: ["a@example.org"] });
  e.ctx.setup(); confirmed(e, "b@example.org");
  e.book.getSheetByName("Abonnenten").appendRow(["a@example.org", "active", "f".repeat(32), new Date(), new Date()]);
  postsSrc = addPost(original, "z.html", "Z");
  const r = e.ctx.sendWeeklyDigest();
  eq([r.sent, r.failed], [1, 1]);
  postsSrc = original;
});

test("Seite nicht erreichbar → Fehler wird gemeldet, nichts gemerkt", () => {
  const e = makeEnv({ siteDown: true });
  let threw = false;
  try { e.ctx.sendWeeklyDigest(); } catch (err) { threw = /nicht erreichbar/.test(err.message); }
  ok(threw, "kein Fehler geworfen");
  eq((e.book.getSheetByName("Tools") || { rows: [] }).rows.length <= 1, true);
});

test("Lange Beschreibungen werden gekürzt", () => {
  const e = makeEnv();
  const long = "Erster Satz erklärt das Tool ausführlich und genau, damit alle wissen, worum es geht und wie es im Unterricht eingesetzt wird. " + "Noch mehr Text ".repeat(20);
  const r = e.ctx.short_(long);
  ok(r.length <= 202, "zu lang: " + r.length); ok(r.endsWith("."), r);
  eq(e.ctx.short_("Kurz."), "Kurz.");
  ok(e.ctx.short_("wort ".repeat(60)).endsWith(" …"));
});

test("Test-Newsletter geht nur an die eigene Adresse", () => {
  const e = makeEnv();
  e.ctx.sendTestDigest();
  eq(e.mails.length, 1); eq(e.mails[0].to, "marc@example.org");
  ok(e.mails[0].subject.startsWith("[Test]"));
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen`);
if (failed) process.exit(1);
