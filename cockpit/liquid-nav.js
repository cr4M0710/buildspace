/* =========================================================
   liquid-nav.js – Liquid-Glass-Bewegung für Leisten (buildspace & Cockpit)

   Nachgebaut nach dem Referenzvideo „Glassy SideBar“:
   • Eine Glas-Kapsel markiert den aktiven Eintrag. Beim Wechsel zieht sie
     sich wie ein Tropfen über beide Einträge in die Länge und schnurrt dann
     federnd auf den neuen zusammen.
   • Eine zweite, zartere Kapsel folgt dem Zeiger (Hover) auf dieselbe Art.
   • Eingeklappt: EIN Hinweisschild gleitet neben der Leiste mit dem Zeiger
     von Eintrag zu Eintrag, statt bei jedem Knopf neu aufzuploppen.
   • Leisten, die neu gezeichnet werden (innerHTML), behalten Kapsel und
     Position – sie gleiten vom alten zum neuen Eintrag.
   • LiquidNav.morph(): eine Seitenleiste wächst aus der schmalen Leiste
     heraus auf und schrumpft beim Schließen wieder hinein.

   Ohne Abhängigkeiten. Bei „Bewegung reduzieren“ (html.calm oder
   prefers-reduced-motion) springt alles ohne Animation.
   ========================================================= */
(function () {
  "use strict";
  if (window.LiquidNav) return;

  const calm = () => document.documentElement.classList.contains("calm") ||
    (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const SPRING = "cubic-bezier(.22,1.28,.36,1)";   // leichtes Nachfedern wie im Video

  function css() {
    if (document.getElementById("lq-style")) return;
    const s = document.createElement("style");
    s.id = "lq-style";
    s.textContent = `
.lq-pill,.lq-hover{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:-1;margin:0;padding:0;border-radius:var(--lq-r,16px);opacity:0;will-change:transform,width,height}
.lq-pill{background:linear-gradient(160deg,rgba(255,255,255,.30),rgba(255,255,255,.12));border:1px solid rgba(255,255,255,.55);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.65),inset 0 -1px 0 rgba(255,255,255,.12),0 6px 18px -6px rgba(0,0,0,.45);
  -webkit-backdrop-filter:blur(6px) saturate(170%);backdrop-filter:blur(6px) saturate(170%)}
.lq-hover{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22);box-shadow:inset 0 1px 0 rgba(255,255,255,.25)}
.lq-on>.lq-pill.on,.lq-on .lq-pill.on{opacity:1}
.lq-on>.lq-hover.on,.lq-on .lq-hover.on{opacity:1}
.lq-hover{transition:opacity .2s ease}
.lq-tip{position:fixed;left:0;top:0;z-index:2147483000;pointer-events:none;white-space:nowrap;opacity:0;
  padding:6px 12px;border-radius:11px;font:600 12.5px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;color:#f5f5fa;
  background:linear-gradient(160deg,rgba(60,60,72,.78),rgba(28,28,38,.82));border:1px solid rgba(255,255,255,.22);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 10px 26px -8px rgba(0,0,0,.6);
  -webkit-backdrop-filter:blur(16px) saturate(160%);backdrop-filter:blur(16px) saturate(160%);
  transition:opacity .18s ease,transform .34s ${SPRING};}
.lq-tip.on{opacity:1}
.lq-tip kbd{font:inherit;font-size:10.5px;opacity:.65;margin-left:8px;padding:1px 5px;border-radius:5px;background:rgba(255,255,255,.12)}
html.light-ui .lq-tip,html[data-theme="light"] .lq-tip{color:#14161d;background:linear-gradient(160deg,rgba(255,255,255,.92),rgba(240,240,245,.86));border-color:rgba(0,0,0,.08)}
html[data-theme="light"] .lq-pill{background:linear-gradient(160deg,rgba(255,255,255,.75),rgba(255,255,255,.45));border-color:rgba(255,255,255,.9);box-shadow:inset 0 1px 0 #fff,0 6px 18px -6px rgba(20,20,40,.3)}
html[data-theme="light"] .lq-hover{background:rgba(255,255,255,.4);border-color:rgba(255,255,255,.7)}
`;
    document.head.appendChild(s);
  }

  /* Rechteck eines Eintrags relativ zum Behälter (inkl. Scrollen) */
  function rel(el, box) {
    const a = el.getBoundingClientRect(), b = box.getBoundingClientRect();
    return { x: a.left - b.left - box.clientLeft + box.scrollLeft, y: a.top - b.top - box.clientTop + box.scrollTop, w: a.width, h: a.height };
  }
  const same = (a, b) => a && b && Math.abs(a.x - b.x) < .5 && Math.abs(a.y - b.y) < .5 && Math.abs(a.w - b.w) < .5 && Math.abs(a.h - b.h) < .5;
  const frame = r => ({ transform: `translate(${r.x}px,${r.y}px)`, width: r.w + "px", height: r.h + "px" });

  /* Tropfen-Bewegung: über beide Einträge strecken, dann federnd zusammenziehen */
  function liquid(el, from, to, quick) {
    if (el._anim) { try { el._anim.cancel(); } catch (e) { /* egal */ } }
    Object.assign(el.style, frame(to));
    if (!from || calm() || same(from, to)) return;
    const vertical = Math.abs(to.y - from.y) >= Math.abs(to.x - from.x);
    const dist = vertical ? Math.abs(to.y - from.y) : Math.abs(to.x - from.x);
    const mid = vertical
      ? { x: to.x + 3, w: Math.max(8, to.w - 6), y: Math.min(from.y, to.y), h: Math.max(from.y + from.h, to.y + to.h) - Math.min(from.y, to.y) }
      : { y: to.y + 3, h: Math.max(8, to.h - 6), x: Math.min(from.x, to.x), w: Math.max(from.x + from.w, to.x + to.w) - Math.min(from.x, to.x) };
    const dur = Math.round(Math.min(quick ? 420 : 620, (quick ? 230 : 330) + dist * (quick ? .35 : .55)));
    try {
      el._anim = el.animate([
        Object.assign(frame(from), { easing: "cubic-bezier(.4,0,.6,1)" }),
        Object.assign(frame(mid), { offset: .42, easing: SPRING }),
        frame(to)
      ], { duration: dur, fill: "none" });
    } catch (e) { /* ältere Browser: ohne Animation */ }
  }

  function attach(root, opt) {
    if (!root || root._lq) return root && root._lq;
    css();
    opt = Object.assign({
      item: "a,button",            // Einträge
      active: ".is-active",        // aktiver Eintrag
      box: null,                   // Behälter für die Kapseln (Standard: root)
      collapsed: () => false,      // eingeklappt? → Hinweisschild statt Beschriftung
      tip: el => el.getAttribute("aria-label") || "",
      tipSide: "right",
      hover: true,
      radius: null
    }, opt || {});
    const st = { pill: null, hov: null, last: null, lastHov: null, hovEl: null, tipEl: null, tipOn: false, raf: 0 };
    const box = () => (typeof opt.box === "function" ? opt.box() : opt.box) || root;

    function ensure() {
      const b = box();
      if (!b) return null;
      if (getComputedStyle(b).position === "static") b.style.position = "relative";
      if (getComputedStyle(b).isolation !== "isolate") b.style.isolation = "isolate";   // Kapseln liegen hinter den Einträgen
      if (!b.classList.contains("lq-on")) b.classList.add("lq-on");
      if (!st.pill || st.pill.parentNode !== b) { st.pill = document.createElement("span"); st.pill.className = "lq-pill"; st.pill.setAttribute("aria-hidden", "true"); b.insertBefore(st.pill, b.firstChild); }
      if (opt.hover && (!st.hov || st.hov.parentNode !== b)) { st.hov = document.createElement("span"); st.hov.className = "lq-hover"; st.hov.setAttribute("aria-hidden", "true"); b.insertBefore(st.hov, b.firstChild); }
      return b;
    }
    function radiusOf(el) { if (opt.radius != null) return opt.radius; const r = getComputedStyle(el).borderTopLeftRadius; return r && r !== "0px" ? r : "16px"; }
    function activeEl() { const b = box(); return b && b.querySelector(opt.active); }

    /* aktive Kapsel an den aktiven Eintrag (animiert, wenn sich der Platz ändert) */
    function sync(animate) {
      const b = ensure(); if (!b) return;
      const a = activeEl();
      if (!a || !a.offsetParent) { if (st.pill.classList.contains("on")) st.pill.classList.remove("on"); b.classList.remove("lq-has-active"); st.last = null; return; }
      const r = rel(a, b);
      st.pill.style.setProperty("--lq-r", radiusOf(a));
      liquid(st.pill, animate ? st.last : null, r, false);
      if (!st.pill.classList.contains("on")) st.pill.classList.add("on");
      st.last = r;
      if (!b.classList.contains("lq-has-active")) b.classList.add("lq-has-active");
    }
    function hover(el) {
      if (!opt.hover) return;
      const b = ensure(); if (!b) return;
      if (!el) { st.hov.classList.remove("on"); st.hovEl = null; return; }
      const r = rel(el, b);
      st.hov.style.setProperty("--lq-r", radiusOf(el));
      const wasOn = st.hov.classList.contains("on");
      liquid(st.hov, wasOn ? st.lastHov : null, r, true);
      st.hov.classList.add("on");
      st.lastHov = r; st.hovEl = el;
    }

    /* Hinweisschild neben der eingeklappten Leiste */
    function tipShow(el) {
      if (!opt.collapsed() || !matchMedia("(hover: hover)").matches) return tipHide();
      const text = opt.tip(el); if (!text) return tipHide();
      if (!st.tipEl) { st.tipEl = document.createElement("div"); st.tipEl.className = "lq-tip"; st.tipEl.setAttribute("aria-hidden", "true"); document.body.appendChild(st.tipEl); }
      const t = st.tipEl;
      t.innerHTML = "";
      const parts = String(text).split(" · ");
      t.appendChild(document.createTextNode(parts[0]));
      if (parts[1]) { const k = document.createElement("kbd"); k.textContent = parts[1]; t.appendChild(k); }
      const a = el.getBoundingClientRect(), rr = root.getBoundingClientRect();
      const tw = t.offsetWidth, th = t.offsetHeight;
      const x = opt.tipSide === "right" ? rr.right + 12 : a.left + a.width / 2 - tw / 2;
      const y = opt.tipSide === "right" ? a.top + a.height / 2 - th / 2 : rr.top - th - 10;
      if (!st.tipOn || calm()) {
        t.style.transition = "none";
        t.style.transform = `translate(${x - (opt.tipSide === "right" ? 8 : 0)}px,${y}px) scale(.96)`;
        void t.offsetWidth; t.style.transition = "";
      }
      t.style.transform = `translate(${x}px,${y}px)`;
      t.classList.add("on"); st.tipOn = true;
    }
    function tipHide() { if (st.tipEl) st.tipEl.classList.remove("on"); st.tipOn = false; }

    const itemOf = t => { const el = t && t.closest && t.closest(opt.item); return el && root.contains(el) ? el : null; };
    root.addEventListener("pointerover", e => {
      if (e.pointerType === "touch") return;
      const el = itemOf(e.target);
      if (el && el !== st.hovEl) { hover(el); tipShow(el); }
    });
    root.addEventListener("pointerleave", () => { hover(null); tipHide(); });
    root.addEventListener("focusin", e => { const el = itemOf(e.target); if (el && el.matches(":focus-visible")) { hover(el); tipShow(el); } });
    root.addEventListener("focusout", () => { tipHide(); });
    root.addEventListener("scroll", () => { tipHide(); if (st.hovEl) hover(st.hovEl); }, { passive: true });

    /* neu gezeichnet oder Aktiv-Klasse gewechselt → Kapsel gleitet hinterher */
    const mine = n => n === st.pill || n === st.hov;
    const mo = new MutationObserver(recs => {
      const real = recs.some(r => r.type === "childList"
        ? [...r.addedNodes, ...r.removedNodes].some(n => !mine(n))
        : !mine(r.target) && r.target !== box());
      if (!real) return;
      cancelAnimationFrame(st.raf);
      st.raf = requestAnimationFrame(() => {
        ensure(); sync(true);
        if (st.hovEl && !st.hovEl.isConnected) { st.hovEl = null; st.hov && st.hov.classList.remove("on"); }
        if (st.tipOn && !opt.collapsed()) tipHide();
      });
    });
    mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "aria-current"] });
    /* Größe ändert sich (Aufklappen, Fenster) → Kapsel ohne Tropfen mitführen */
    let follow = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(follow);
      follow = requestAnimationFrame(() => { sync(false); if (st.hovEl && st.hovEl.isConnected) { const b = box(); st.lastHov = rel(st.hovEl, b); Object.assign(st.hov.style, frame(st.lastHov)); } });
    });
    ro.observe(root);
    window.addEventListener("resize", () => sync(false), { passive: true });
    requestAnimationFrame(() => sync(false));

    /* Mitlaufen während einer Breiten-Animation (Leiste klappt auf/zu) */
    function track(ms) {
      const end = performance.now() + (ms || 650);
      const step = () => { sync(false); if (st.hovEl && st.hovEl.isConnected) { st.lastHov = rel(st.hovEl, box()); Object.assign(st.hov.style, frame(st.lastHov)); } if (performance.now() < end) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
    root._lq = { sync, track, hideTip: tipHide };
    return root._lq;
  }

  /* Seitenleiste wächst aus der schmalen Leiste heraus (und schrumpft wieder hinein).
     Beobachtet eine Klasse auf <html>, z. B. „sidebar-open“. */
  function morph(panel, rail, openClass, opts) {
    if (!panel || !rail || panel._lqMorph) return;
    opts = Object.assign({ when: () => true, items: null }, opts || {});
    panel._lqMorph = true;
    const html = document.documentElement;
    let open = html.classList.contains(openClass), anim = null;
    const railInset = () => {
      const p = panel.getBoundingClientRect(), r = rail.getBoundingClientRect();
      const rad = Math.min(r.width, r.height) / 2;
      return `inset(${Math.max(0, r.top - p.top)}px ${Math.max(0, p.right - r.right)}px ${Math.max(0, p.bottom - r.bottom)}px ${Math.max(0, r.left - p.left)}px round ${rad}px)`;
    };
    const full = () => `inset(0px 0px 0px 0px round ${getComputedStyle(panel).borderTopLeftRadius || "28px"})`;
    new MutationObserver(() => {
      const now = html.classList.contains(openClass);
      if (now === open) return;
      open = now;
      if (calm() || !opts.when() || !rail.getClientRects().length || getComputedStyle(rail).display === "none") return;
      if (anim) { try { anim.cancel(); } catch (e) { /* egal */ } }
      html.classList.add("lq-morphing");
      document.querySelectorAll(".lq-tip.on").forEach(t => t.classList.remove("on"));
      if (now) {
        html.classList.remove("lq-closing");
        anim = panel.animate([{ clipPath: railInset(), opacity: .85 }, { clipPath: full(), opacity: 1 }], { duration: 640, easing: SPRING });
        const items = opts.items ? panel.querySelectorAll(opts.items) : [];
        items.forEach((el, i) => { if (i < 24) el.animate([{ opacity: 0, transform: "translateX(-10px)" }, { opacity: 1, transform: "none" }], { duration: 360, delay: 90 + i * 18, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }); });
        anim.onfinish = anim.oncancel = () => { html.classList.remove("lq-morphing"); anim = null; };
      } else {
        html.classList.add("lq-closing");
        const a = anim = panel.animate([{ clipPath: full(), opacity: 1 }, { clipPath: railInset(), opacity: .5 }], { duration: 420, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" });
        a.onfinish = () => {
          html.classList.remove("lq-closing", "lq-morphing");          // Leiste ist sofort unsichtbar …
          requestAnimationFrame(() => requestAnimationFrame(() => { try { a.cancel(); } catch (e) { /* egal */ } }));   // … erst dann Ausschnitt lösen
          if (anim === a) anim = null;
        };
        a.oncancel = () => { html.classList.remove("lq-closing", "lq-morphing"); if (anim === a) anim = null; };
      }
    }).observe(html, { attributes: true, attributeFilter: ["class"] });
  }

  window.LiquidNav = { attach, morph };
})();
