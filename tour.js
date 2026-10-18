/* ---------------------------------------------------------
   tour.js – kurze Einführung („Anleitung“) für Tool-Seiten

   Einbinden (vor </body>, vor protect.js):
     <script>window.TOUR = { steps: [
       { title: "Willkommen", text: "…" },                      // ohne sel: mittig
       { sel: "#start", title: "Start", text: "…" },             // markiert ein Element
       { sel: ".tab-2", click: ".tab-2", title: "…", text: "…" } // klickt vorher (z. B. Reiter)
     ]};</script>
     <script defer src="tour.js"></script>

   Optionen in window.TOUR:
     button: "#eigenerKnopf"  – eigener Anleitung-Knopf statt des runden „?“
     pos: "tr" | "tl" | "br" | "bl" – Ecke des „?“-Knopfs (Standard "tr")
     btnStyle: "top:70px"      – CSS-Zusatz für den „?“-Knopf (z. B. wenn die Ecke belegt ist)
     auto: false               – nicht beim ersten Besuch automatisch starten
   Schritt-Felder: sel, has (Text im Element), click, clickHas, title, text (HTML)
   Beim ersten Besuch einer Seite startet die Tour automatisch (einmal pro Gerät).
   Läuft in einem Shadow-DOM, damit das Seiten-CSS nichts verstellt.
--------------------------------------------------------- */
(function () {
  "use strict";
  var cfg = window.TOUR;
  if (!cfg || !cfg.steps || !cfg.steps.length) return;
  var KEY = "bs-tour:" + (location.pathname.split("/").pop() || "index");
  var st = null, btnHost = null;

  var CSS =
    ":host{all:initial}" +
    "*{box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif}" +
    ".wrap{position:fixed;inset:0;z-index:99990}" +
    ".catch{position:absolute;inset:0}" +
    ".spot{position:absolute;border-radius:14px;box-shadow:0 0 0 3px #f5c04a,0 0 0 9999px rgba(10,14,26,.66);transition:left .28s ease,top .28s ease,width .28s ease,height .28s ease;pointer-events:none}" +
    ".spot.none{box-shadow:0 0 0 9999px rgba(10,14,26,.66);width:0!important;height:0!important}" +
    ".bub{position:absolute;width:min(390px,calc(100vw - 32px));max-height:calc(100vh - 24px);overflow:auto;background:#fff;color:#16223a;border-radius:16px;padding:16px 18px;box-shadow:0 18px 50px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:10px;transition:top .28s ease,left .28s ease}" +
    "h3{margin:0;font-size:18px;font-weight:700;line-height:1.3}" +
    ".tx{font-size:15px;line-height:1.6}.tx p{margin:0 0 6px}.tx p:last-child{margin:0}" +
    ".tx ul{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:3px}" +
    ".nav{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:2px}" +
    ".cnt{font-size:13px;color:#5b6577;font-variant-numeric:tabular-nums}" +
    ".bs{display:flex;gap:6px;flex-wrap:wrap}" +
    "button{font:inherit;font-size:14px;font-weight:700;border-radius:10px;min-height:40px;padding:6px 13px;cursor:pointer;border:1.5px solid #d3d9e3;background:#fff;color:#16223a}" +
    "button:disabled{opacity:.45;cursor:default}" +
    "button.pri{background:#2E6099;border-color:#2E6099;color:#fff}" +
    "button.q{border-color:transparent;color:#2E6099;text-decoration:underline;text-underline-offset:3px;padding-inline:6px}" +
    "button:focus-visible{outline:3px solid #8fb2da;outline-offset:2px}" +
    ".dots{display:flex;gap:5px}.dots i{width:7px;height:7px;border-radius:50%;background:#d3d9e3}.dots i.on{background:#2E6099}" +
    ".help{position:fixed;z-index:9991;width:42px;height:42px;min-height:0;padding:0;border-radius:50%;display:grid;place-items:center;font-size:19px;font-weight:800;" +
    "border:1px solid rgba(255,255,255,.3);background:linear-gradient(160deg,rgba(44,46,58,.86),rgba(14,15,20,.82));color:#F4F6FB;box-shadow:inset 0 1.5px 0 rgba(255,255,255,.28),0 8px 22px rgba(0,0,0,.4);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}" +
    "@media (prefers-reduced-motion:reduce){.spot,.bub{transition:none}}";

  /* sel = CSS-Selektor; has = Text, den das Element enthalten muss (optional) */
  function q(sel, has) {
    if (!sel) return null;
    try {
      var list = document.querySelectorAll(sel);
      for (var i = 0; i < list.length; i++) {
        var el = list[i], r = el.getBoundingClientRect(), cs = getComputedStyle(el);
        if (!(r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none")) continue;
        if (has && (el.textContent || "").indexOf(has) === -1) continue;
        return el;
      }
    } catch (e) {}
    return null;
  }
  function seen() { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } }
  function markSeen() { try { localStorage.setItem(KEY, "1"); } catch (e) {} }

  function start() {
    if (st) return;
    var host = document.createElement("div");
    host.setAttribute("data-tour", "");
    var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    root.innerHTML = "<style>" + CSS + "</style>" +
      '<div class="wrap" role="dialog" aria-modal="true" aria-label="Anleitung"><div class="catch"></div><div class="spot none"></div>' +
      '<div class="bub"><h3></h3><div class="tx"></div><div class="nav"><span class="cnt"></span><div class="bs">' +
      '<button class="q" data-a="skip" type="button">Überspringen</button><button data-a="prev" type="button">Zurück</button><button class="pri" data-a="next" type="button">Weiter</button>' +
      "</div></div></div></div>";
    document.body.appendChild(host);
    st = { i: 0, host: host, root: root };
    root.querySelector('[data-a="skip"]').onclick = end;
    root.querySelector('[data-a="prev"]').onclick = function () { if (st.i > 0) { st.i--; show(); } };
    root.querySelector('[data-a="next"]').onclick = function () { if (st.i < cfg.steps.length - 1) { st.i++; show(); } else end(); };
    window.addEventListener("resize", pos);
    window.addEventListener("scroll", pos, { passive: true, capture: true });
    document.addEventListener("keydown", key, true);
    show();
  }
  function key(e) {
    if (!st) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); end(); }
    else if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); st.root.querySelector('[data-a="next"]').click(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); st.root.querySelector('[data-a="prev"]').click(); }
  }
  function show() {
    var s = cfg.steps[st.i], r = st.root, n = cfg.steps.length;
    if (s.click) { var c = q(s.click, s.clickHas); if (c) { try { c.click(); } catch (e) {} } }
    r.querySelector("h3").textContent = s.title || "";
    r.querySelector(".tx").innerHTML = s.text || "";
    r.querySelector(".cnt").textContent = (st.i + 1) + " / " + n;
    r.querySelector('[data-a="prev"]').disabled = st.i === 0;
    r.querySelector('[data-a="next"]').textContent = st.i === n - 1 ? "Fertig" : "Weiter";
    setTimeout(function () {
      if (!st) return;
      var t = q(s.sel, s.has);
      if (t) {
        var b = t.getBoundingClientRect();
        if (b.top < 60 || b.bottom > innerHeight - 220) {
          try { t.scrollIntoView({ block: b.height > innerHeight * 0.6 ? "start" : "center" }); } catch (e) { t.scrollIntoView(); }
        }
      }
      pos();
      r.querySelector('[data-a="next"]').focus({ preventScroll: true });
    }, s.click ? 260 : 0);
  }
  function pos() {
    if (!st) return;
    var s = cfg.steps[st.i], r = st.root, spot = r.querySelector(".spot"), bub = r.querySelector(".bub");
    var t = q(s.sel, s.has), bw = bub.offsetWidth, bh = bub.offsetHeight, pad = 7, W = innerWidth, Hh = innerHeight;
    if (!t) {
      spot.className = "spot none";
      spot.style.left = W / 2 + "px"; spot.style.top = Hh / 2 + "px";
      bub.style.left = Math.max(16, (W - bw) / 2) + "px"; bub.style.top = Math.max(12, (Hh - bh) / 2) + "px";
      return;
    }
    var b = t.getBoundingClientRect();
    var L = Math.max(4, b.left - pad), T = Math.max(4, b.top - pad), R = Math.min(W - 4, b.right + pad), B = Math.min(Hh - 4, b.bottom + pad);
    spot.className = "spot";
    spot.style.left = L + "px"; spot.style.top = T + "px"; spot.style.width = Math.max(0, R - L) + "px"; spot.style.height = Math.max(0, B - T) + "px";
    var top;
    if (B + 14 + bh <= Hh - 12) top = B + 14;
    else if (T - 14 - bh >= 12) top = T - 14 - bh;
    else top = Hh - bh - 12;
    var left = Math.min(Math.max(16, b.left), W - bw - 16);
    if (top === Hh - bh - 12 && b.width < W - bw - 60) {
      left = b.left + b.width / 2 < W / 2 ? Math.min(W - bw - 16, R + 14) : Math.max(16, L - 14 - bw);
      top = Math.min(Math.max(12, b.top), Hh - bh - 12);
    }
    bub.style.left = left + "px"; bub.style.top = Math.max(12, top) + "px";
  }
  function end() {
    if (!st) return;
    st.host.remove();
    window.removeEventListener("resize", pos);
    window.removeEventListener("scroll", pos, { capture: true });
    document.removeEventListener("keydown", key, true);
    st = null;
    markSeen();
    if (typeof cfg.onEnd === "function") { try { cfg.onEnd(); } catch (e) {} }
  }

  function addButton() {
    if (cfg.button) {
      var own = document.querySelector(cfg.button);
      if (own) { own.addEventListener("click", function (e) { e.preventDefault(); start(); }); return; }
    }
    btnHost = document.createElement("div");
    btnHost.setAttribute("data-tour-btn", "");
    var root = btnHost.attachShadow ? btnHost.attachShadow({ mode: "open" }) : btnHost;
    var p = cfg.pos || "tr";
    var v = p[0] === "t" ? "top:max(14px,env(safe-area-inset-top))" : "bottom:max(18px,env(safe-area-inset-bottom))";
    var h = p[1] === "r" ? "right:max(14px,env(safe-area-inset-right))" : "left:max(14px,env(safe-area-inset-left))";
    root.innerHTML = "<style>" + CSS + ".help{" + v + ";" + h + ";" + (cfg.btnStyle || "") + "}</style>" +
      '<button class="help" type="button" aria-label="Anleitung anzeigen" title="Anleitung">?</button>';
    root.querySelector("button").onclick = start;
    document.body.appendChild(btnHost);
  }

  function blocked() {
    var o = document.getElementById("protect-overlay");
    if (o && getComputedStyle(o).display !== "none" && o.offsetParent !== null) return true;
    return !!document.querySelector("#protect-share-modal,#protect-poster-modal");
  }
  function init() {
    addButton();
    if (cfg.auto === false || seen()) return;
    var tries = 0;
    (function wait() {
      if (blocked()) { if (++tries < 240) setTimeout(wait, 500); return; }
      setTimeout(start, 700);
    })();
  }
  window.BSTour = { start: start };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
