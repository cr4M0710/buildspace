/* ---------------------------------------------------------
   cursor.js
   Liquid-Glass-Zeiger: ein scharfer kleiner Kern plus ein
   weicher, leicht verzögerter Schleier in den Aurora-Farben,
   der dem Zeiger sanft hinterherzieht. Nur auf Geräten mit
   präzisem Zeiger (Maus/Trackpad) und wenn die Person keine
   reduzierte Bewegung eingestellt hat.
--------------------------------------------------------- */
(function () {
  "use strict";
  const isFine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!isFine || reduceMotion) return;

  function init() {
    const style = document.createElement("style");
    style.textContent = [
      "* { cursor: none !important; }",
      "#lg-veil, #lg-core {",
      "  position: fixed; top: 0; left: 0; pointer-events: none; z-index: 2147483647;",
      "  border-radius: 50%; transform: translate(-50%, -50%); will-change: transform; opacity: 0; }",
      "#lg-veil {",
      "  width: 46px; height: 46px;",
      "  background: linear-gradient(135deg, rgba(109,93,251,0.35), rgba(255,79,163,0.3), rgba(34,211,238,0.3), rgba(255,180,84,0.32));",
      "  backdrop-filter: blur(6px) saturate(180%); -webkit-backdrop-filter: blur(6px) saturate(180%);",
      "  border: 1px solid rgba(255,255,255,0.5);",
      "  box-shadow: inset 0 1px 4px rgba(255,255,255,0.6), 0 4px 18px rgba(20,20,30,0.18);",
      "  transition: width 0.25s ease, height 0.25s ease, opacity 0.2s ease; }",
      "#lg-core { width: 9px; height: 9px; background: rgba(255,255,255,0.95);",
      "  box-shadow: 0 0 0 1.5px rgba(120,110,255,0.5), 0 2px 6px rgba(20,20,30,0.3);",
      "  transition: opacity 0.2s ease; }",
      "body.lg-pressed #lg-veil { width: 36px; height: 36px; }",
      "body.lg-hover #lg-veil { width: 62px; height: 62px; }"
    ].join("\n");
    document.head.appendChild(style);

    const veil = document.createElement("div");
    veil.id = "lg-veil";
    const core = document.createElement("div");
    core.id = "lg-core";
    document.body.appendChild(veil);
    document.body.appendChild(core);

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let vx = mx, vy = my;
    let visible = false;

    function show() {
      if (visible) return;
      visible = true;
      veil.style.opacity = "0.75";
      core.style.opacity = "1";
    }
    function hide() {
      visible = false;
      veil.style.opacity = "0";
      core.style.opacity = "0";
    }

    window.addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY;
      show();
      core.style.transform = "translate(" + mx + "px, " + my + "px) translate(-50%, -50%)";
      const target = e.target && e.target.closest &&
        e.target.closest("a, button, .folder-card, .post-card, input, select, [role=button]");
      document.body.classList.toggle("lg-hover", !!target);
    }, { passive: true });

    window.addEventListener("pointerdown", () => document.body.classList.add("lg-pressed"));
    window.addEventListener("pointerup", () => document.body.classList.remove("lg-pressed"));
    document.addEventListener("mouseleave", hide);
    document.addEventListener("mouseenter", show);

    function raf() {
      vx += (mx - vx) * 0.16;
      vy += (my - vy) * 0.16;
      veil.style.transform = "translate(" + vx + "px, " + vy + "px) translate(-50%, -50%)";
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
