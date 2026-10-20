/* ---------------------------------------------------------
   micro.js
   Kleine Extras für die Startseite:
   - Karten neigen sich leicht zur Maus (nur Maus/Stift, nicht bei Touch)
   - sanfter Übergang beim Wechsel zwischen Bereichen
   - Easter-Egg: Konami-Code oder 7× auf den Schriftzug tippen
   - Hinweis „App installieren" (Android) bzw. „Zum Home-Bildschirm" (iOS)
   Alles aus bei „reduzierte Bewegung“.
--------------------------------------------------------- */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }

  /* ---------- 1) Karten-Neigung ---------- */
  if (!reduce) {
    var tiltEl = null;
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      var el = e.target.closest && e.target.closest(".post-card, .folder-card");
      if (tiltEl && tiltEl !== el) { tiltEl.classList.remove("tilt-on"); tiltEl.style.removeProperty("--rx"); tiltEl.style.removeProperty("--ry"); tiltEl = null; }
      if (!el) return;
      var r = el.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      el.classList.add("tilt-on");
      el.style.setProperty("--rx", (-y * 5).toFixed(2) + "deg");
      el.style.setProperty("--ry", (x * 6).toFixed(2) + "deg");
      tiltEl = el;
    }, { passive: true });
    document.addEventListener("pointerleave", function () {
      if (tiltEl) { tiltEl.classList.remove("tilt-on"); tiltEl = null; }
    }, true);
  }

  /* ---------- 2) Bereichs-Übergang ---------- */
  var main = document.getElementById("content");
  if (main && !reduce && window.MutationObserver) {
    var t = null;
    new MutationObserver(function () {
      main.classList.remove("view-in"); void main.offsetWidth; main.classList.add("view-in");
      clearTimeout(t); t = setTimeout(function () { main.classList.remove("view-in"); }, 500);
    }).observe(main, { childList: true });
  }

  /* ---------- 3) Easter-Egg ---------- */
  function toast(msg) {
    var d = document.createElement("div"); d.className = "micro-toast"; d.setAttribute("role", "status"); d.textContent = msg;
    document.body.appendChild(d); setTimeout(function () { d.classList.add("out"); }, 3200); setTimeout(function () { d.remove(); }, 3800);
  }
  function burst() {
    toast("Sternschnuppen-Regen entdeckt ✨");
    if (reduce) return;
    var c = document.createElement("canvas"); c.setAttribute("aria-hidden", "true");
    c.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:50;pointer-events:none;";
    var w = c.width = innerWidth, h = c.height = innerHeight; document.body.appendChild(c);
    var x = c.getContext("2d"), L = [], i, t0 = performance.now();
    for (i = 0; i < 38; i++) L.push({ x: Math.random() * w * 1.3, y: -Math.random() * h * 0.6, v: 500 + Math.random() * 600, len: 80 + Math.random() * 140, d: Math.random() * 1.2 });
    (function f(ts) {
      var t = (ts - t0) / 1000; x.clearRect(0, 0, w, h);
      L.forEach(function (s) {
        var tt = t - s.d; if (tt < 0) return;
        var px = s.x - tt * s.v * 0.62, py = s.y + tt * s.v * 0.78;
        var g2 = x.createLinearGradient(px, py, px + s.len * 0.62, py - s.len * 0.78);
        g2.addColorStop(0, "rgba(255,255,255,0.95)"); g2.addColorStop(1, "rgba(255,255,255,0)");
        x.strokeStyle = g2; x.lineWidth = 2; x.beginPath(); x.moveTo(px, py); x.lineTo(px + s.len * 0.62, py - s.len * 0.78); x.stroke();
      });
      if (t < 3.2) requestAnimationFrame(f); else c.remove();
    })(t0);
  }
  var seq = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"], pos = 0;
  document.addEventListener("keydown", function (e) {
    if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || "")) return;
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = k === seq[pos] ? pos + 1 : (k === seq[0] ? 1 : 0);
    if (pos === seq.length) { pos = 0; burst(); }
  });
  var taps = 0, tt2 = 0;
  document.addEventListener("click", function (e) {
    if (!(e.target.closest && e.target.closest("#hero-draw"))) return;
    var now = Date.now(); taps = now - tt2 < 900 ? taps + 1 : 1; tt2 = now;
    if (taps >= 7) { taps = 0; burst(); }
  });

  /* ---------- 4) App installieren ---------- */
  var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  function recentlyDismissed() { var v = +store("buildspace_install_dismiss") || 0; return Date.now() - v < 30 * 864e5; }
  function chip(text, actionLabel, action) {
    if (standalone || recentlyDismissed() || document.querySelector(".install-chip")) return;
    var b = document.createElement("div"); b.className = "install-chip"; b.setAttribute("role", "status");
    b.innerHTML = '<span class="ic-text"></span>' + (actionLabel ? '<button type="button" class="ic-go"></button>' : "") + '<button type="button" class="ic-x" aria-label="Hinweis schließen">×</button>';
    b.querySelector(".ic-text").textContent = text;
    if (actionLabel) { var go = b.querySelector(".ic-go"); go.textContent = actionLabel; go.onclick = function () { action(); b.remove(); }; }
    b.querySelector(".ic-x").onclick = function () { store("buildspace_install_dismiss", String(Date.now())); b.remove(); };
    document.body.appendChild(b);
  }
  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); deferred = e;
    setTimeout(function () {
      if (!root.classList.contains("is-home")) return;
      chip("buildspace als App auf dem Gerät speichern?", "Installieren", function () { deferred.prompt(); });
    }, 8000);
  });
  var ua = navigator.userAgent || "";
  var ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios && !standalone && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua)) {
    setTimeout(function () {
      if (root.classList.contains("is-home")) chip("App speichern: Teilen-Symbol antippen, dann „Zum Home-Bildschirm“.", "", null);
    }, 10000);
  }
  /* ---------- 5) Seitenleiste per Wischen schließen ----------
     Wie bei Apple: die Leiste folgt dem Finger 1:1, am Rand gibt es
     Widerstand (Rubberband). Beim Loslassen entscheidet die auf Basis der
     Geschwindigkeit vorausberechnete Endposition, ob sie schließt. */
  var sb = document.querySelector(".sidebar"), bd = document.querySelector(".sidebar-backdrop");
  if (sb && !reduce) {
    var drag = null;
    var project = function (v) { return (v / 1000) * 0.998 / (1 - 0.998); }; /* v in px/s -> px */
    var rubber = function (o, dim) { return (o * dim * 0.55) / (dim + 0.55 * Math.abs(o)); };
    sb.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" || !root.classList.contains("sidebar-open")) return;
      if (e.target.closest && e.target.closest("input, textarea, select")) return;
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, on: false, hist: [{ x: e.clientX, t: e.timeStamp }], w: sb.offsetWidth };
    });
    sb.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.on) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; } /* senkrecht = Scrollen */
        drag.on = true; sb.classList.add("is-dragging"); if (bd) bd.classList.add("is-dragging");
        try { sb.setPointerCapture(e.pointerId); } catch (err) {}
      }
      drag.hist.push({ x: e.clientX, t: e.timeStamp }); if (drag.hist.length > 6) drag.hist.shift();
      var x = dx < 0 ? dx : rubber(dx, drag.w);
      drag.x = x;
      sb.style.transform = "translateX(" + x.toFixed(1) + "px)";
      if (bd) bd.style.opacity = String(Math.max(0, 1 + Math.min(0, x) / drag.w));
    });
    var end = function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null;
      if (!d.on) return;
      sb._swallow = true; setTimeout(function () { sb._swallow = false; }, 60);
      d.hist.push({ x: e.clientX, t: e.timeStamp });
      var h = d.hist.filter(function (p) { return e.timeStamp - p.t < 120; }); if (h.length < 2) h = d.hist.slice(-2);
      var a = h[0], b = h[h.length - 1], dt = Math.max(1, b.t - a.t), v = ((b.x - a.x) / dt) * 1000;
      var proj = (d.x || 0) + project(v);
      var close = e.type !== "pointercancel" && (v < -300 || proj < -d.w * 0.4);
      sb.classList.remove("is-dragging"); if (bd) bd.classList.remove("is-dragging");
      sb.style.transform = ""; if (bd) bd.style.opacity = "";
      if (close) { if (typeof window.closeSidebar === "function") window.closeSidebar(false); else root.classList.remove("sidebar-open"); }
      /* sonst: Inline-Wert entfällt, CSS-Feder führt sanft zurück auf die Ausgangsposition */
    };
    sb.addEventListener("pointerup", end);
    sb.addEventListener("pointercancel", end);
    /* Ein Wisch darf keinen Link auslösen */
    sb.addEventListener("click", function (e) { if (sb._swallow) { e.preventDefault(); e.stopPropagation(); sb._swallow = false; } }, true);
  }
})();
