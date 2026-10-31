/* =========================================================
   buildspace – Newsletter-Backend (Google Apps Script)
   ---------------------------------------------------------
   Läuft in Marcs Google-Konto. Speichert Abonnent:innen in einer
   privaten Google-Tabelle, verschickt Bestätigungs-Mails
   (Double-Opt-in) und jeden Sonntag den Wochen-Newsletter mit den
   neuen Tools aus posts-data.js.

   Einrichtung: siehe tools/newsletter/ANLEITUNG.md
   Funktionen zum Ausführen im Editor:
     setup()              – einmalig: Tabelle + Wochen-Zeitplan anlegen
     sendTestDigest()     – Vorschau des Newsletters an dich selbst
     sendWeeklyDigest()   – Versand jetzt auslösen (läuft sonst automatisch)
     status()             – Überblick im Protokoll
   ========================================================= */

var CONFIG = {
  SITE_URL: "https://buildspaceos.de",
  PAGE: "newsletter.html",
  SENDER_NAME: "buildspace Newsletter",
  SEND_DAY: ScriptApp.WeekDay.SUNDAY,
  SEND_HOUR: 18,
  SKIP_IF_EMPTY: true,          // keine Mail, wenn es nichts Neues gibt
  CONFIRM_COOLDOWN_MIN: 10,     // Bestätigungs-Mail höchstens alle 10 Minuten pro Adresse
  MAX_CONFIRM_PER_DAY: 40,      // Schutz des Tageskontingents
  PENDING_DAYS: 7,              // unbestätigte Anmeldungen danach löschen
  KEEP_MAIL_QUOTA: 5            // so viele Mails bleiben als Reserve übrig
};

var HEAD = ["email", "status", "token", "angemeldet", "bestaetigt"];
var SHEET_SUBS = "Abonnenten";
var SHEET_SEEN = "Tools";

/* ---------------- Web-App ---------------- */

function doGet(e) { return handle_(e && e.parameter ? e.parameter : {}); }

function doPost(e) {
  var p = {};
  var src = e && e.parameter ? e.parameter : {};
  for (var k in src) p[k] = src[k];
  // Body als JSON (fetch mit text/plain) oder Formular
  if (e && e.postData && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      for (var b in body) p[b] = body[b];
    } catch (err) { /* Formular-Daten stecken schon in e.parameter */ }
  }
  return handle_(p);
}

function handle_(p) {
  var res;
  try {
    var a = String(p.action || "");
    if (a === "subscribe") res = subscribe_(p.email, p.website);
    else if (a === "confirm") res = confirm_(p.token);
    else if (a === "unsubscribe") res = unsubscribe_(p.token);
    else if (a === "ping") res = { ok: true, code: "pong" };
    else res = { ok: false, code: "unknown_action" };
  } catch (err) {
    console.error(err);
    res = { ok: false, code: "server_error" };
  }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- Anmelden / Bestätigen / Abmelden ---------------- */

function normEmail_(email) {
  return String(email || "").trim().toLowerCase();
}

function validEmail_(email) {
  // Streng: beginnt mit Buchstabe/Ziffer (verhindert u. a. Formeln wie "=…" in der Tabelle)
  return email.length <= 254
    && /^[a-z0-9_][a-z0-9._%+-]{0,63}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,24}$/i.test(email);
}

function subscribe_(rawEmail, honeypot) {
  if (honeypot) return { ok: true, code: "pending" };  // Bot: freundlich ignorieren
  var email = normEmail_(rawEmail);
  if (!validEmail_(email)) return { ok: false, code: "invalid_email" };

  return withLock_(function () {
    var sh = subsSheet_();
    var row = findRow_(sh, 0, email);
    var now = new Date();
    if (row) {
      var status = sh.getRange(row, 2).getValue();
      // Nicht verraten, ob eine Adresse schon angemeldet ist (Datenschutz)
      if (status === "active") return { ok: true, code: "pending" };
      var last = new Date(sh.getRange(row, 4).getValue());
      if (now - last < CONFIG.CONFIRM_COOLDOWN_MIN * 60000) return { ok: true, code: "pending" };
      if (!confirmBudgetOk_()) return { ok: false, code: "busy" };
      var token = sh.getRange(row, 3).getValue();
      sh.getRange(row, 4).setValue(now);
      sendConfirmMail_(email, token);
      return { ok: true, code: "pending" };
    }
    if (!confirmBudgetOk_()) return { ok: false, code: "busy" };
    var t = newToken_();
    sh.appendRow([email, "pending", t, now, ""]);
    sendConfirmMail_(email, t);
    return { ok: true, code: "pending" };
  });
}

function confirm_(token) {
  token = String(token || "");
  if (!/^[a-f0-9]{32}$/.test(token)) return { ok: false, code: "invalid_token" };
  return withLock_(function () {
    var sh = subsSheet_();
    var row = findRow_(sh, 2, token);
    if (!row) return { ok: false, code: "invalid_token" };
    if (sh.getRange(row, 2).getValue() === "active") return { ok: true, code: "already_active" };
    sh.getRange(row, 2).setValue("active");
    sh.getRange(row, 5).setValue(new Date());
    return { ok: true, code: "confirmed" };
  });
}

function unsubscribe_(token) {
  token = String(token || "");
  if (!/^[a-f0-9]{32}$/.test(token)) return { ok: false, code: "invalid_token" };
  return withLock_(function () {
    var sh = subsSheet_();
    var row = findRow_(sh, 2, token);
    // Schon weg? Dann trotzdem „abgemeldet“ – Ziel ist erreicht.
    if (!row) return { ok: true, code: "unsubscribed" };
    sh.deleteRow(row);  // Daten sofort löschen (Datensparsamkeit)
    return { ok: true, code: "unsubscribed" };
  });
}

/* ---------------- Wochen-Newsletter ---------------- */

function sendWeeklyDigest() {
  return withLock_(function () {
    cleanupPending_();
    var posts = loadPosts_();
    var seenSh = seenSheet_();
    var seen = {};
    var seenVals = seenSh.getLastRow() > 1 ? seenSh.getRange(2, 1, seenSh.getLastRow() - 1, 1).getValues() : [];
    seenVals.forEach(function (r) { seen[r[0]] = true; });
    var firstRun = seenVals.length === 0;

    var fresh = posts.filter(function (p) { return !seen[p.url]; });
    var now = new Date();
    if (fresh.length) {
      seenSh.getRange(seenSh.getLastRow() + 1, 1, fresh.length, 2)
        .setValues(fresh.map(function (p) { return [p.url, now]; }));
    }
    if (firstRun) {
      console.log("Erster Lauf: " + fresh.length + " bestehende Tools gemerkt, nichts verschickt.");
      return { sent: 0, tools: 0, firstRun: true };
    }
    if (!fresh.length && CONFIG.SKIP_IF_EMPTY) {
      console.log("Keine neuen Tools – kein Versand.");
      return { sent: 0, tools: 0 };
    }

    var subs = activeSubs_();
    var sent = 0, failed = [];
    subs.forEach(function (s) {
      if (MailApp.getRemainingDailyQuota() <= CONFIG.KEEP_MAIL_QUOTA) { failed.push(s.email); return; }
      try {
        var mail = buildDigest_(fresh, s.token, now);
        MailApp.sendEmail({ to: s.email, subject: mail.subject, htmlBody: mail.html, body: mail.text, name: CONFIG.SENDER_NAME });
        sent++;
      } catch (err) {
        console.error("Versand an " + s.email + " fehlgeschlagen: " + err);
        failed.push(s.email);
      }
    });
    if (failed.length) {
      // Was heute nicht rausging, beim nächsten Lauf erneut versuchen
      var urls = {};
      fresh.forEach(function (p) { urls[p.url] = true; });
      removeSeen_(seenSh, urls);
      console.warn(failed.length + " Empfänger:innen nicht erreicht – Tools bleiben für den nächsten Lauf vorgemerkt.");
    }
    console.log("Newsletter mit " + fresh.length + " Tools an " + sent + " Abonnent:innen verschickt.");
    return { sent: sent, tools: fresh.length, failed: failed.length };
  });
}

/* Vorschau an die eigene Adresse: Tools der letzten 7 Tage (sonst die 4 neuesten),
   ohne etwas zu verändern */
function sendTestDigest() {
  var all = loadPosts_().slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  var since = Utilities.formatDate(new Date(Date.now() - 7 * 86400000), "Europe/Berlin", "yyyy-MM-dd");
  var posts = all.filter(function (p) { return p.date >= since; });
  if (!posts.length) posts = all.slice(0, 4);
  var mail = buildDigest_(posts, "0123456789abcdef0123456789abcdef", new Date());
  var me = Session.getEffectiveUser().getEmail();
  MailApp.sendEmail({ to: me, subject: "[Test] " + mail.subject, htmlBody: mail.html, body: mail.text, name: CONFIG.SENDER_NAME });
  console.log("Test-Newsletter an " + me + " verschickt.");
}

function loadPosts_() {
  var resp = UrlFetchApp.fetch(CONFIG.SITE_URL + "/posts-data.js?nocache=" + Date.now(), { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) throw new Error("posts-data.js nicht erreichbar (" + resp.getResponseCode() + ")");
  var list = new Function(resp.getContentText() + "; return posts;")();
  var byUrl = {}, out = [];
  list.forEach(function (p) {
    if (!p || !p.url || p.gate) return;            // geschützte Unterrichtsmaterialien nicht verlinken
    if (byUrl[p.url]) { byUrl[p.url].areas.push(area_(p)); return; }
    var item = { url: p.url, title: p.title, excerpt: short_(p.excerpt), emoji: p.emoji || "", date: p.date || "", areas: [area_(p)] };
    byUrl[p.url] = item;
    out.push(item);
  });
  return out;
}

var AREAS = {
  schule: "Schule", handball: "Handball", freizeit: "Freizeit",
  mathematik: "Mathematik", arbeitslehre: "Arbeitslehre", faecheruebergreifend: "Classroom Management",
  weiterefaecher: "Weitere Fächer", sonstiges: "Sonstiges", jugend: "Jugend", maenner1: "Männer 1",
  maenner2: "Männer 2", hallendienst: "Hallendienst", training: "Training"
};
function area_(p) {
  var a = AREAS[p.category] || p.category || "";
  return p.subcategory ? a + " · " + (AREAS[p.subcategory] || p.subcategory) : a;
}

function toolLink_(url) {
  return /^https?:\/\//.test(url) ? url : CONFIG.SITE_URL + "/" + url.replace(/^\.?\//, "");
}

/* Kurze Erklärung: lange Beschreibungen nach ca. 200 Zeichen an einer Wortgrenze kürzen */
function short_(s) {
  s = String(s || "").trim();
  if (s.length <= 200) return s;
  var cut = s.slice(0, 200);
  var dot = cut.lastIndexOf(". ");
  if (dot > 110) return cut.slice(0, dot + 1);
  return cut.replace(/[\s,;:–-]+\S*$/, "") + " …";
}

function esc_(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function buildDigest_(tools, token, date) {
  var n = tools.length;
  var dateStr = Utilities.formatDate(date, "Europe/Berlin", "dd.MM.yyyy");
  var subject = n === 0 ? "buildspace – diese Woche nichts Neues"
    : n === 1 ? "Neu auf buildspace: " + tools[0].title
    : n + " neue Tools auf buildspace";
  var unsub = CONFIG.SITE_URL + "/" + CONFIG.PAGE + "?abmelden=" + token;
  var intro = n === 0 ? "Diese Woche ist kein neues Tool dazugekommen."
    : n === 1 ? "Diese Woche ist ein neues Tool dazugekommen:"
    : "Diese Woche sind " + n + " neue Tools dazugekommen:";

  var cards = tools.map(function (t) {
    var link = toolLink_(t.url);
    return '<tr><td style="padding:0 0 12px">' +
      '<a href="' + esc_(link) + '" style="display:block;text-decoration:none;color:#111827;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:16px 18px">' +
      '<div style="font-size:12px;color:#6b7280;letter-spacing:.02em;margin-bottom:4px">' + esc_(t.areas.join(" | ")) + '</div>' +
      '<div style="font-size:17px;font-weight:700;margin-bottom:4px">' + (t.emoji ? esc_(t.emoji) + " " : "") + esc_(t.title) + '</div>' +
      '<div style="font-size:15px;line-height:1.45;color:#374151">' + esc_(t.excerpt) + '</div>' +
      '<div style="font-size:14px;color:#4f46e5;font-weight:600;margin-top:8px">Öffnen →</div>' +
      '</a></td></tr>';
  }).join("");

  var html = '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc_(subject) + '</title></head>' +
    '<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6"><tr><td align="center" style="padding:24px 12px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">' +
    '<tr><td style="background:linear-gradient(135deg,#1e1b4b,#4338ca);background-color:#312e81;border-radius:18px;padding:24px 22px;color:#ffffff">' +
    '<div style="font-size:13px;opacity:.8">Wochen-Newsletter · ' + dateStr + '</div>' +
    '<div style="font-size:26px;font-weight:800;margin-top:4px">buildspace</div>' +
    '<div style="font-size:15px;margin-top:6px;opacity:.9">' + esc_(intro) + '</div></td></tr>' +
    '<tr><td style="height:16px"></td></tr>' + cards +
    '<tr><td align="center" style="padding:8px 0 4px"><a href="' + CONFIG.SITE_URL + '" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px">Alle Tools ansehen</a></td></tr>' +
    '<tr><td style="padding:20px 8px 0;font-size:12px;line-height:1.5;color:#6b7280;text-align:center">' +
    'Du bekommst diese Mail, weil du den buildspace-Newsletter auf buildspaceos.de abonniert hast.<br>' +
    '<a href="' + esc_(unsub) + '" style="color:#6b7280">Newsletter abbestellen</a> · ' +
    '<a href="' + CONFIG.SITE_URL + '/impressum.html" style="color:#6b7280">Impressum</a> · ' +
    '<a href="' + CONFIG.SITE_URL + '/datenschutz.html" style="color:#6b7280">Datenschutz</a></td></tr>' +
    '</table></td></tr></table></body></html>';

  var text = "buildspace – Wochen-Newsletter vom " + dateStr + "\n\n" + intro + "\n\n" +
    tools.map(function (t) {
      return (t.emoji ? t.emoji + " " : "") + t.title + " (" + t.areas.join(" | ") + ")\n" + t.excerpt + "\n" + toolLink_(t.url);
    }).join("\n\n") +
    "\n\nAlle Tools: " + CONFIG.SITE_URL + "\n\nNewsletter abbestellen: " + unsub + "\n";
  return { subject: subject, html: html, text: text };
}

/* ---------------- Bestätigungs-Mail ---------------- */

function sendConfirmMail_(email, token) {
  var link = CONFIG.SITE_URL + "/" + CONFIG.PAGE + "?bestaetigen=" + token;
  var html = '<!doctype html><html lang="de"><head><meta charset="utf-8"></head>' +
    '<body style="margin:0;padding:24px 12px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;border:1px solid #e5e7eb">' +
    '<tr><td style="padding:26px 24px;color:#111827">' +
    '<div style="font-size:24px;font-weight:800">buildspace</div>' +
    '<p style="font-size:16px;line-height:1.5">Fast geschafft! Bitte bestätige deine Anmeldung zum wöchentlichen buildspace-Newsletter. Er kommt einmal pro Woche – nur wenn es neue Tools gibt.</p>' +
    '<p style="text-align:center;margin:26px 0"><a href="' + esc_(link) + '" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 26px;border-radius:999px">Anmeldung bestätigen</a></p>' +
    '<p style="font-size:13px;line-height:1.5;color:#6b7280">Du hast dich nicht angemeldet? Dann ignoriere diese Mail einfach – ohne Bestätigung bekommst du nichts, und deine Adresse wird nach ' + CONFIG.PENDING_DAYS + ' Tagen automatisch gelöscht.</p>' +
    '</td></tr></table></td></tr></table></body></html>';
  var text = "Bitte bestätige deine Anmeldung zum buildspace-Newsletter:\n" + link +
    "\n\nDu hast dich nicht angemeldet? Dann ignoriere diese Mail einfach.";
  MailApp.sendEmail({ to: email, subject: "Bitte bestätigen: buildspace-Newsletter", htmlBody: html, body: text, name: CONFIG.SENDER_NAME });
  countConfirm_();
}

function confirmBudgetOk_() {
  var props = PropertiesService.getScriptProperties();
  var key = "confirm_" + Utilities.formatDate(new Date(), "Europe/Berlin", "yyyyMMdd");
  var n = Number(props.getProperty(key) || 0);
  return n < CONFIG.MAX_CONFIRM_PER_DAY && MailApp.getRemainingDailyQuota() > CONFIG.KEEP_MAIL_QUOTA;
}

function countConfirm_() {
  var props = PropertiesService.getScriptProperties();
  var key = "confirm_" + Utilities.formatDate(new Date(), "Europe/Berlin", "yyyyMMdd");
  props.setProperty(key, String(Number(props.getProperty(key) || 0) + 1));
}

/* ---------------- Tabelle ---------------- */

function book_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("SHEET_ID");
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.create("buildspace Newsletter – Abonnenten (privat)");
  props.setProperty("SHEET_ID", ss.getId());
  return ss;
}

function subsSheet_() {
  var ss = book_();
  var sh = ss.getSheetByName(SHEET_SUBS);
  if (!sh) {
    sh = ss.getSheets()[0];
    if (sh.getLastRow() > 0) sh = ss.insertSheet(SHEET_SUBS);
    sh.setName(SHEET_SUBS);
    sh.appendRow(HEAD);
    sh.setFrozenRows(1);
    sh.getRange("A:C").setNumberFormat("@");  // als reiner Text speichern, nie als Formel
  }
  return sh;
}

function seenSheet_() {
  var ss = book_();
  var sh = ss.getSheetByName(SHEET_SEEN);
  if (!sh) {
    sh = ss.insertSheet(SHEET_SEEN);
    sh.appendRow(["url", "gesehen am"]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function findRow_(sh, col, value) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var vals = sh.getRange(2, col + 1, last - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) if (String(vals[i][0]) === value) return i + 2;
  return 0;
}

function activeSubs_() {
  var sh = subsSheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 3).getValues()
    .filter(function (r) { return r[1] === "active"; })
    .map(function (r) { return { email: r[0], token: r[2] }; });
}

function cleanupPending_() {
  var sh = subsSheet_();
  var last = sh.getLastRow();
  if (last < 2) return;
  var vals = sh.getRange(2, 1, last - 1, 4).getValues();
  var limit = Date.now() - CONFIG.PENDING_DAYS * 86400000;
  for (var i = vals.length - 1; i >= 0; i--) {
    if (vals[i][1] === "pending" && new Date(vals[i][3]).getTime() < limit) sh.deleteRow(i + 2);
  }
}

function removeSeen_(sh, urls) {
  var last = sh.getLastRow();
  if (last < 2) return;
  var vals = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = vals.length - 1; i >= 0; i--) if (urls[vals[i][0]]) sh.deleteRow(i + 2);
}

/* ---------------- Hilfen ---------------- */

function newToken_() {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, Utilities.getUuid() + Utilities.getUuid() + Date.now());
  return bytes.map(function (b) { return ((b + 256) % 256).toString(16).padStart(2, "0"); }).join("");
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* ---------------- Einrichtung ---------------- */

function setup() {
  subsSheet_();
  seenSheet_();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "sendWeeklyDigest") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("sendWeeklyDigest").timeBased()
    .onWeekDay(CONFIG.SEND_DAY).atHour(CONFIG.SEND_HOUR).inTimezone("Europe/Berlin").create();
  // Bestehende Tools merken, damit der erste echte Newsletter nur Neues enthält
  if (seenSheet_().getLastRow() < 2) sendWeeklyDigest();
  status();
}

function status() {
  var sh = subsSheet_();
  var rows = sh.getLastRow() > 1 ? sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues() : [];
  var active = rows.filter(function (r) { return r[0] === "active"; }).length;
  console.log("Tabelle: " + book_().getUrl());
  console.log("Aktive Abos: " + active + ", unbestätigt: " + (rows.length - active));
  console.log("Gemerkte Tools: " + Math.max(0, seenSheet_().getLastRow() - 1));
  console.log("Mail-Kontingent heute noch: " + MailApp.getRemainingDailyQuota());
  console.log("Zeitplan: " + ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); }).join(", "));
}
