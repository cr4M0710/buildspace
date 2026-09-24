/* ---------------------------------------------------------
   protect.js
   Einmalige Anmeldung für die komplette Seite: Passwort (voller
   Zugriff), Kolleg:innen-Kennwort (Schule + Kolleg:innen-Bereich)
   oder "Als Gast fortfahren" (Zugriff nur auf Schule).

   Dazu mehrere zeitlich begrenzte bzw. dauerhafte Freigaben,
   unabhängig von der Anmeldung — alle über Adresszeilen-Parameter
   gesteuert, damit sie sich als einfacher Link/QR-Code verteilen
   lassen:
     ?share=1&exp=...&cat=...          "Für Lernende freigeben"
                                        (ganze Kategorie, zeitlich
                                        begrenzt)
     ?share=1&exp=...&posts=a.html,b.html[&title=...]
                                        "Kursmappe" (einzelne
                                        Beiträge, zeitlich begrenzt)
     ?vertretung=1                     "Vertretungsstunde" (fester,
                                        nicht ablaufender Satz an
                                        selbsterklärenden Werkzeugen)
     ?embed=1                          Einbettungsmodus (blendet
                                        Navigation/Fußzeile/Rücklink/
                                        Zusatz-Buttons aus, für ein
                                        iFrame z. B. im Schulportal)

   WICHTIG: Das ist eine Komfort-Sperre für eine statische
   GitHub-Pages-Seite, keine echte Serversicherheit. Der
   Quelltext (und damit die Kennwörter) ist für jeden einsehbar,
   der sich die Dateien ansieht. Für wirklich sensible Inhalte
   ist das nicht geeignet.
--------------------------------------------------------- */
(function (global) {
  "use strict";

  const PASSWORD = "mstroh_GGL#99";
  const KOLLEGEN_PASSWORD = "ggl-ipad-team-2026";
  const LABELS = {
    schule: "Schule",
    handball: "Handball",
    freizeit: "Freizeit",
    neueste: "Neueste",
    kollegen: "Kolleg:innen-Bereich"
  };
  const ACCESS_KEY = "buildspace_access_v1";
  const INSTALL_DISMISS_KEY = "buildspace_install_dismissed_until";
  const LOCK_SVG =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5"/><path d="M8 10.5V7.2a4 4 0 0 1 8 0v3.3"/></svg>';

  /* Fest ausgewählte, selbsterklärende Lernspiele ohne jede Vorbereitung
     — erreichbar über den dauerhaften "Vertretungsstunde"-Link, ganz
     ohne Anmeldung. Liste hier UND das Tag "vertretung" in posts-data.js
     halten dieselbe Auswahl fest (getrennt, weil diese Datei auch auf
     einzelnen Werkzeug-Seiten ohne posts-data.js läuft). */
  const VERTRETUNG_FILES = [
    "minigolf-winkel.html",
    "zahlen-werkstatt.html",
    "bruch-quiz-fussball.html",
    "prozent-rennen.html",
    "gleichungs-duell.html",
    "flaechen-fuchs.html",
    "zahlen-detektiv.html",
    "kopfrechen-quiz.html",
    "mathe-fussball.html"
  ];

  /* Werkzeuge mit optionaler, freiwilliger Bestenliste. */
  const HIGHSCORE_FILES = [
    "mathe-fussball.html",
    "bruch-quiz-fussball.html",
    "zahlen-detektiv.html",
    "kopfrechen-quiz.html",
    "prozent-rennen.html",
    "gleichungs-duell.html"
  ];

  /* Dasselbe Firebase-Projekt, das schon für die Kanban-Tools läuft —
     wird hier nur für "Feedback pro Tool" und die Bestenlisten
     nachgeladen (lazy), damit einfache Seiten ohne Klick auf eines der
     beiden Widgets keinerlei zusätzliches Skript laden.
     WICHTIG: kanban-board.html trägt dieselben Werte noch einmal separat
     ein (bewusst NICHT hierher ausgelagert — die Datei ist als
     eigenständige Vorlage gedacht, die sich z. B. eine Kollegin mit einem
     eigenen Firebase-Projekt kopieren kann, siehe Kommentar dort). Ändert
     sich das Projekt hier, bitte dort ebenfalls anpassen. */
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAt35KpU63iGk8UAX5X4T5Vj18zPf_JUus",
    authDomain: "kanban-board-281da.firebaseapp.com",
    projectId: "kanban-board-281da",
    storageBucket: "kanban-board-281da.firebasestorage.app",
    messagingSenderId: "210909884248",
    appId: "1:210909884248:web:10ffacb3a74f7b3c887f2d"
  };

  /* Zeigt für "Zur Startseite" immer auf die echte Top-Level-index.html,
     egal wie tief die aktuelle Seite verschachtelt ist (z. B.
     strafenkasse/index.html lädt protect.js über "../protect.js") —
     wir übernehmen einfach denselben relativen Pfadanteil. */
  let HOME_HREF = "index.html";
  (function captureHomeHref() {
    const scriptTag = document.currentScript;
    const raw = scriptTag && scriptTag.getAttribute("src");
    if (raw) HOME_HREF = raw.replace(/protect\.js(?:\?.*)?$/, "index.html");
  })();

  function nowMs() { return Date.now(); }

  function currentPageFile() {
    const path = location.pathname;
    const base = path.substring(path.lastIndexOf("/") + 1);
    return base || "index.html";
  }

  /* ---------------------------------------------------------
     Zugriffs-Ebene: "full" (Passwort korrekt), "kollegen"
     (Kolleg:innen-Kennwort: Schule + Kolleg:innen-Bereich) oder
     "guest" (als Gast fortgefahren, nur Schule nutzbar). Einmal
     gesetzt, gilt es seitenübergreifend (localStorage), bis der
     Browser-Speicher geleert wird.
  --------------------------------------------------------- */
  function getAccess() {
    try {
      const v = localStorage.getItem(ACCESS_KEY);
      return v === "full" || v === "guest" || v === "kollegen" ? v : null;
    } catch (e) {
      return null;
    }
  }
  function setAccess(level) {
    try { localStorage.setItem(ACCESS_KEY, level); } catch (e) {}
  }
  function categoryAllowedForAccess(cat, access) {
    if (!cat) return true;
    if (access === "full") return true;
    if (access === "kollegen") return cat === "schule" || cat === "kollegen";
    if (access === "guest") return cat === "schule";
    return false;
  }
  function isCategoryAllowed(cat) {
    return categoryAllowedForAccess(cat, getAccess());
  }

  function isEmbedMode() {
    try { return new URLSearchParams(location.search).get("embed") === "1"; }
    catch (e) { return false; }
  }

  function getShareParams() {
    let params;
    try { params = new URLSearchParams(location.search); }
    catch (e) { return { active: false }; }
    const share = params.get("share");
    const exp = Number(params.get("exp") || 0);
    const cat = params.get("cat") || null;
    const postsRaw = params.get("posts") || null;
    const posts = postsRaw ? postsRaw.split(",").map((s) => s.trim()).filter(Boolean) : null;
    const title = params.get("title") || null;
    const vertretung = params.get("vertretung") === "1";
    return { active: share === "1" || vertretung, exp: exp, cat: cat, posts: posts, title: title, vertretung: vertretung };
  }

  function shareStatus(cat) {
    const s = getShareParams();
    if (!s.active) return { active: false };
    const isHomeApp = typeof global.render === "function";
    if (s.vertretung) {
      const applies = isHomeApp || VERTRETUNG_FILES.indexOf(currentPageFile()) !== -1;
      return { active: true, valid: true, exp: null, mode: "vertretung", applies: applies, title: null };
    }
    if (s.posts) {
      const valid = !!s.exp && nowMs() <= s.exp;
      const applies = isHomeApp || s.posts.indexOf(currentPageFile()) !== -1;
      return { active: true, valid: valid, exp: s.exp, mode: "posts", applies: applies, title: s.title, posts: s.posts };
    }
    if (s.cat && cat && s.cat !== cat) return { active: false };
    const valid = !!s.exp && nowMs() <= s.exp;
    return { active: true, valid: valid, exp: s.exp, mode: "cat", applies: true, cat: s.cat };
  }

  function isShareMode() { return getShareParams().active === true; }
  function isVertretungMode() { return getShareParams().vertretung === true; }
  function isKursmappeMode() {
    const s = getShareParams();
    return s.active === true && !!s.posts && !s.vertretung;
  }

  function kursmappeStatus() {
    const s = getShareParams();
    if (!s.active || !s.posts) return { active: false };
    return { active: true, urls: s.posts, title: s.title, exp: s.exp };
  }

  /* Solange eine Freigabe (Kategorie, Kursmappe oder Vertretungsstunde)
     aktiv ist, darf per Routing nur die freigegebene Route erreicht
     werden. Ist gar keine Freigabe aktiv, ist ganz normal alles erlaubt
     (regulärer Anmeldefluss). */
  function isRouteAllowed(cat) {
    const s = getShareParams();
    if (!s.active) return true;
    if (s.vertretung) return cat === "vertretung";
    if (s.posts) return cat === "kursmappe";
    return !!cat && s.cat === cat;
  }

  /* Baut die Abfrageparameter der aktuell aktiven Freigabe, damit sie
     beim Klick von der Übersicht auf einen einzelnen Beitrag mitgegeben
     werden können — sonst würde die Freigabe auf der nächsten Seite
     verloren gehen und dort erneut die Anmeldung verlangt. */
  function shareQueryString() {
    const s = getShareParams();
    if (!s.active) return "";
    if (s.vertretung) return "?vertretung=1";
    const out = new URLSearchParams();
    out.set("share", "1");
    out.set("exp", String(s.exp));
    if (s.posts) {
      out.set("posts", s.posts.join(","));
      if (s.title) out.set("title", s.title);
    } else if (s.cat) {
      out.set("cat", s.cat);
    }
    return "?" + out.toString();
  }

  function kursmappeLinkFor(urlList, minutes, title) {
    const exp = nowMs() + minutes * 60000;
    const base = location.origin + location.pathname;
    const out = new URLSearchParams();
    out.set("share", "1");
    out.set("exp", String(exp));
    out.set("posts", urlList.join(","));
    if (title) out.set("title", title);
    return base + "?" + out.toString() + "#/kursmappe";
  }

  function fmtRemaining(exp) {
    const ms = Math.max(0, exp - nowMs());
    const min = Math.ceil(ms / 60000);
    if (min <= 1) return "unter 1 Minute";
    if (min < 60) return min + " Minuten";
    const h = Math.floor(min / 60), m = min % 60;
    return h + " Std" + (m ? " " + m + " Min" : "");
  }

  function ensureStyle() {
    if (document.getElementById("protect-inline-style")) return;
    const style = document.createElement("style");
    style.id = "protect-inline-style";
    style.textContent = [
      "html:not(.protect-ready):not(.protect-open) body { visibility: hidden; }",
      "#protect-overlay { visibility: visible !important; position: fixed; inset: 0; z-index: 999999;",
      "  display: flex; align-items: center; justify-content: center; padding: 24px;",
      "  background: linear-gradient(135deg, rgba(109,93,251,0.35), rgba(255,79,163,0.28) 40%, rgba(34,211,238,0.28) 70%, rgba(255,180,84,0.3));",
      "  backdrop-filter: blur(36px) saturate(160%); -webkit-backdrop-filter: blur(36px) saturate(160%); }",
      "#protect-overlay .protect-card, #protect-share-modal .protect-card, #protect-highscore-modal .protect-card {",
      "  width: 100%; max-width: 380px; background: linear-gradient(178deg, rgba(255,255,255,0.86), rgba(255,255,255,0.6));",
      "  border: 1px solid rgba(255,255,255,0.65); border-radius: 26px; padding: 32px 28px; text-align: center;",
      "  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8), 0 20px 60px rgba(20,20,30,0.25);",
      "  backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%);",
      "  max-height: calc(100vh - 48px); overflow-y: auto; -webkit-overflow-scrolling: touch;",
      "  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }",
      "#protect-overlay .protect-icon, #protect-share-modal .protect-icon, #protect-highscore-modal .protect-icon {",
      "  width: 52px; height: 52px; margin: 0 auto 14px; border-radius: 16px; display: flex; align-items: center; justify-content: center;",
      "  background: linear-gradient(155deg, rgba(255,255,255,0.9), rgba(255,255,255,0.5)); font-size: 24px;",
      "  box-shadow: inset 0 1px 1px rgba(255,255,255,0.8), 0 6px 16px -4px rgba(30,30,40,0.25); color: #1D1D1F; }",
      "#protect-overlay h2, #protect-share-modal h2, #protect-highscore-modal h2 { margin: 0 0 6px; font-size: 19px; font-weight: 700; color: #1D1D1F; }",
      "#protect-overlay p.protect-sub, #protect-share-modal p.protect-sub, #protect-highscore-modal p.protect-sub { margin: 0 0 18px; font-size: 14px; color: #46464b; }",
      "#protect-overlay input[type=password], #protect-highscore-modal input {",
      "  width: 100%; padding: 12px 14px; font-size: 16px; border-radius: 14px; border: 1px solid rgba(0,0,0,0.12);",
      "  background: rgba(255,255,255,0.7); margin-bottom: 10px; box-sizing: border-box; text-align: center; }",
      "button.protect-submit {",
      "  width: 100%; padding: 12px 14px; font-size: 15px; font-weight: 600; border: none; border-radius: 14px;",
      "  color: #fff; cursor: pointer; background: linear-gradient(155deg, #6D5DFB, #4B3AD6);",
      "  box-shadow: 0 6px 16px -4px rgba(109,93,251,0.55);",
      "  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }",
      "#protect-overlay .protect-error, #protect-share-modal .protect-error, #protect-highscore-modal .protect-error { color: #C23B3B; font-size: 13px; margin-top: 10px; min-height: 16px; }",
      "#protect-overlay .protect-expired {",
      "  background: rgba(224,72,61,0.12); border: 1px solid rgba(224,72,61,0.3); border-radius: 12px;",
      "  padding: 10px 12px; font-size: 13px; color: #a33; margin-bottom: 16px; }",
      "#protect-overlay .protect-alt, #protect-share-modal .protect-close, #protect-highscore-modal .protect-close {",
      "  margin-top: 14px; font-size: 12.5px; color: #6E6E73; background: none; border: none; text-decoration: underline; cursor: pointer; }",
      "#protect-overlay .protect-divider {",
      "  display: flex; align-items: center; gap: 10px; margin: 16px 0 12px;",
      "  font-size: 11.5px; font-weight: 600; color: #8b8b90; text-transform: uppercase; letter-spacing: 0.06em; }",
      "#protect-overlay .protect-divider::before, #protect-overlay .protect-divider::after {",
      "  content: ''; flex: 1; height: 1px; background: rgba(0,0,0,0.12); }",
      "#protect-overlay button.protect-guest-btn {",
      "  width: 100%; padding: 12px 14px; font-size: 15px; font-weight: 600; border-radius: 14px; cursor: pointer;",
      "  color: #1D1D1F; background: rgba(255,255,255,0.55); border: 1px solid rgba(0,0,0,0.14); }",
      "#protect-overlay button.protect-guest-btn:hover { background: rgba(255,255,255,0.8); }",
      "#protect-overlay .protect-guest-hint { margin: 10px 0 0; font-size: 12px; color: #6E6E73; }",
      "#protect-share-btn {",
      "  position: fixed; right: 18px; bottom: 18px; z-index: 9998; display: inline-flex; align-items: center; gap: 8px;",
      "  padding: 12px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.6);",
      "  background: linear-gradient(155deg, rgba(255,255,255,0.88), rgba(255,255,255,0.58));",
      "  backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%);",
      "  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8), 0 8px 24px rgba(20,20,30,0.18);",
      "  font-size: 13.5px; font-weight: 600; color: #1D1D1F; cursor: pointer;",
      "  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;",
      "  transition: transform 0.18s ease; }",
      "#protect-share-btn:hover { transform: translateY(-2px); }",
      "#protect-share-modal, #protect-highscore-modal {",
      "  position: fixed; inset: 0; z-index: 999999; display: flex; align-items: center; justify-content: center;",
      "  padding: 24px; background: rgba(20,20,30,0.35); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }",
      "#protect-share-modal select { width: 100%; padding: 10px 12px; font-size: 15px; border-radius: 12px;",
      "  border: 1px solid rgba(0,0,0,0.12); background: rgba(255,255,255,0.8); margin-bottom: 10px; box-sizing: border-box; }",
      "#protect-share-modal .protect-minutes-row {",
      "  display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }",
      "#protect-share-modal #protect-minutes {",
      "  flex: 1; min-width: 0; padding: 10px 12px; font-size: 16px; font-weight: 600; text-align: center; border-radius: 12px;",
      "  border: 1px solid rgba(0,0,0,0.12); background: rgba(255,255,255,0.8); box-sizing: border-box; }",
      "#protect-share-modal .protect-minutes-suffix { font-size: 13px; color: #46464b; white-space: nowrap; }",
      "#protect-share-modal .protect-minutes-presets {",
      "  display: flex; gap: 6px; margin-bottom: 12px; }",
      "#protect-share-modal .protect-preset-btn {",
      "  flex: 1; padding: 8px 4px; font-size: 13px; font-weight: 600; color: #1D1D1F; cursor: pointer;",
      "  border: 1px solid rgba(0,0,0,0.1); border-radius: 10px; background: rgba(255,255,255,0.6); }",
      "#protect-share-modal .protect-preset-btn:hover { background: rgba(255,255,255,0.9); }",
      "#protect-share-modal .protect-link-row, #protect-highscore-modal .protect-link-row { display: flex; gap: 8px; }",
      "#protect-share-modal .protect-link-row input, #protect-highscore-modal .protect-link-row input { flex: 1; font-size: 12.5px; padding: 10px 10px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.12); background: rgba(255,255,255,0.85); }",
      ".protect-copy-btn { padding: 10px 14px; border-radius: 12px; font-weight: 600; cursor: pointer; color: #1D1D1F;",
      "  border: 1px solid rgba(0,0,0,0.1); background: rgba(255,255,255,0.9);",
      "  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }",
      ".protect-qr-wrap { display: flex; justify-content: center; margin: 14px 0 4px; }",
      ".protect-qr-wrap svg { width: 152px; height: 152px; border-radius: 14px; background: #fff; padding: 10px; box-shadow: 0 6px 16px -4px rgba(20,20,30,0.2); }",
      "#protect-share-modal .protect-qr-hint { font-size: 11.5px; color: #6E6E73; text-align: center; margin: 8px 0 0; }",
      "html.share-mode .site-logo, html.share-mode .nav-brand, html.share-mode .breadcrumb a { pointer-events: none; opacity: 0.45; }",
      "html.share-mode #protect-share-btn { display: none; }",
      ".protect-banner {",
      "  position: fixed; top: 0; left: 0; right: 0; z-index: 9997; text-align: center; font-size: 12.5px;",
      "  font-weight: 600; color: #fff; padding: 8px 10px; background: linear-gradient(90deg, #6D5DFB, #22D3EE); }",
      "@media (max-width: 480px) { #protect-share-btn span.protect-share-label { display: none; } }",
      /* Update-Banner */
      ".protect-update-banner {",
      "  position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 999998;",
      "  display: flex; align-items: center; gap: 12px; padding: 10px 12px 10px 18px; border-radius: 999px;",
      "  background: linear-gradient(155deg, rgba(30,30,38,0.92), rgba(20,20,28,0.92)); color: #fff;",
      "  font-size: 13px; font-weight: 600; box-shadow: 0 10px 30px rgba(0,0,0,0.35); backdrop-filter: blur(10px); }",
      ".protect-update-banner button {",
      "  padding: 7px 14px; border-radius: 999px; border: none; font-weight: 700; font-size: 12.5px; cursor: pointer;",
      "  color: #1D1D1F; background: #fff; }",
      /* Installations-Hinweis (PWA) */
      ".protect-install-banner {",
      "  position: fixed; right: 18px; bottom: 78px; z-index: 9998; display: flex; align-items: center; flex-wrap: wrap; gap: 10px;",
      "  max-width: 280px; padding: 10px 10px 10px 16px; border-radius: 20px;",
      "  background: linear-gradient(155deg, rgba(30,30,38,0.92), rgba(20,20,28,0.92)); color: #fff;",
      "  font-size: 12.5px; font-weight: 600; box-shadow: 0 10px 30px rgba(0,0,0,0.35); backdrop-filter: blur(10px);",
      "  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }",
      ".protect-install-banner #protect-install-btn {",
      "  padding: 7px 12px; border-radius: 999px; border: none; font-weight: 700; font-size: 12px; cursor: pointer;",
      "  color: #1D1D1F; background: #fff; }",
      ".protect-install-banner #protect-install-dismiss {",
      "  border: none; background: none; color: rgba(255,255,255,0.7); font-size: 15px; cursor: pointer; padding: 2px 4px; line-height: 1; }",
      /* Feedback-Widget */
      ".protect-feedback-widget {",
      "  position: fixed; left: 18px; bottom: 18px; z-index: 9998; display: flex; align-items: center; gap: 8px;",
      "  padding: 10px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.6);",
      "  background: linear-gradient(155deg, rgba(255,255,255,0.88), rgba(255,255,255,0.58));",
      "  backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%);",
      "  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8), 0 8px 24px rgba(20,20,30,0.18);",
      "  font-size: 13px; font-weight: 600; color: #1D1D1F;",
      "  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }",
      ".protect-feedback-btn { border: none; background: none; font-size: 17px; cursor: pointer; padding: 2px 3px; line-height: 1; }",
      ".protect-feedback-btn:disabled { opacity: 0.5; cursor: default; }",
      ".protect-feedback-thanks { opacity: 0.9; }",
      ".protect-feedback-comment-link {",
      "  border: none; background: none; font-size: 12px; text-decoration: underline; color: #1D1D1F; cursor: pointer; padding: 0; margin-left: 2px; }",
      ".protect-feedback-comment-input {",
      "  font: inherit; font-size: 13px; padding: 5px 10px; border-radius: 999px; border: 1px solid rgba(0,0,0,0.15); width: 150px; background: rgba(255,255,255,0.85); }",
      /* Bestenlisten-Button + Panel */
      ".protect-highscore-btn {",
      "  position: fixed; left: 18px; bottom: 66px; z-index: 9998; display: inline-flex; align-items: center; gap: 6px;",
      "  padding: 10px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.6); cursor: pointer;",
      "  background: linear-gradient(155deg, rgba(255,255,255,0.88), rgba(255,255,255,0.58));",
      "  backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%);",
      "  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8), 0 8px 24px rgba(20,20,30,0.18);",
      "  font-size: 13px; font-weight: 600; color: #1D1D1F;",
      "  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }",
      "#protect-highscore-modal .protect-hs-list { text-align: left; margin-top: 14px; max-height: 220px; overflow-y: auto; }",
      "#protect-highscore-modal .protect-hs-list ol { list-style: decimal; margin: 0; padding-left: 20px; }",
      "#protect-highscore-modal .protect-hs-list li { display: flex; justify-content: space-between; gap: 10px; padding: 4px 0; font-size: 14px; }",
      "#protect-highscore-modal .protect-hs-loading { font-size: 13px; color: #6E6E73; text-align: center; }",
      /* Embed-Modus: Navigation/Fußzeile/Rücklink & Zusatz-Buttons ausblenden */
      "html.embed-mode .site-nav, html.embed-mode .hero, html.embed-mode .site-footer, html.embed-mode .top-link,",
      "html.embed-mode #protect-share-btn, html.embed-mode .protect-update-banner,",
      "html.embed-mode .protect-install-banner,",
      "html.embed-mode .protect-feedback-widget, html.embed-mode .protect-highscore-btn { display: none !important; }",
      /* Druckansicht: schwebende Bedienelemente sollen nie mit ausgedruckt werden */
      "@media print {",
      "  #protect-share-btn, .protect-update-banner, .protect-install-banner,",
      "  .protect-feedback-widget, .protect-highscore-btn, .protect-banner { display: none !important; }",
      "}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function closeOverlay() {
    const el = document.getElementById("protect-overlay");
    if (el) el.remove();
    document.documentElement.classList.remove("protect-open");
  }

  function checkPasswordInput(value) {
    if (value === PASSWORD) return "full";
    if (value === KOLLEGEN_PASSWORD) return "kollegen";
    return null;
  }

  /* Einmalige Anmeldung: Passwort (voller Zugriff), Kolleg:innen-
     Kennwort oder als Gast fortfahren (nur Schule). onResolved wird
     nach jeder erfolgreichen Wahl aufgerufen — der Aufrufer prüft
     danach selbst per isCategoryAllowed(cat), ob der ursprünglich
     gewünschte Bereich damit erreichbar ist. */
  function showLoginOverlay(expiredHint, onResolved) {
    ensureStyle();
    document.documentElement.classList.add("protect-open");
    const wrap = document.createElement("div");
    wrap.id = "protect-overlay";
    wrap.innerHTML =
      '<div class="protect-card">' +
        '<div class="protect-icon">' + LOCK_SVG + "</div>" +
        "<h2>Anmeldung</h2>" +
        (expiredHint
          ? '<div class="protect-expired">Dieser Freigabe-Link ist abgelaufen. Bitte anmelden.</div>'
          : '<p class="protect-sub">Bitte melde dich an, um buildspace zu nutzen.</p>') +
        '<form id="protect-form" autocomplete="off">' +
          '<input type="password" id="protect-input" placeholder="Passwort" autofocus />' +
          '<button type="submit" class="protect-submit">Anmelden</button>' +
        "</form>" +
        '<div class="protect-error" id="protect-error"></div>' +
        '<div class="protect-divider"><span>oder</span></div>' +
        '<button type="button" class="protect-guest-btn" id="protect-guest-btn">Als Gast fortfahren</button>' +
        '<p class="protect-guest-hint">Als Gast hast du nur Zugriff auf den Bereich Schule.</p>' +
      "</div>";
    document.body.appendChild(wrap);
    const form = wrap.querySelector("#protect-form");
    const input = wrap.querySelector("#protect-input");
    const errorEl = wrap.querySelector("#protect-error");
    const guestBtn = wrap.querySelector("#protect-guest-btn");
    setTimeout(() => input.focus(), 30);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const level = checkPasswordInput(input.value);
      if (level) {
        setAccess(level);
        closeOverlay();
        onResolved();
      } else {
        errorEl.textContent = "Falsches Passwort — bitte erneut versuchen.";
        input.value = "";
        input.focus();
      }
    });
    guestBtn.addEventListener("click", function () {
      setAccess("guest");
      closeOverlay();
      onResolved();
    });
  }

  /* Wird gezeigt, wenn jemand mit Gast- oder Kolleg:innen-Zugriff einen
     Bereich erreichen will, der für die aktuelle Ebene nicht freigegeben
     ist — bietet weiterhin die Möglichkeit, sich per Passwort
     hochzustufen, statt einfach nur abzuweisen. */
  function showBlockedOverlay(cat, onUpgraded) {
    ensureStyle();
    document.documentElement.classList.add("protect-open");
    const wrap = document.createElement("div");
    wrap.id = "protect-overlay";
    const label = LABELS[cat] || cat;
    wrap.innerHTML =
      '<div class="protect-card">' +
        '<div class="protect-icon">' + LOCK_SVG + "</div>" +
        "<h2>" + label + " ist hier nicht verfügbar</h2>" +
        '<p class="protect-sub">Mit dem passenden Zugangscode kannst du auch diesen Bereich freischalten.</p>' +
        '<form id="protect-form" autocomplete="off">' +
          '<input type="password" id="protect-input" placeholder="Passwort" autofocus />' +
          '<button type="submit" class="protect-submit">Freischalten</button>' +
        "</form>" +
        '<div class="protect-error" id="protect-error"></div>' +
        '<button type="button" class="protect-alt" id="protect-home-btn">Zur Startseite</button>' +
      "</div>";
    document.body.appendChild(wrap);
    const form = wrap.querySelector("#protect-form");
    const input = wrap.querySelector("#protect-input");
    const errorEl = wrap.querySelector("#protect-error");
    const homeBtn = wrap.querySelector("#protect-home-btn");
    setTimeout(() => input.focus(), 30);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const level = checkPasswordInput(input.value);
      if (level) {
        setAccess(level);
        closeOverlay();
        onUpgraded();
      } else {
        errorEl.textContent = "Falsches Passwort — bitte erneut versuchen.";
        input.value = "";
        input.focus();
      }
    });
    homeBtn.addEventListener("click", function () {
      location.href = HOME_HREF + "#/";
    });
  }

  /* Wird gezeigt, wenn ein Werkzeug über einen gültigen Kursmappen- oder
     Vertretungsstunden-Link erreicht wird, aber selbst nicht Teil dieser
     Auswahl ist (z. B. Adresse von Hand geändert). */
  function showNotIncludedOverlay(s) {
    ensureStyle();
    document.documentElement.classList.add("protect-open");
    const wrap = document.createElement("div");
    wrap.id = "protect-overlay";
    const backHash = s.mode === "vertretung" ? "#/vertretung" : "#/kursmappe";
    wrap.innerHTML =
      '<div class="protect-card">' +
        '<div class="protect-icon">' + LOCK_SVG + "</div>" +
        "<h2>Nicht Teil dieser Freigabe</h2>" +
        '<p class="protect-sub">Dieses Werkzeug gehört nicht zur aktuell freigegebenen Auswahl.</p>' +
        '<button type="button" class="protect-submit" id="protect-back-btn">Zurück</button>' +
      "</div>";
    document.body.appendChild(wrap);
    wrap.querySelector("#protect-back-btn").addEventListener("click", function () {
      location.href = HOME_HREF + shareQueryString() + backHash;
    });
  }

  function showBanner(text) {
    if (document.querySelector(".protect-banner")) return;
    const b = document.createElement("div");
    b.className = "protect-banner";
    b.textContent = text;
    document.body.appendChild(b);
  }

  function clearBanner() {
    const b = document.querySelector(".protect-banner");
    if (b) b.remove();
  }

  /* cat ist optional: ohne Kategorie (z. B. die Startseite) reicht
     irgendeine Anmeldung (Passwort, Kolleg:innen-Kennwort ODER Gast);
     mit Kategorie muss diese zusätzlich für die aktuelle Zugriffs-Ebene
     erlaubt sein. */
  function guard(cat, onUnlock) {
    ensureStyle();
    clearBanner();

    const s = shareStatus(cat);
    if (s.active && s.valid && s.applies) {
      document.documentElement.classList.add("share-mode");
      const label =
        s.mode === "vertretung"
          ? "Vertretungsstunde — Zugriff ohne Anmeldung."
          : s.mode === "posts"
          ? "Kursmappe" + (s.title ? " „" + s.title + "“" : "") + " — noch " + fmtRemaining(s.exp) + " gültig."
          : "Freigegeben zum Lernen — noch " + fmtRemaining(s.exp) + " gültig. Läuft danach automatisch ab.";
      showBanner(label);
      onUnlock();
      return;
    }
    if (s.active && s.valid && !s.applies) {
      showNotIncludedOverlay(s);
      return;
    }
    document.documentElement.classList.remove("share-mode");

    const access = getAccess();
    if (access) {
      if (categoryAllowedForAccess(cat, access)) {
        onUnlock();
      } else {
        showBlockedOverlay(cat, onUnlock);
      }
      return;
    }
    showLoginOverlay(s.active && !s.valid, function () {
      if (categoryAllowedForAccess(cat, getAccess())) {
        onUnlock();
      } else {
        showBlockedOverlay(cat, onUnlock);
      }
    });
  }

  function shareLinkFor(cat, minutes) {
    const exp = nowMs() + minutes * 60000;
    const url = new URL(location.href);
    url.searchParams.set("share", "1");
    url.searchParams.set("exp", String(exp));
    if (cat) url.searchParams.set("cat", cat);
    return url.toString();
  }

  function renderQrCode(container, text) {
    if (!container) return;
    if (typeof global.qrcode !== "function") {
      container.innerHTML = "";
      return;
    }
    try {
      const qr = global.qrcode(0, "M");
      qr.addData(text);
      qr.make();
      container.innerHTML = qr.createSvgTag(5, 8);
    } catch (e) {
      container.innerHTML = "";
    }
  }

  /* ---------------------------------------------------------
     Handzettel drucken -- auf iOS/iPadOS als Startbildschirm-App
     (navigator.standalone === true) öffnet window.print() KEINEN Dialog:
     Es fehlt schlicht die Safari-Oberfläche, die den Druckdialog anzeigen
     würde -- eine Apple-Einschränkung, die sich seitenseitig nicht beheben
     lässt (window.print() liefert dort keinen Fehler, tut aber nichts).
     In der normalen Safari (Browser-Tab), auf dem Desktop und in
     installierten Android/Desktop-PWAs funktioniert window.print() dagegen
     ganz normal -- daher wird NUR für den iOS-Startbildschirm-Fall
     umgeschaltet: Der Handzettel wird stattdessen als Bild gezeichnet und
     über das native "Teilen"-Menü angeboten, von wo aus sich per AirPrint
     drucken oder das Bild in Fotos/Dateien sichern lässt.
  --------------------------------------------------------- */
  function isIosHomeScreenApp() {
    try {
      return global.navigator.standalone === true;
    } catch (e) {
      return false;
    }
  }

  function wrapCanvasLines(ctx, text, maxWidth) {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let current = "";
    for (let i = 0; i < words.length; i += 1) {
      const test = current ? current + " " + words[i] : words[i];
      if (current && ctx.measureText(test).width > maxWidth) {
        lines.push(current);
        current = words[i];
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  const HANDOUT_FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  /* Zeichnet Titel, Hinweistext, Liste und QR-Code direkt als Pixel auf ein
     <canvas> -- der QR-Code wird dabei modulweise selbst gezeichnet (isDark/
     getModuleCount aus qrcode-generator.js), nicht als SVG/Bild eingefügt,
     damit keine (auf älterem WebKit bekannte) Canvas-Sicherheitsprobleme mit
     eingebetteten SVG-Bildern auftreten können. */
  function buildHandoutCanvas(opts) {
    const title = opts.title || "";
    const meta = opts.meta || "";
    const items = opts.items || [];
    const qrText = opts.qrText || "";

    const scale = 2;
    const width = 900;
    const padding = 50;
    const maxTextWidth = width - padding * 2;
    const titleFont = "700 40px " + HANDOUT_FONT_STACK;
    const metaFont = "22px " + HANDOUT_FONT_STACK;
    const itemFont = "24px " + HANDOUT_FONT_STACK;
    const titleLineHeight = 50, metaLineHeight = 30, itemLineHeight = 34, itemGap = 8;

    const measure = document.createElement("canvas").getContext("2d");
    measure.font = titleFont;
    const titleLines = wrapCanvasLines(measure, title, maxTextWidth);
    measure.font = metaFont;
    const metaLines = meta ? wrapCanvasLines(measure, meta, maxTextWidth) : [];
    measure.font = itemFont;
    const itemLineGroups = items.map((it) => wrapCanvasLines(measure, "•  " + it, maxTextWidth - 20));

    let qrProbe = null, qrModuleCount = 0, qrSize = 0;
    const qrCellSize = 8, qrMargin = 20;
    if (qrText && typeof global.qrcode === "function") {
      try {
        qrProbe = global.qrcode(0, "M");
        qrProbe.addData(qrText);
        qrProbe.make();
        qrModuleCount = qrProbe.getModuleCount();
        qrSize = qrModuleCount * qrCellSize + qrMargin * 2;
      } catch (e) {
        qrProbe = null;
      }
    }

    let contentHeight = padding + titleLines.length * titleLineHeight;
    if (metaLines.length) contentHeight += 14 + metaLines.length * metaLineHeight;
    if (itemLineGroups.length) {
      contentHeight += 26;
      itemLineGroups.forEach((lines) => { contentHeight += lines.length * itemLineHeight + itemGap; });
    }
    if (qrSize) contentHeight += 30 + qrSize;
    contentHeight += padding;

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = contentHeight * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, contentHeight);

    let cy = padding;
    ctx.fillStyle = "#1D1D1F";
    ctx.font = titleFont;
    titleLines.forEach((line) => { ctx.fillText(line, padding, cy); cy += titleLineHeight; });

    if (metaLines.length) {
      cy += 14;
      ctx.fillStyle = "#46464b";
      ctx.font = metaFont;
      metaLines.forEach((line) => { ctx.fillText(line, padding, cy); cy += metaLineHeight; });
    }

    if (itemLineGroups.length) {
      cy += 26;
      ctx.fillStyle = "#1D1D1F";
      ctx.font = itemFont;
      itemLineGroups.forEach((lines) => {
        lines.forEach((line, idx) => { ctx.fillText(line, padding + (idx === 0 ? 0 : 20), cy); cy += itemLineHeight; });
        cy += itemGap;
      });
    }

    if (qrSize && qrProbe) {
      cy += 30;
      const qx = (width - qrSize) / 2;
      ctx.fillStyle = "#000000";
      for (let r = 0; r < qrModuleCount; r += 1) {
        for (let c = 0; c < qrModuleCount; c += 1) {
          if (qrProbe.isDark(r, c)) {
            ctx.fillRect(qx + qrMargin + c * qrCellSize, cy + qrMargin + r * qrCellSize, qrCellSize, qrCellSize);
          }
        }
      }
    }

    return canvas;
  }

  function shareOrDownloadCanvas(canvas, filename, shareTitle) {
    canvas.toBlob((blob) => {
      if (!blob) return;
      let file = null;
      try { file = new global.File([blob], filename, { type: "image/png" }); } catch (e) { file = null; }
      if (file && global.navigator.canShare && global.navigator.canShare({ files: [file] })) {
        global.navigator.share({ files: [file], title: shareTitle || "" }).catch(() => {});
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      alert('Der Handzettel wurde als Bild gespeichert. Zum Drucken: Bild öffnen und über "Teilen" → "Drucken" auswählen.');
    }, "image/png");
  }

  /* Gemeinsamer Einstiegspunkt für alle Drucken-Knöpfe: normal einfach
     window.print(), nur auf iOS-Startbildschirm-Apps stattdessen der
     Bild+Teilen-Weg (siehe Kommentar oben bei isIosHomeScreenApp). */
  function printHandout(opts) {
    if (!isIosHomeScreenApp()) {
      global.print();
      return;
    }
    try {
      const canvas = buildHandoutCanvas(opts || {});
      shareOrDownloadCanvas(canvas, (opts && opts.filename) || "handzettel.png", (opts && opts.title) || "buildspace");
    } catch (e) {
      global.print();
    }
  }

  function openShareModal(cat) {
    ensureStyle();
    const wrap = document.createElement("div");
    wrap.id = "protect-share-modal";
    wrap.innerHTML =
      '<div class="protect-card">' +
        '<div class="protect-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg></div>' +
        "<h2>Für Lernende freigeben</h2>" +
        '<p class="protect-sub">Erzeuge einen Link, der diese Seite ohne Anmeldung öffnet — automatisch zeitlich begrenzt.</p>' +
        '<div class="protect-minutes-row">' +
          '<input type="number" id="protect-minutes" min="1" max="1440" step="1" value="30" inputmode="numeric" />' +
          '<span class="protect-minutes-suffix">Minuten gültig</span>' +
        "</div>" +
        '<div class="protect-minutes-presets">' +
          '<button type="button" class="protect-preset-btn" data-min="15">15</button>' +
          '<button type="button" class="protect-preset-btn" data-min="30">30</button>' +
          '<button type="button" class="protect-preset-btn" data-min="45">45</button>' +
          '<button type="button" class="protect-preset-btn" data-min="90">90</button>' +
          '<button type="button" class="protect-preset-btn" data-min="180">180</button>' +
        "</div>" +
        '<button class="protect-submit" id="protect-make-link" style="width:100%;">Link erstellen</button>' +
        '<div id="protect-link-area" style="display:none; margin-top:14px; text-align:left;">' +
          '<div class="protect-link-row">' +
            '<input type="text" id="protect-link-out" readonly />' +
            '<button class="protect-copy-btn" id="protect-copy-btn">Kopieren</button>' +
          "</div>" +
          '<div class="protect-error" id="protect-copy-msg" style="color:#2F6F4F;"></div>' +
          '<div class="protect-qr-wrap" id="protect-qr-wrap"></div>' +
          '<p class="protect-qr-hint">QR-Code scannen, um den Link direkt zu öffnen.</p>' +
        "</div>" +
        '<button class="protect-close" id="protect-close-btn">Schließen</button>' +
      "</div>";
    document.body.appendChild(wrap);
    wrap.addEventListener("click", (e) => { if (e.target === wrap) wrap.remove(); });
    wrap.querySelector("#protect-close-btn").addEventListener("click", () => wrap.remove());
    wrap.querySelectorAll(".protect-preset-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        wrap.querySelector("#protect-minutes").value = btn.dataset.min;
      });
    });
    wrap.querySelector("#protect-make-link").addEventListener("click", () => {
      const minutesInput = wrap.querySelector("#protect-minutes");
      let minutes = Math.round(Number(minutesInput.value));
      if (!minutes || minutes < 1) minutes = 30;
      if (minutes > 1440) minutes = 1440;
      minutesInput.value = String(minutes);
      const link = shareLinkFor(cat, minutes);
      const out = wrap.querySelector("#protect-link-out");
      out.value = link;
      wrap.querySelector("#protect-link-area").style.display = "block";
      out.focus(); out.select();
      wrap.querySelector("#protect-copy-msg").textContent = "";
      renderQrCode(wrap.querySelector("#protect-qr-wrap"), link);
    });
    wrap.querySelector("#protect-copy-btn").addEventListener("click", async () => {
      const out = wrap.querySelector("#protect-link-out");
      const msg = wrap.querySelector("#protect-copy-msg");
      try {
        await navigator.clipboard.writeText(out.value);
        msg.textContent = "Link kopiert!";
      } catch (e) {
        out.select();
        try { document.execCommand("copy"); msg.textContent = "Link kopiert!"; }
        catch (e2) { msg.textContent = "Bitte manuell kopieren."; }
      }
    });
  }

  function addShareButton(cat) {
    const existing = document.getElementById("protect-share-btn");
    if (isShareMode()) { if (existing) existing.remove(); return; }
    if (existing) { existing.dataset.cat = cat; return; }
    ensureStyle();
    const btn = document.createElement("button");
    btn.id = "protect-share-btn";
    btn.dataset.cat = cat;
    btn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg>' +
      '<span class="protect-share-label">Für Lernende freigeben</span>';
    btn.addEventListener("click", () => openShareModal(btn.dataset.cat));
    document.body.appendChild(btn);
  }

  function removeShareButton() {
    const el = document.getElementById("protect-share-btn");
    if (el) el.remove();
  }

  /* ---------------------------------------------------------
     Firebase (lazy) — dasselbe Projekt wie die Kanban-Tools, aber nur
     für Feedback/Bestenlisten. Lädt erst beim ersten tatsächlichen
     Bedarf (Klick), damit einfache Seiten ohne dieses Skript auskommen.
  --------------------------------------------------------- */
  let firebaseReadyPromise = null;
  function loadScriptTag(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  function loadFirebase() {
    if (firebaseReadyPromise) return firebaseReadyPromise;
    firebaseReadyPromise = loadScriptTag("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js")
      .then(() =>
        Promise.all([
          loadScriptTag("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore-compat.js"),
          loadScriptTag("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth-compat.js")
        ])
      )
      .then(() => {
        if (!global.firebase.apps || !global.firebase.apps.length) {
          global.firebase.initializeApp(FIREBASE_CONFIG);
        }
        const db = global.firebase.firestore();
        const auth = global.firebase.auth();
        return new Promise((resolve, reject) => {
          if (auth.currentUser) {
            resolve({ db: db, auth: auth });
            return;
          }
          auth.signInAnonymously()
            .then(() => resolve({ db: db, auth: auth }))
            .catch(reject);
        });
      });
    return firebaseReadyPromise;
  }

  /* ---------------------------------------------------------
     Leises Feedback pro Werkzeug-Seite (👍/👎). Speichert pro Gerät,
     ob schon abgestimmt wurde, damit nicht mehrfach gezählt wird.
  --------------------------------------------------------- */
  function initFeedbackWidget(cat) {
    if (!cat || isEmbedMode()) return;
    const file = currentPageFile();
    const voteKey = "buildspace_feedback_" + file;
    let existingVote = null;
    try { existingVote = localStorage.getItem(voteKey); } catch (e) {}

    const wrap = document.createElement("div");
    wrap.className = "protect-feedback-widget";

    /* docRef ist nur gesetzt, wenn das Speichern der Stimme tatsächlich
       geklappt hat (sonst gäbe es nichts, an das ein Kommentar später per
       update() angehängt werden könnte) — der optionale Kommentar-Link
       erscheint dann still mit, ohne die schnelle 👍/👎-Abstimmung selbst
       zu verlangsamen. */
    function renderThanks(docRef) {
      wrap.innerHTML =
        '<span class="protect-feedback-thanks">Danke für dein Feedback! 🙌</span>' +
        (docRef ? '<button type="button" class="protect-feedback-comment-link" id="protect-fb-comment-link">Kommentar?</button>' : "");
      const link = wrap.querySelector("#protect-fb-comment-link");
      if (link) link.addEventListener("click", () => renderCommentBox(docRef));
    }
    function renderCommentBox(docRef) {
      wrap.innerHTML =
        '<input type="text" class="protect-feedback-comment-input" id="protect-fb-comment-input" placeholder="Kurz sagen, warum? (optional)" maxlength="140">' +
        '<button type="button" class="protect-feedback-btn" id="protect-fb-comment-send" aria-label="Absenden">➤</button>';
      const input = wrap.querySelector("#protect-fb-comment-input");
      setTimeout(() => input.focus(), 20);
      function send() {
        const val = input.value.trim().slice(0, 140);
        wrap.innerHTML = '<span class="protect-feedback-thanks">Danke! 🙌</span>';
        if (val) docRef.update({ comment: val }).catch(() => {});
      }
      wrap.querySelector("#protect-fb-comment-send").addEventListener("click", send);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
    }
    function renderButtons() {
      wrap.innerHTML =
        '<span class="protect-feedback-label">War das hilfreich?</span>' +
        '<button type="button" class="protect-feedback-btn" data-vote="up" aria-label="Hilfreich">👍</button>' +
        '<button type="button" class="protect-feedback-btn" data-vote="down" aria-label="Nicht hilfreich">👎</button>';
      wrap.querySelectorAll(".protect-feedback-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const vote = btn.dataset.vote;
          wrap.querySelectorAll(".protect-feedback-btn").forEach((b) => (b.disabled = true));
          loadFirebase()
            .then(({ db }) => db.collection("tool_feedback").add({ tool: file, vote: vote, ts: Date.now() }))
            .then((docRef) => {
              try { localStorage.setItem(voteKey, vote); } catch (e) {}
              renderThanks(docRef);
            })
            .catch(() => {
              /* Fail soft: Firestore-Regeln evtl. noch nicht eingerichtet — die
                 Seite soll dadurch nicht kaputt wirken. Ohne gespeicherte
                 Stimme gibt es auch keinen Kommentar-Link. */
              renderThanks(null);
            });
        });
      });
    }
    if (existingVote) renderThanks(null); else renderButtons();
    document.body.appendChild(wrap);
  }

  /* ---------------------------------------------------------
     Optionale Bestenliste (Highscore) für ausgewählte Lernspiele.
     Selbst eingetragen (Name/Kürzel + Punktzahl) statt automatisch aus
     dem jeweiligen Spiel ausgelesen.
  --------------------------------------------------------- */
  function escapeHtmlLocal(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function openHighscorePanel(file) {
    if (document.getElementById("protect-highscore-modal")) return;
    ensureStyle();
    const wrap = document.createElement("div");
    wrap.id = "protect-highscore-modal";
    wrap.innerHTML =
      '<div class="protect-card">' +
        '<div class="protect-icon">🏆</div>' +
        "<h2>Bestenliste</h2>" +
        '<p class="protect-sub">Trag deinen Highscore ein — Kürzel reicht.</p>' +
        '<form id="protect-hs-form" autocomplete="off">' +
          '<input type="text" id="protect-hs-name" placeholder="Name/Kürzel" maxlength="16" required />' +
          '<input type="number" id="protect-hs-score" placeholder="Punkte" required />' +
          '<button type="submit" class="protect-submit">Eintragen</button>' +
        "</form>" +
        '<div class="protect-error" id="protect-hs-msg"></div>' +
        '<div id="protect-hs-list" class="protect-hs-list"><p class="protect-hs-loading">Lade Bestenliste …</p></div>' +
        '<button class="protect-close" id="protect-hs-close">Schließen</button>' +
      "</div>";
    document.body.appendChild(wrap);
    wrap.addEventListener("click", (e) => { if (e.target === wrap) wrap.remove(); });
    wrap.querySelector("#protect-hs-close").addEventListener("click", () => wrap.remove());

    function loadList() {
      const listEl = wrap.querySelector("#protect-hs-list");
      loadFirebase()
        .then(({ db }) => db.collection("highscores").where("tool", "==", file).orderBy("score", "desc").limit(10).get())
        .then((snap) => {
          if (snap.empty) {
            listEl.innerHTML = '<p class="protect-hs-loading">Noch keine Einträge — sei der/die Erste!</p>';
            return;
          }
          listEl.innerHTML =
            "<ol>" +
            snap.docs
              .map((d) => {
                const v = d.data();
                return "<li><span>" + escapeHtmlLocal(v.name) + "</span><b>" + escapeHtmlLocal(String(v.score)) + "</b></li>";
              })
              .join("") +
            "</ol>";
        })
        .catch(() => {
          listEl.innerHTML = '<p class="protect-hs-loading">Bestenliste gerade nicht verfügbar.</p>';
        });
    }
    loadList();

    wrap.querySelector("#protect-hs-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = wrap.querySelector("#protect-hs-name").value.trim().slice(0, 16);
      const score = Number(wrap.querySelector("#protect-hs-score").value);
      const msg = wrap.querySelector("#protect-hs-msg");
      if (!name || !isFinite(score)) {
        msg.textContent = "Bitte Name und Punktzahl angeben.";
        return;
      }
      loadFirebase()
        .then(({ db }) => db.collection("highscores").add({ tool: file, name: name, score: score, ts: Date.now() }))
        .then(() => {
          msg.textContent = "";
          wrap.querySelector("#protect-hs-form").reset();
          loadList();
        })
        .catch(() => {
          msg.textContent = "Konnte nicht gespeichert werden. Bitte später erneut versuchen.";
        });
    });
  }

  function initHighscoreWidget() {
    if (isEmbedMode()) return;
    const file = currentPageFile();
    if (HIGHSCORE_FILES.indexOf(file) === -1) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "protect-highscore-btn";
    btn.innerHTML = '🏆 <span class="protect-highscore-label">Bestenliste</span>';
    btn.addEventListener("click", () => openHighscorePanel(file));
    document.body.appendChild(btn);
  }

  /* ---------------------------------------------------------
     Update-Hinweis: Ein Deployment kann alte, im Hintergrund
     geladene Seiten mit neuem Code weiterlaufen lassen — ein
     dezenter Hinweis mit manuellem "Aktualisieren" ist hier
     verlässlicher als ein automatischer, überraschender Reload.
     "seenController" unterscheidet den allerersten Kontrollwechsel
     (Erstinstallation) von einem echten späteren Update.
  --------------------------------------------------------- */
  function showUpdateBanner() {
    if (document.getElementById("protect-update-banner")) return;
    const bar = document.createElement("div");
    bar.id = "protect-update-banner";
    bar.className = "protect-update-banner";
    bar.innerHTML = '<span>Neue Version verfügbar.</span><button type="button" id="protect-update-btn">Jetzt aktualisieren</button>';
    document.body.appendChild(bar);
    bar.querySelector("#protect-update-btn").addEventListener("click", () => location.reload());
  }
  function initUpdateBanner() {
    if (!("serviceWorker" in navigator)) return;
    let seenController = navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!seenController) {
        seenController = navigator.serviceWorker.controller;
        return;
      }
      showUpdateBanner();
    });
  }

  /* ---------------------------------------------------------
     Installations-Hinweis (PWA): Chrome/Edge feuern "beforeinstallprompt",
     wenn eine Seite die Installationskriterien erfüllt (Manifest + Service
     Worker, hier beides vorhanden). Ein zurückhaltender eigener Hinweis
     statt der browsereigenen (oft übersehenen) Mini-Infoleiste — mit
     "Nicht jetzt", das für 14 Tage nicht erneut nervt.
  --------------------------------------------------------- */
  let deferredInstallPrompt = null;
  function isStandaloneDisplay() {
    try {
      return (
        (global.matchMedia && global.matchMedia("(display-mode: standalone)").matches) ||
        global.navigator.standalone === true
      );
    } catch (e) {
      return false;
    }
  }
  function showInstallBanner() {
    if (document.getElementById("protect-install-banner")) return;
    ensureStyle();
    const bar = document.createElement("div");
    bar.id = "protect-install-banner";
    bar.className = "protect-install-banner";
    bar.innerHTML =
      "<span>📲 buildspace zum Startbildschirm hinzufügen?</span>" +
      '<button type="button" id="protect-install-btn">Installieren</button>' +
      '<button type="button" id="protect-install-dismiss" aria-label="Nicht jetzt">✕</button>';
    document.body.appendChild(bar);
    bar.querySelector("#protect-install-btn").addEventListener("click", () => {
      bar.remove();
      if (!deferredInstallPrompt) return;
      const promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = null;
      promptEvent.prompt();
    });
    bar.querySelector("#protect-install-dismiss").addEventListener("click", () => {
      bar.remove();
      try { localStorage.setItem(INSTALL_DISMISS_KEY, String(nowMs() + 14 * 24 * 60 * 60000)); } catch (e) {}
    });
  }
  function initInstallPrompt() {
    if (isEmbedMode() || isStandaloneDisplay()) return;
    global.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      let dismissedUntil = 0;
      try { dismissedUntil = Number(localStorage.getItem(INSTALL_DISMISS_KEY) || 0); } catch (e2) {}
      if (dismissedUntil && nowMs() < dismissedUntil) return;
      deferredInstallPrompt = e;
      showInstallBanner();
    });
  }

  function initStandalone() {
    const scriptTag = document.currentScript;
    const cat = scriptTag && scriptTag.dataset && scriptTag.dataset.category;
    ensureStyle();
    if (isEmbedMode()) document.documentElement.classList.add("embed-mode");
    initUpdateBanner();
    initInstallPrompt();
    function reveal() {
      document.documentElement.classList.add("protect-ready");
      document.documentElement.classList.remove("protect-open");
      if (cat) {
        addShareButton(cat);
        initFeedbackWidget(cat);
        initHighscoreWidget();
      }
      /* Auf der Startseite (app.js) sorgt das dafür, dass die Ordner-
         Kacheln sofort den richtigen Zugriffsstand (voll/Gast/Kolleg:in)
         zeigen, sobald sich jemand gerade neu angemeldet hat. Auf
         einzelnen Werkzeug-Seiten ohne app.js existiert render()
         schlicht nicht. */
      if (typeof global.render === "function") global.render();
    }
    function run() { guard(cat || null, reveal); }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run);
    } else {
      run();
    }
  }

  global.Protect = {
    guard: guard,
    getAccess: getAccess,
    isCategoryAllowed: isCategoryAllowed,
    isShareMode: isShareMode,
    isVertretungMode: isVertretungMode,
    isKursmappeMode: isKursmappeMode,
    isEmbedMode: isEmbedMode,
    kursmappeStatus: kursmappeStatus,
    isRouteAllowed: isRouteAllowed,
    shareStatus: shareStatus,
    shareQueryString: shareQueryString,
    kursmappeLinkFor: kursmappeLinkFor,
    addShareButton: addShareButton,
    removeShareButton: removeShareButton,
    openShareModal: openShareModal,
    renderQrCode: renderQrCode,
    printHandout: printHandout,
    loadFirebase: loadFirebase,
    HIGHSCORE_FILES: HIGHSCORE_FILES,
    ensureStyle: ensureStyle,
    closeOverlay: closeOverlay
  };

  initStandalone();
})(window);
