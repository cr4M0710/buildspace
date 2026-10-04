/* ---------------------------------------------------------
   space.js
   Hintergrund: Milchstraße, einzelne Planeten und die Erde bei Nacht
   mit hell leuchtenden Städten — alles prozedural auf ein Canvas
   gemalt (keine Bilddateien). Die Szene ist deterministisch (fester
   Zufallsstartwert), sieht also bei jedem Besuch gleich aus und wird
   nur bei Größenänderung neu gemalt. Dahinter/davor: Glas-Flächen,
   Sternschnuppen (stars.js).
--------------------------------------------------------- */
(function () {
  "use strict";
  var canvas = document.createElement("canvas");
  canvas.id = "bg-space";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* --- Value-Noise für Kontinente und Städte-Cluster --- */
  function hash(ix, iy, seed) {
    var n = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 2147483647);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, seed) {
    var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    var u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    var a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, seed) {
    var s = 0, amp = 0.5, f = 1;
    for (var i = 0; i < 5; i++) { s += amp * vnoise(x * f, y * f, seed + i); amp *= 0.5; f *= 2; }
    return s;
  }

  function gauss(r) {
    return (r() + r() + r() + r() - 2) / 0.58;
  }

  function drawScene() {
    var dpr = Math.min(1.5, window.devicePixelRatio || 1);
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    var r = rng(20260701);
    var diag = Math.hypot(w, h);

    /* Himmel */
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#02030A");
    sky.addColorStop(0.55, "#04061A");
    sky.addColorStop(1, "#070B22");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    /* Milchstraße: breites, diagonales Band aus weichen Nebelflecken */
    var ang = (portrait() ? -58 : -26) * Math.PI / 180;
    var dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx;
    var cx = w * 0.52, cy = h * 0.42;
    var bandW = diag * 0.1;
    ctx.globalCompositeOperation = "lighter";
    var i, t, x, y, rad, g;
    for (i = 0; i < 90; i++) {
      t = (r() - 0.5) * diag * 1.25;
      var off = gauss(r) * bandW * 0.55;
      x = cx + dx * t + px * off; y = cy + dy * t + py * off;
      rad = diag * (0.05 + r() * 0.13);
      var core = 1 - Math.min(1, Math.abs(t) / (diag * 0.6));
      var al = 0.03 + 0.036 * core;
      g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, "rgba(176,196,255," + al + ")");
      g.addColorStop(1, "rgba(176,196,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (i = 0; i < 22; i++) {          // wärmerer, hellerer Kern
      t = gauss(r) * diag * 0.12;
      x = cx + dx * t + px * gauss(r) * bandW * 0.2; y = cy + dy * t + py * gauss(r) * bandW * 0.2;
      rad = diag * (0.04 + r() * 0.07);
      g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, "rgba(255,238,215,0.05)");
      g.addColorStop(1, "rgba(255,238,215,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    ctx.globalCompositeOperation = "source-over";
    for (i = 0; i < 26; i++) {          // dunkle Staubbahnen
      t = (r() - 0.5) * diag * 1.1;
      x = cx + dx * t + px * gauss(r) * bandW * 0.35; y = cy + dy * t + py * gauss(r) * bandW * 0.35;
      rad = diag * (0.025 + r() * 0.06);
      g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, "rgba(2,3,10,0.34)");
      g.addColorStop(1, "rgba(2,3,10,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }

    /* Sternenfeld (dichter entlang der Milchstraße) */
    var n = Math.round((w * h) / 1700);
    for (i = 0; i < n; i++) {
      if (r() < 0.55) {
        t = (r() - 0.5) * diag * 1.3; var o2 = gauss(r) * bandW * 0.7;
        x = cx + dx * t + px * o2; y = cy + dy * t + py * o2;
      } else { x = r() * w; y = r() * h; }
      if (x < 0 || x > w || y < 0 || y > h) continue;
      var sz = r() < 0.04 ? 0.9 + r() * 0.9 : 0.25 + r() * 0.55;
      var a = 0.25 + r() * 0.7;
      var warm = r();
      ctx.fillStyle = warm < 0.18 ? "rgba(255,226,196," + a + ")" : warm < 0.34 ? "rgba(190,210,255," + a + ")" : "rgba(255,255,255," + a + ")";
      ctx.beginPath(); ctx.arc(x, y, sz, 0, 6.2832); ctx.fill();
      if (sz > 1) {
        g = ctx.createRadialGradient(x, y, 0, x, y, sz * 5);
        g.addColorStop(0, "rgba(255,255,255,0.22)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g; ctx.fillRect(x - sz * 5, y - sz * 5, sz * 10, sz * 10);
      }
    }

    drawGasPlanet(w, h);
    drawMoon(w, h);
    drawEarth(w, h);

    function portrait() { return h > w * 1.1; }
  }

  /* Ferner Gasplanet, nur zum Teil am rechten oberen Rand sichtbar,
     von links oben angestrahlt (heller Sichelrand). */
  function drawGasPlanet(w, h) {
    var m = Math.min(w, h), R = m * 0.17;
    var cx = w * 0.985, cy = h * 0.19;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.clip();
    var base = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
    var bands = ["#2a3042", "#3b4256", "#2c3245", "#464d63", "#30374a", "#3d4459", "#272d3f"];
    bands.forEach(function (c, k) { base.addColorStop(k / (bands.length - 1), c); });
    ctx.fillStyle = base; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    var lit = ctx.createRadialGradient(cx - R * 0.55, cy - R * 0.5, R * 0.1, cx - R * 0.2, cy - R * 0.1, R * 1.35);
    lit.addColorStop(0, "rgba(255,255,255,0.1)");
    lit.addColorStop(0.45, "rgba(0,0,6,0.15)");
    lit.addColorStop(1, "rgba(0,0,6,0.92)");
    ctx.fillStyle = lit; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();
    var rim = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.12);
    rim.addColorStop(0, "rgba(190,210,255,0)");
    rim.addColorStop(0.45, "rgba(190,210,255,0.3)");
    rim.addColorStop(1, "rgba(190,210,255,0)");
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.28)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.995, Math.PI * 0.82, Math.PI * 1.45); ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }

  /* Kleiner Mond mit heller Sichel */
  function drawMoon(w, h) {
    var m = Math.min(w, h), R = m * 0.03;
    var cx = w * 0.2, cy = h * 0.27;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.clip();
    var g = ctx.createRadialGradient(cx + R * 0.55, cy - R * 0.35, R * 0.1, cx + R * 0.2, cy, R * 1.5);
    g.addColorStop(0, "#d9dce6"); g.addColorStop(0.5, "#6a6f80"); g.addColorStop(1, "#05060c");
    ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();
    var glow = ctx.createRadialGradient(cx, cy, R, cx, cy, R * 3);
    glow.addColorStop(0, "rgba(200,210,235,0.16)"); glow.addColorStop(1, "rgba(200,210,235,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, R * 3, 0, 6.2832); ctx.fill();
  }

  /* Die Erde bei Nacht: großer Bogen am unteren Rand, dunkle Ozeane,
     leuchtende Städte auf den Kontinenten, dünner Atmosphärenrand. */
  function drawEarth(w, h) {
    var portraitMode = h > w * 1.1;
    var R = portraitMode ? h * 0.9 : Math.max(w * 0.85, h);
    var cx = portraitMode ? w * 0.5 : w * 0.3;
    var cy = h + R * (portraitMode ? 0.74 : 0.7);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.clip();

    var sea = ctx.createRadialGradient(cx - R * 0.1, cy - R * 0.92, R * 0.02, cx, cy, R);
    sea.addColorStop(0, "#0a1a3a");
    sea.addColorStop(0.18, "#061029");
    sea.addColorStop(1, "#02040c");
    ctx.fillStyle = sea; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    // schwache Wolkenschleier
    ctx.globalCompositeOperation = "lighter";
    var r = rng(77);
    for (var c = 0; c < 18; c++) {
      var x = r() * w, y = h * (0.66 + r() * 0.34), rad = 60 + r() * 160;
      var cg = ctx.createRadialGradient(x, y, 0, x, y, rad);
      cg.addColorStop(0, "rgba(150,175,230,0.02)"); cg.addColorStop(1, "rgba(150,175,230,0)");
      ctx.fillStyle = cg; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }

    // Städtelichter: nur auf "Land", dichter in Clustern
    var minY = cy - R, attempts = Math.round(w * (h - minY) * 0.5);
    var sc = 0.0042 * (R / 900 + 0.35);
    var warm = ["255,214,140", "255,196,112", "255,236,196", "255,176,96"];
    var rr = rng(4242);
    for (var k = 0; k < attempts; k++) {
      var px = rr() * w, py = minY + rr() * (h - minY);
      var ddx = px - cx, ddy = py - cy;
      if (ddx * ddx + ddy * ddy > R * R * 0.992) continue;
      var land = fbm(px * sc, py * sc * 1.15, 3);
      if (land < 0.5) continue;
      var dens = fbm(px * sc * 3.4 + 40, py * sc * 3.4, 9);
      if (rr() > dens * dens * 1.5) continue;
      var al = 0.25 + rr() * 0.6;
      ctx.fillStyle = "rgba(" + warm[(rr() * warm.length) | 0] + "," + al + ")";
      var s = 0.35 + rr() * 0.7;
      ctx.beginPath(); ctx.arc(px, py, s, 0, 6.2832); ctx.fill();
      if (dens > 0.6 && rr() < 0.012) {
        var gr = 7 + rr() * 14;
        var gg = ctx.createRadialGradient(px, py, 0, px, py, gr);
        gg.addColorStop(0, "rgba(255,200,120,0.2)"); gg.addColorStop(1, "rgba(255,200,120,0)");
        ctx.fillStyle = gg; ctx.fillRect(px - gr, py - gr, gr * 2, gr * 2);
      }
    }

    // Sonnenaufgangs-Schimmer an der Kante
    var dawn = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R);
    dawn.addColorStop(0, "rgba(120,170,255,0)"); dawn.addColorStop(0.8, "rgba(120,170,255,0)"); dawn.addColorStop(1, "rgba(140,185,255,0.38)");
    ctx.fillStyle = dawn; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();

    // Atmosphäre außen
    var atm = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.035);
    atm.addColorStop(0, "rgba(120,170,255,0)");
    atm.addColorStop(0.53, "rgba(120,170,255,0.45)");
    atm.addColorStop(0.78, "rgba(100,150,255,0.14)");
    atm.addColorStop(1, "rgba(100,150,255,0)");
    ctx.fillStyle = atm; ctx.beginPath(); ctx.arc(cx, cy, R * 1.035, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = "rgba(190,215,255,0.5)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.9985, Math.PI * 1.12, Math.PI * 1.92); ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }

  var timer = 0;
  window.addEventListener("resize", function () {
    clearTimeout(timer);
    timer = setTimeout(drawScene, 160);
  });
  drawScene();
})();
