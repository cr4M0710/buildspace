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
  /* Verlauf wie im Glas-Neon-Vorbild: Blau-Violett -> Magenta -> Pink -> Orange */
  var STOPS = [["0%", "#6f6bff"], ["22%", "#b565ff"], ["48%", "#ff55c8"], ["72%", "#ff6b8e"], ["100%", "#ffb04a"]];
  var VB_W = 1100, VB_H = 250, FONT = 118, STROKE = 7, DURATION = 5.5, BASE = 130;
  var FONT_FAMILY = '"SF Pro Rounded", "Arial Rounded MT Bold", "Nunito", Arial, Helvetica, sans-serif';
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
  STOPS.forEach(function (s) {
    var stop = document.createElementNS(NS, "stop");
    stop.setAttribute("offset", s[0]);
    stop.setAttribute("stop-color", s[1]);
    grad.appendChild(stop);
  });
  defs.appendChild(grad);
  /* Spiegelung unter der Schrift: blendet nach unten aus */
  var fade = document.createElementNS(NS, "linearGradient");
  fade.setAttribute("id", "hero-draw-fade"); fade.setAttribute("gradientUnits", "userSpaceOnUse");
  fade.setAttribute("x1", "0"); fade.setAttribute("y1", String(BASE + 4)); fade.setAttribute("x2", "0"); fade.setAttribute("y2", String(BASE + 78));
  [["0", "0.3"], ["1", "0"]].forEach(function (s) {
    var st = document.createElementNS(NS, "stop");
    st.setAttribute("offset", s[0]); st.setAttribute("stop-color", "#fff"); st.setAttribute("stop-opacity", s[1]);
    fade.appendChild(st);
  });
  defs.appendChild(fade);
  var mask = document.createElementNS(NS, "mask");
  mask.setAttribute("id", "hero-draw-mask"); mask.setAttribute("maskUnits", "userSpaceOnUse");
  mask.setAttribute("x", "-200"); mask.setAttribute("y", "0"); mask.setAttribute("width", String(VB_W + 400)); mask.setAttribute("height", String(VB_H));
  var mr = document.createElementNS(NS, "rect");
  mr.setAttribute("x", "-200"); mr.setAttribute("y", "0"); mr.setAttribute("width", String(VB_W + 400)); mr.setAttribute("height", String(VB_H)); mr.setAttribute("fill", "url(#hero-draw-fade)");
  mask.appendChild(mr); defs.appendChild(mask);
  svg.appendChild(defs);

  function mkText(attrs) {
    var t = document.createElementNS(NS, "text");
    t.setAttribute("x", "50%"); t.setAttribute("y", String(BASE));
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("stroke-linejoin", "round"); t.setAttribute("stroke-linecap", "round");
    t.setAttribute("font-size", String(FONT)); t.setAttribute("font-weight", "bold");
    t.setAttribute("font-family", FONT_FAMILY); t.setAttribute("letter-spacing", "0.06em");
    Object.keys(attrs).forEach(function (k) { t.setAttribute(k, attrs[k]); });
    t.textContent = TEXT;
    return t;
  }
  /* Hauptkontur (wird gezeichnet) + heller Kern (Glas-Glanz) + sanfte Füllung */
  var text = mkText({ fill: "none", stroke: "url(#hero-draw-grad)", "stroke-width": String(STROKE) });
  var inner = mkText({ fill: "none", stroke: "rgba(10,8,22,0.62)", "stroke-width": String(STROKE * 0.5), "data-extra": "1" });
  var core = mkText({ fill: "none", stroke: "#ffffff", "stroke-opacity": "0.6", "stroke-width": "1.1", "data-extra": "1" });
  var fillT = mkText({ fill: "url(#hero-draw-grad)", "fill-opacity": "0", stroke: "none", "data-extra": "1" });
  var reflGroup = document.createElementNS(NS, "g");
  reflGroup.setAttribute("mask", "url(#hero-draw-mask)"); reflGroup.setAttribute("data-extra", "1");
  var reflInner = document.createElementNS(NS, "g");
  reflInner.setAttribute("transform", "translate(0 " + (2 * (BASE + 4)) + ") scale(1 -1)");
  var refl = mkText({ fill: "none", stroke: "url(#hero-draw-grad)", "stroke-width": String(STROKE) });
  reflInner.appendChild(refl); reflGroup.appendChild(reflInner);
  svg.appendChild(reflGroup);
  svg.appendChild(fillT);
  svg.appendChild(text);
  svg.appendChild(inner);
  svg.appendChild(core);
  host.appendChild(svg);
  var strokeEls = [text, inner, core, refl];
  function setArr(v) { strokeEls.forEach(function (e) { e.style.strokeDasharray = v; }); }
  function setOff(v) {
    strokeEls.forEach(function (e) { e.style.strokeDashoffset = String(v); });
    /* Füllung blendet ein, sobald die Kontur zu ~85 % gezeichnet ist */
    var prog = dash ? 1 - v / dash : 1;
    fillT.setAttribute("fill-opacity", String(Math.max(0, Math.min(1, (prog - 0.85) / 0.15)) * 0.14));
  }

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
    Array.prototype.slice.call(clone.querySelectorAll("[data-extra]")).forEach(function (n) { n.parentNode.removeChild(n); });
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

  /* ---------- Animation ----------
     Ablauf pro Durchlauf: zeichnen -> komplett sichtbar kurz aufleuchten
     (farbiger Schein um die Buchstaben) -> ausblenden -> neu zeichnen. */
  var dash = 0, offset = 0, raf = 0, visible = true;
  var phase = "draw", phaseStart = 0, last = 0;
  var HOLD = 450, GLOW_UP = 450, GLOW_DOWN = 1300, FADE = 600;

  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  function setGlow(g) {
    // g: 0 = ruhig, 1 = volles Aufleuchten. Schein in den beiden Verlaufsfarben.
    var base = 0.22;
    var a = base + (1 - base) * g;
    svg.style.filter =
      "drop-shadow(0 0 " + (4 + 10 * g).toFixed(1) + "px rgba(181,101,255," + (0.45 * a + 0.1).toFixed(2) + "))" +
      " drop-shadow(0 0 " + (8 + 26 * g).toFixed(1) + "px rgba(255,85,200," + (0.8 * g + 0.08).toFixed(2) + "))";
    var sw = String((STROKE * (1 + 0.4 * g)).toFixed(2));
    text.setAttribute("stroke-width", sw); refl.setAttribute("stroke-width", sw);
    inner.setAttribute("stroke-width", String((STROKE * 0.5 * (1 + 0.4 * g)).toFixed(2)));
  }

  function tick(now) {
    var dt = Math.min(48, now - last);
    last = now;
    if (phase === "draw") {
      offset -= (dash / (DURATION * 1000)) * dt;
      if (offset <= 0) {
        offset = 0;
        phase = "hold";
        phaseStart = now;
      }
      setOff(offset);
    } else if (phase === "hold") {
      // Schrift steht komplett — kurz ruhen, dann erst aufleuchten.
      if (now - phaseStart >= HOLD) { phase = "glow"; phaseStart = now; }
    } else if (phase === "glow") {
      var t = now - phaseStart;
      var g = t < GLOW_UP ? t / GLOW_UP : Math.max(0, 1 - (t - GLOW_UP) / GLOW_DOWN);
      g = g * g * (3 - 2 * g);
      setGlow(g);
      if (t >= GLOW_UP + GLOW_DOWN) { phase = "fade"; phaseStart = now; setGlow(0); }
    } else {
      var f = Math.min(1, (now - phaseStart) / FADE);
      svg.style.opacity = String(1 - f);
      if (f >= 1) {
        phase = "draw";
        offset = dash;
        setOff(offset);
        svg.style.opacity = "1";
      }
    }
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (raf || !dash || reduce || !visible) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function begin(len) {
    // Sicherheitszuschlag: Je nach Schrift/Rechner (z. B. Laptop mit anderer
    // Ersatzschrift) liegt die Messung knapp daneben. Mit Zuschlag ist die
    // Schrift garantiert komplett gezeichnet, bevor das Aufleuchten startet.
    dash = Math.ceil(len * 1.12) + 6;
    offset = dash;
    setArr(dash + " " + dash);
    setOff(offset);
    svg.style.visibility = "visible";
    setGlow(0);
    start();
  }

  function showStatic() {
    setArr("none");
    setOff(0);
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
