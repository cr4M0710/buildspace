/* ---------------------------------------------------------
   stars.js
   Hintergrund-Effekt: vereinzelt ziehen kleine weiße Sternschnuppen
   (Punkt mit Schweif und ein paar Funken) durch den Bildschirm und
   blenden aus. Ein einziges Canvas hinter allen Inhalten; die
   Glas-Flächen weichzeichnen es dadurch schön. Aus bei "reduzierte
   Bewegung", pausiert im Hintergrund-Tab.
--------------------------------------------------------- */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  var canvas = document.createElement("canvas");
  canvas.id = "bg-stars";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;";
  document.body.appendChild(canvas);
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var w = 0, h = 0, dpr = 1;
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  var stars = [], sparks = [], raf = 0, spawnTimer = 0, lastT = 0;
  var MAX_STARS = 3;

  function isDark() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function spawn() {
    if (stars.length < MAX_STARS) {
      var dir = Math.random() < 0.5 ? 1 : -1;            // 1 = nach rechts unten, -1 = nach links unten
      var ang = rand(20, 42) * Math.PI / 180;
      var speed = rand(420, 820);
      stars.push({
        x: dir === 1 ? rand(-0.05, 0.7) * w : rand(0.3, 1.05) * w,
        y: rand(-0.05, 0.45) * h,
        vx: Math.cos(ang) * speed * dir,
        vy: Math.sin(ang) * speed,
        age: 0,
        life: rand(1.1, 2.1),
        tail: rand(90, 190),
        r: rand(1.7, 2.9),
        sparkAcc: 0
      });
    }
    spawnTimer = setTimeout(spawn, rand(900, 3200));
    kick();
  }

  function frame(now) {
    var dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
    lastT = now;
    ctx.clearRect(0, 0, w, h);
    var dark = isDark();
    var glow = dark ? "rgba(255,255,255,0.85)" : "rgba(95,85,230,0.6)";

    for (var i = stars.length - 1; i >= 0; i--) {
      var s = stars[i];
      s.age += dt;
      var p = s.age / s.life;
      if (p >= 1) { stars.splice(i, 1); continue; }
      s.x += s.vx * dt; s.y += s.vy * dt;
      // sanft einblenden (erste 15 %), lange ausblenden (letzte 45 %)
      var a = p < 0.15 ? p / 0.15 : p > 0.55 ? Math.max(0, (1 - p) / 0.45) : 1;
      var len = Math.hypot(s.vx, s.vy);
      var tx = s.x - (s.vx / len) * s.tail * (0.4 + 0.6 * a);
      var ty = s.y - (s.vy / len) * s.tail * (0.4 + 0.6 * a);

      var g = ctx.createLinearGradient(s.x, s.y, tx, ty);
      g.addColorStop(0, "rgba(255,255,255," + (0.95 * a) + ")");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.save();
      ctx.shadowBlur = 8; ctx.shadowColor = glow;
      ctx.strokeStyle = g; ctx.lineWidth = s.r * 0.9; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255," + a + ")";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // kleine Funken entlang der Bahn
      s.sparkAcc += dt;
      if (s.sparkAcc > 0.05 && a > 0.2) {
        s.sparkAcc = 0;
        sparks.push({ x: s.x + rand(-4, 4), y: s.y + rand(-4, 4), age: 0, life: rand(0.5, 0.9), r: rand(0.6, 1.3) });
      }
    }

    for (var j = sparks.length - 1; j >= 0; j--) {
      var k = sparks[j];
      k.age += dt;
      var q = k.age / k.life;
      if (q >= 1) { sparks.splice(j, 1); continue; }
      ctx.save();
      ctx.shadowBlur = 5; ctx.shadowColor = glow;
      ctx.fillStyle = "rgba(255,255,255," + (0.8 * (1 - q)) + ")";
      ctx.beginPath(); ctx.arc(k.x, k.y, k.r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    if (stars.length || sparks.length) raf = requestAnimationFrame(frame);
    else { raf = 0; ctx.clearRect(0, 0, w, h); }
  }

  function kick() {
    if (raf || document.hidden) return;
    lastT = performance.now();
    raf = requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    else kick();
  });

  spawnTimer = setTimeout(spawn, 700);
})();
