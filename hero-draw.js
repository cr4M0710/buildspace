/* ---------------------------------------------------------
   hero-draw.js
   Der Schriftzug "buildspace" im Hero wird als SVG-Text mit
   Verlaufs-Kontur "gezeichnet" (stroke-dashoffset) und beginnt
   wieder von vorn, sobald die Schrift komplett gezeichnet ist.
   Vanilla-Umsetzung des Path-Drawing-Hero (ohne React/Tailwind):
   die Strichlänge wird per Raster-Test exakt gemessen, damit die
   Schleife genau beim fertigen Buchstaben neu startet und nie auf
   der fertigen Schrift stehen bleibt.
--------------------------------------------------------- */
(function () {
  "use strict";
  var host = document.getElementById("hero-draw");
  if (!host) return;

  var NS = "http://www.w3.org/2000/svg";
  var TEXT = (host.getAttribute("data-text") || "buildspace").trim();
  var FROM = "#f093fb";
  var TO = "#f5576c";
  var VB_W = 1100, VB_H = 200, FONT = 96, STROKE = 3, DURATION = 5.5;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 " + VB_W + " " + VB_H);
  svg.setAttribute("aria-hidden", "true");
  svg.style.visibility = "hidden";
  var defs = document.createElementNS(NS, "defs");
  var grad = document.createElementNS(NS, "linearGradient");
  grad.setAttribute("id", "hero-draw-grad");
  grad.setAttribute("x1", "0%"); grad.setAttribute("y1", "0%");
  grad.setAttribute("x2", "100%"); grad.setAttribute("y2", "0%");
  [["0%", FROM], ["100%", TO]].forEach(function (s) {
    var stop = document.createElementNS(NS, "stop");
    stop.setAttribute("offset", s[0]);
    stop.setAttribute("stop-color", s[1]);
    grad.appendChild(stop);
  });
  defs.appendChild(grad);
  svg.appendChild(defs);

  var text = document.createElementNS(NS, "text");
  text.setAttribute("x", "50%");
  text.setAttribute("y", "50%");
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "middle");
  text.setAttribute("fill", "none");
  text.setAttribute("stroke", "url(#hero-draw-grad)");
  text.setAttribute("stroke-width", String(STROKE));
  text.setAttribute("stroke-linejoin", "round");
  text.setAttribute("stroke-linecap", "round");
  text.setAttribute("font-size", String(FONT));
  text.setAttribute("font-weight", "bold");
  text.setAttribute("font-family", "Arial, Helvetica, sans-serif");
  text.setAttribute("letter-spacing", "0.02em");
  text.textContent = TEXT;
  svg.appendChild(text);
  host.appendChild(svg);

  /* ---------- exakte Strichlänge per Raster-Test ---------- */
  function loadImage(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("svg raster failed")); };
      img.src = url;
    });
  }

  function rasterInk(apply) {
    var clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", NS);
    clone.style.visibility = "visible";
    var t = clone.querySelector("text");
    apply(t);
    t.setAttribute("stroke", "#ffffff");
    t.style.stroke = "#ffffff";
    clone.setAttribute("width", String(VB_W));
    clone.setAttribute("height", String(VB_H));
    var xml = new XMLSerializer().serializeToString(clone);
    var url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
    return loadImage(url).then(function (img) {
      URL.revokeObjectURL(url);
      var cw = Math.round(VB_W * 0.45), ch = Math.round(VB_H * 0.45);
      var canvas = document.createElement("canvas");
      canvas.width = cw; canvas.height = ch;
      var ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return 0;
      ctx.drawImage(img, 0, 0, cw, ch);
      var d = ctx.getImageData(0, 0, cw, ch).data, n = 0;
      for (var i = 3; i < d.length; i += 4) if (d[i] > 12) n++;
      return n;
    }, function (e) { URL.revokeObjectURL(url); throw e; });
  }

  function measureDashLength() {
    return rasterInk(function (t) { t.style.strokeDasharray = "none"; t.style.strokeDashoffset = "0"; })
      .then(function (full) {
        if (full <= 0) throw new Error("empty ink");
        function covered(dash) {
          return rasterInk(function (t) { t.style.strokeDasharray = dash + " 100000"; t.style.strokeDashoffset = "0"; })
            .then(function (ink) { return ink >= full * 0.994; });
        }
        function grow(hi) {
          if (hi >= 24000) return Promise.resolve(hi);
          return covered(hi).then(function (ok) { return ok ? hi : grow(hi * 2); });
        }
        return grow(64).then(function (hi) {
          function search(lo, hi2) {
            if (lo >= hi2) return Promise.resolve(Math.max(1, lo));
            var mid = (lo + hi2) >> 1;
            return covered(mid).then(function (ok) { return ok ? search(lo, mid) : search(mid + 1, hi2); });
          }
          return search(1, hi);
        });
      });
  }

  /* ---------- Animation ---------- */
  var dash = 0, offset = 0, last = 0, raf = 0, visible = true;

  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  function tick(now) {
    var dt = Math.min(48, now - last);
    last = now;
    offset -= (dash / (DURATION * 1000)) * dt;
    if (offset <= 0) offset = dash;
    text.style.strokeDashoffset = String(offset);
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (raf || !dash || reduce || !visible) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function begin(len) {
    dash = len;
    offset = dash;
    text.style.strokeDasharray = dash + " " + dash;
    text.style.strokeDashoffset = String(offset);
    svg.style.visibility = "visible";
    start();
  }

  function showStatic() {
    text.style.strokeDasharray = "none";
    text.style.strokeDashoffset = "0";
    svg.style.visibility = "visible";
  }

  if (reduce) { showStatic(); return; }

  // Läuft nur, solange der Hero sichtbar ist (auf Unterseiten ausgeblendet).
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) start(); else stop();
    }).observe(host);
  }

  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  fontsReady
    .then(measureDashLength)
    .then(begin)
    .catch(function () {
      var w = 0;
      try { w = text.getComputedTextLength(); } catch (e) {}
      begin(Math.max(1, Math.ceil((w || TEXT.length * FONT * 0.62) * 1.15)));
    });
})();
