/* ---------------------------------------------------------
   protect.js
   Einfacher, rein clientseitiger Zugriffsschutz pro Bereich
   (Schule / Handball / Freizeit) sowie eine zeitlich begrenzte
   "Für Lernende freigeben"-Funktion für einzelne Seiten.

   WICHTIG: Das ist eine Komfort-Sperre für eine statische
   GitHub-Pages-Seite, keine echte Serversicherheit. Der
   Quelltext (und damit das Passwort) ist für jeden einsehbar,
   der sich die Dateien ansieht. Für wirklich sensible Inhalte
   ist das nicht geeignet.
--------------------------------------------------------- */
(function (global) {
  "use strict";

  const PASSWORD = "mstroh_GGL#99";
  const LABELS = { schule: "Schule", handball: "Handball", freizeit: "Freizeit" };

  function nowMs() { return Date.now(); }
  function unlockedKey(cat) { return "myhome_unlocked_" + cat; }

  function isUnlockedLocal(cat) {
    try { return localStorage.getItem(unlockedKey(cat)) === "1"; }
    catch (e) { return false; }
  }
  function setUnlockedLocal(cat) {
    try { localStorage.setItem(unlockedKey(cat), "1"); } catch (e) {}
  }

  function getShareParams() {
    let params;
    try { params = new URLSearchParams(location.search); }
    catch (e) { return { active: false }; }
    const share = params.get("share");
    const exp = Number(params.get("exp") || 0);
    const cat = params.get("cat") || null;
    return { active: share === "1", exp: exp, cat: cat };
  }

  function shareStatus(cat) {
    const s = getShareParams();
    if (!s.active) return { active: false };
    if (s.cat && cat && s.cat !== cat) return { active: false };
    const valid = !!s.exp && nowMs() <= s.exp;
    return { active: true, valid: valid, exp: s.exp };
  }

  function isShareMode() { return getShareParams().active === true; }

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
      "#protect-overlay .protect-card, #protect-share-modal .protect-card {",
      "  width: 100%; max-width: 380px; background: linear-gradient(178deg, rgba(255,255,255,0.86), rgba(255,255,255,0.6));",
      "  border: 1px solid rgba(255,255,255,0.65); border-radius: 26px; padding: 32px 28px; text-align: center;",
      "  box-shadow: inset 0 1px 0 rgba(255,255,255,0.8), 0 20px 60px rgba(20,20,30,0.25);",
      "  backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%);",
      "  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }",
      "#protect-overlay .protect-icon, #protect-share-modal .protect-icon {",
      "  width: 52px; height: 52px; margin: 0 auto 14px; border-radius: 16px; display: flex; align-items: center; justify-content: center;",
      "  background: linear-gradient(155deg, rgba(255,255,255,0.9), rgba(255,255,255,0.5));",
      "  box-shadow: inset 0 1px 1px rgba(255,255,255,0.8), 0 6px 16px -4px rgba(30,30,40,0.25); color: #1D1D1F; }",
      "#protect-overlay h2, #protect-share-modal h2 { margin: 0 0 6px; font-size: 19px; font-weight: 700; color: #1D1D1F; }",
      "#protect-overlay p.protect-sub, #protect-share-modal p.protect-sub { margin: 0 0 18px; font-size: 14px; color: #46464b; }",
      "#protect-overlay input[type=password] {",
      "  width: 100%; padding: 12px 14px; font-size: 16px; border-radius: 14px; border: 1px solid rgba(0,0,0,0.12);",
      "  background: rgba(255,255,255,0.7); margin-bottom: 10px; box-sizing: border-box; text-align: center; }",
      "#protect-overlay button.protect-submit, #protect-share-modal button.protect-submit {",
      "  width: 100%; padding: 12px 14px; font-size: 15px; font-weight: 600; border: none; border-radius: 14px;",
      "  color: #fff; cursor: pointer; background: linear-gradient(155deg, #6D5DFB, #4B3AD6);",
      "  box-shadow: 0 6px 16px -4px rgba(109,93,251,0.55); }",
      "#protect-overlay .protect-error, #protect-share-modal .protect-error { color: #C23B3B; font-size: 13px; margin-top: 10px; min-height: 16px; }",
      "#protect-overlay .protect-expired {",
      "  background: rgba(224,72,61,0.12); border: 1px solid rgba(224,72,61,0.3); border-radius: 12px;",
      "  padding: 10px 12px; font-size: 13px; color: #a33; margin-bottom: 16px; }",
      "#protect-overlay .protect-alt, #protect-share-modal .protect-close {",
      "  margin-top: 14px; font-size: 12.5px; color: #6E6E73; background: none; border: none; text-decoration: underline; cursor: pointer; }",
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
      "#protect-share-modal {",
      "  position: fixed; inset: 0; z-index: 999999; display: flex; align-items: center; justify-content: center;",
      "  padding: 24px; background: rgba(20,20,30,0.35); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }",
      "#protect-share-modal select { width: 100%; padding: 10px 12px; font-size: 15px; border-radius: 12px;",
      "  border: 1px solid rgba(0,0,0,0.12); background: rgba(255,255,255,0.8); margin-bottom: 10px; box-sizing: border-box; }",
      "#protect-share-modal .protect-link-row { display: flex; gap: 8px; }",
      "#protect-share-modal .protect-link-row input { flex: 1; font-size: 12.5px; padding: 10px 10px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.12); background: rgba(255,255,255,0.85); }",
      "#protect-share-modal .protect-copy-btn { padding: 10px 14px; border-radius: 12px; border: none; font-weight: 600; cursor: pointer; background: rgba(0,0,0,0.07); }",
      "html.share-mode .site-logo, html.share-mode .breadcrumb a { pointer-events: none; opacity: 0.45; }",
      "html.share-mode #protect-share-btn { display: none; }",
      ".protect-banner {",
      "  position: fixed; top: 0; left: 0; right: 0; z-index: 9997; text-align: center; font-size: 12.5px;",
      "  font-weight: 600; color: #fff; padding: 8px 10px; background: linear-gradient(90deg, #6D5DFB, #22D3EE); }",
      "@media (max-width: 480px) { #protect-share-btn span.protect-share-label { display: none; } }"
    ].join("\n");
    document.head.appendChild(style);
  }

  function closeOverlay() {
    const el = document.getElementById("protect-overlay");
    if (el) el.remove();
    document.documentElement.classList.remove("protect-open");
  }

  function showOverlay(cat, expiredHint, onUnlock) {
    ensureStyle();
    document.documentElement.classList.add("protect-open");
    const wrap = document.createElement("div");
    wrap.id = "protect-overlay";
    const label = LABELS[cat] || cat;
    wrap.innerHTML =
      '<div class="protect-card">' +
        '<div class="protect-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5"/><path d="M8 10.5V7.2a4 4 0 0 1 8 0v3.3"/></svg></div>' +
        "<h2>" + label + " ist geschützt</h2>" +
        (expiredHint
          ? '<div class="protect-expired">Dieser Freigabe-Link ist abgelaufen. Bitte Passwort eingeben.</div>'
          : '<p class="protect-sub">Bitte gib das Passwort ein, um fortzufahren.</p>') +
        '<form id="protect-form" autocomplete="off">' +
          '<input type="password" id="protect-input" placeholder="Passwort" autofocus />' +
          '<button type="submit" class="protect-submit">Freischalten</button>' +
        "</form>" +
        '<div class="protect-error" id="protect-error"></div>' +
      "</div>";
    document.body.appendChild(wrap);
    const form = wrap.querySelector("#protect-form");
    const input = wrap.querySelector("#protect-input");
    const errorEl = wrap.querySelector("#protect-error");
    setTimeout(() => input.focus(), 30);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (input.value === PASSWORD) {
        setUnlockedLocal(cat);
        closeOverlay();
        onUnlock();
      } else {
        errorEl.textContent = "Falsches Passwort — bitte erneut versuchen.";
        input.value = "";
        input.focus();
      }
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

  function guard(cat, onUnlock) {
    ensureStyle();
    clearBanner();
    if (!cat) { onUnlock(); return; }
    const s = shareStatus(cat);
    if (s.active && s.valid) {
      document.documentElement.classList.add("share-mode");
      showBanner("Freigegeben zum Lernen — noch " + fmtRemaining(s.exp) + " gültig. Läuft danach automatisch ab.");
      onUnlock();
      return;
    }
    document.documentElement.classList.remove("share-mode");
    if (isUnlockedLocal(cat)) { onUnlock(); return; }
    showOverlay(cat, s.active && !s.valid, onUnlock);
  }

  function shareLinkFor(cat, minutes) {
    const exp = nowMs() + minutes * 60000;
    const url = new URL(location.href);
    url.searchParams.set("share", "1");
    url.searchParams.set("exp", String(exp));
    if (cat) url.searchParams.set("cat", cat);
    return url.toString();
  }

  function openShareModal(cat) {
    ensureStyle();
    const wrap = document.createElement("div");
    wrap.id = "protect-share-modal";
    wrap.innerHTML =
      '<div class="protect-card">' +
        '<div class="protect-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg></div>' +
        "<h2>Für Lernende freigeben</h2>" +
        '<p class="protect-sub">Erzeuge einen Link, der diese Seite ohne Passwort öffnet — automatisch zeitlich begrenzt.</p>' +
        '<select id="protect-minutes">' +
          '<option value="15">15 Minuten</option>' +
          '<option value="30" selected>30 Minuten</option>' +
          '<option value="45">45 Minuten</option>' +
          '<option value="90">90 Minuten (Doppelstunde)</option>' +
          '<option value="180">3 Stunden</option>' +
        "</select>" +
        '<button class="protect-submit" id="protect-make-link" style="width:100%;">Link erstellen</button>' +
        '<div id="protect-link-area" style="display:none; margin-top:14px; text-align:left;">' +
          '<div class="protect-link-row">' +
            '<input type="text" id="protect-link-out" readonly />' +
            '<button class="protect-copy-btn" id="protect-copy-btn">Kopieren</button>' +
          "</div>" +
          '<div class="protect-error" id="protect-copy-msg" style="color:#2F6F4F;"></div>' +
        "</div>" +
        '<button class="protect-close" id="protect-close-btn">Schließen</button>' +
      "</div>";
    document.body.appendChild(wrap);
    wrap.addEventListener("click", (e) => { if (e.target === wrap) wrap.remove(); });
    wrap.querySelector("#protect-close-btn").addEventListener("click", () => wrap.remove());
    wrap.querySelector("#protect-make-link").addEventListener("click", () => {
      const minutes = Number(wrap.querySelector("#protect-minutes").value);
      const link = shareLinkFor(cat, minutes);
      const out = wrap.querySelector("#protect-link-out");
      out.value = link;
      wrap.querySelector("#protect-link-area").style.display = "block";
      out.focus(); out.select();
      wrap.querySelector("#protect-copy-msg").textContent = "";
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

  function initStandalone() {
    const scriptTag = document.currentScript;
    const cat = scriptTag && scriptTag.dataset && scriptTag.dataset.category;
    ensureStyle();
    if (!cat) { document.documentElement.classList.add("protect-ready"); return; }
    function reveal() {
      document.documentElement.classList.add("protect-ready");
      document.documentElement.classList.remove("protect-open");
      addShareButton(cat);
    }
    function run() { guard(cat, reveal); }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run);
    } else {
      run();
    }
  }

  global.Protect = {
    guard: guard,
    isUnlockedLocal: isUnlockedLocal,
    isShareMode: isShareMode,
    shareStatus: shareStatus,
    addShareButton: addShareButton,
    removeShareButton: removeShareButton,
    openShareModal: openShareModal,
    ensureStyle: ensureStyle
  };

  initStandalone();
})(window);
