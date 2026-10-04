/* ---------------------------------------------------------
   micro.js
   Kleine Extras für die Startseite:
   - Karten neigen sich leicht zur Maus (nur Maus/Stift, nicht bei Touch)
   - sanfter Übergang beim Wechsel zwischen Bereichen
   - Jahreszeiten-Hintergrund (Blätter, Schnee, Blüten, Glühwürmchen);
     Vorschau/Abschalten per ?season=winter|spring|summer|autumn|off
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

  /* ---------- 3) Jahreszeiten ---------- */
  function season() {
    var q = ""; try { q = new URLSearchParams(location.search).get("season") || ""; } catch (e) {}
    if (q === "off") return null;
    if (/^(winter|spring|summer|autumn)$/.test(q)) return q;
    var m = new Date().getMonth();
    return m === 11 || m < 2 ? "winter" : m < 5 ? "spring" : m < 8 ? "summer" : "autumn";
  }
  var S = season();
  if (S && !reduce) {
    var cv = document.createElement("canvas");
    cv.id = "bg-season"; cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;";
    document.body.appendChild(cv);
    var g = cv.getContext("2d"), W = 0, H = 0, dpr = 1, P = [], raf = 0, last = 0;
    var N = function () { return Math.round(Math.min(46, Math.max(18, W / 34))); };
    function mk(initial) {
      var p = { x: Math.random() * W, y: initial ? Math.random() * H : -20, s: 0.5 + Math.random(), ph: Math.random() * 6.28, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 1.6 };
      if (S === "summer") { p.y = Math.random() * H; p.life = Math.random(); }
      return p;
    }
    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      while (P.length < N()) P.push(mk(true)); P.length = N();
    }
    addEventListener("resize", resize); resize();
    function frame(ts) {
      raf = requestAnimationFrame(frame);
      var dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
      if (!root.classList.contains("is-home")) { g.clearRect(0, 0, W, H); return; }
      g.clearRect(0, 0, W, H);
      P.forEach(function (p, i) {
        p.ph += dt; p.r += p.vr * dt;
        if (S === "winter") {
          p.y += (26 + 22 * p.s) * dt; p.x += Math.sin(p.ph * 0.9) * 14 * dt;
          g.fillStyle = "rgba(255,255,255," + (0.35 + 0.35 * p.s / 1.5).toFixed(2) + ")";
          g.beginPath(); g.arc(p.x, p.y, 1.4 + p.s * 1.6, 0, 6.283); g.fill();
        } else if (S === "autumn") {
          p.y += (24 + 18 * p.s) * dt; p.x += Math.sin(p.ph * 0.8) * 30 * dt;
          g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, Math.abs(Math.cos(p.ph * 1.3)) * 0.7 + 0.3);
          g.fillStyle = i % 3 ? "rgba(214,150,80,0.55)" : "rgba(176,92,56,0.5)";
          g.beginPath(); g.ellipse(0, 0, 4 + p.s * 3, 2.4 + p.s * 1.6, 0, 0, 6.283); g.fill(); g.restore();
        } else if (S === "spring") {
          p.y += (20 + 14 * p.s) * dt; p.x += (Math.sin(p.ph) * 22 + 8) * dt;
          g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = "rgba(255,226,236,0.5)";
          g.beginPath(); g.ellipse(0, 0, 3 + p.s * 2, 1.8 + p.s, 0, 0, 6.283); g.fill(); g.restore();
        } else {
          p.life += dt * 0.25; p.x += Math.sin(p.ph * 0.7) * 10 * dt; p.y += Math.cos(p.ph * 0.5) * 8 * dt;
          var a = Math.max(0, Math.sin(p.life * 3.1416 * 2)) * 0.8;
          var gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9);
          gr.addColorStop(0, "rgba(255,244,170," + a.toFixed(2) + ")"); gr.addColorStop(1, "rgba(255,244,170,0)");
          g.fillStyle = gr; g.fillRect(p.x - 9, p.y - 9, 18, 18);
          if (p.life > 1) { p.life = 0; p.x = Math.random() * W; p.y = Math.random() * H; }
        }
        if (p.y > H + 20 || p.x > W + 30 || p.x < -30) { var n = mk(false); P[i] = n; }
      });
    }
    raf = requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) cancelAnimationFrame(raf); else { last = 0; raf = requestAnimationFrame(frame); }
    });
  }

  /* ---------- 4) Easter-Egg ---------- */
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

  /* ---------- 5) App installieren ---------- */
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
})();
