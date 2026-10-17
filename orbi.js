/* Orbi – der Lernbegleiter von buildspace (Marc Stroh)
   Ein Liquid-Glass-Maskottchen, das vom rechten Bildschirmrand hereinschaut,
   winkt, blinzelt und lächelt und auf Antippen einen Lerntipp gibt.
   "Orbi kennenlernen" spielt die sieben Ganzkörper-Clips nacheinander ab.

   - Videos: assets/orbi/ (H.264 auf schwarzem Grund; im Nachtmodus per
     mix-blend-mode: screen freigestellt – funktioniert auch in Safari/iPad)
   - Ein- und ausschalten: Menü → Einstellungen → "Orbi" (localStorage
     "buildspace_orbi" = "on" | "off"). Bei "Bewegung reduzieren" ist Orbi
     standardmäßig aus, lässt sich aber bewusst einschalten.
   - In Freigabe- und Einbettungsansicht (share-mode/embed-mode) bleibt
     Orbi weg. */
(function () {
  "use strict";

  var KEY = "buildspace_orbi";
  var BASE = "assets/orbi/";
  var doc = document.documentElement;
  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  var TEXT = {
    de: {
      on: "An", off: "Aus",
      hit: "Orbi, dein Lernbegleiter. Antippen für einen Tipp.",
      close: "Tipp schließen", meet: "Orbi kennenlernen", hide: "Ausblenden",
      hello: "Hallo, ich bin Orbi! Tipp mich an, wenn du einen Tipp brauchst.",
      bye: "Bis bald! Im Menü unter „Orbi“ holst du mich zurück.",
      title: "Das ist Orbi", next: "Weiter", done: "Los geht's", clip: "Clip",
      tips: {
        home: ["Tippe auf einen Ordner, um loszulegen.",
               "Mit der Lupe oben findest du jedes Spiel und Tool.",
               "Im Menü kannst du zwischen Nacht und Hell wechseln."],
        schule: ["Bei vielen Fächern helfen dir Filter, zum Beispiel für deinen Jahrgang.",
                 "Fang ruhig mit einer leichten Aufgabe an und steigere dich dann."],
        handball: ["Auch beim Handball gilt: Übung macht den Meister!"],
        freizeit: ["Hier findest du Spiele und Projekte für die Freizeit."],
        any: ["Fehler sind okay. Aus jedem Versuch lernst du etwas.",
              "Lies die Aufgabe zweimal, bevor du loslegst.",
              "Erklär die Aufgabe jemandem. So verstehst du sie selbst noch besser.",
              "Kurze Pause? Einmal tief durchatmen hilft dem Kopf.",
              "Kleine Schritte bringen dich auch ans Ziel."]
      },
      story: ["Hallo! Ich bin Orbi, dein Lernbegleiter auf buildspace.",
              "Ich schaue mich gern um und entdecke mit dir neue Spiele und Tools.",
              "Wenn du nicht weiterkommst: Tipp mich an, dann bekommst du einen Tipp.",
              "Jede gelöste Aufgabe ist ein kleiner Sprung nach vorn!",
              "Und wenn mal etwas danebengeht? Kurz landen, durchatmen, weiter geht's.",
              "Ich bin aus Glas und Licht, genau wie buildspace.",
              "Bereit? Dann los! Im Menü kannst du mich jederzeit ausschalten."]
    },
    en: {
      on: "On", off: "Off",
      hit: "Orbi, your learning buddy. Tap for a tip.",
      close: "Close tip", meet: "Meet Orbi", hide: "Hide",
      hello: "Hi, I'm Orbi! Tap me whenever you need a tip.",
      bye: "See you! Turn me back on under “Orbi” in the menu.",
      title: "Meet Orbi", next: "Next", done: "Let's go", clip: "Clip",
      tips: {
        home: ["Tap a folder to get started.",
               "Use the magnifier at the top to find any game or tool.",
               "In the menu you can switch between night and light mode."],
        schule: ["Many subjects have filters, for example for your year group.",
                 "Start with an easy task and work your way up."],
        handball: ["Handball or maths: practice makes perfect!"],
        freizeit: ["Here you'll find games and projects for your free time."],
        any: ["Mistakes are okay. Every try teaches you something.",
              "Read the task twice before you start.",
              "Explain the task to someone else. You'll understand it even better.",
              "Need a break? One deep breath helps your brain.",
              "Small steps get you there too."]
      },
      story: ["Hi! I'm Orbi, your learning buddy on buildspace.",
              "I like to look around and discover new games and tools with you.",
              "Stuck? Tap me and I'll give you a tip.",
              "Every solved task is a little jump forward!",
              "And if something goes wrong? Land, breathe, keep going.",
              "I'm made of glass and light, just like buildspace.",
              "Ready? Let's go! You can switch me off in the menu any time."]
    }
  };
  var STORY_CLIPS = ["1-ruhig", "2-blinzeln", "3-winken", "4-huepfen", "5-landen", "6-glow", "7-abschluss"];
  var ACTIONS = ["winken", "blinzeln", "laecheln"];

  function T() { return /^en/i.test(doc.lang || "") ? TEXT.en : TEXT.de; }
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function store(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function isOn() { var s = stored(); if (s === "on") return true; if (s === "off") return false; return !reduce; }
  function suppressed() { return doc.classList.contains("share-mode") || doc.classList.contains("embed-mode"); }
  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function mkVideo() {
    var v = el("video", "", { muted: "", playsinline: "", "webkit-playsinline": "", preload: "auto", "aria-hidden": "true", disablepictureinpicture: "" });
    v.muted = true; v.playsInline = true;
    return v;
  }

  /* ---------- Aufbau ---------- */
  var root = el("div", "orbi", { id: "orbi" });
  root.hidden = true;
  var bubble = el("div", "orbi-bubble glass", { role: "status", "aria-live": "polite" });
  var bText = el("p", "orbi-text");
  var bActions = el("div", "orbi-actions");
  var bMeet = el("button", "orbi-pill", { type: "button" });
  var bHide = el("button", "orbi-pill orbi-pill-soft", { type: "button" });
  var bClose = el("button", "orbi-x", { type: "button" });
  bClose.innerHTML = "&times;";
  bActions.appendChild(bMeet); bActions.appendChild(bHide);
  bubble.appendChild(bClose); bubble.appendChild(bText); bubble.appendChild(bActions);
  var stage = el("div", "orbi-stage");
  var vA = mkVideo(), vB = mkVideo();
  stage.appendChild(vA); stage.appendChild(vB);
  var hit = el("button", "orbi-hit", { type: "button" });
  stage.hidden = true;
  root.appendChild(bubble); root.appendChild(hit);
  function shown(b) { root.hidden = !b; stage.hidden = !b; }

  var modal = el("div", "orbi-modal", { role: "dialog", "aria-modal": "true", "aria-labelledby": "orbi-modal-title" });
  modal.hidden = true;
  modal.innerHTML =
    '<div class="orbi-modal-card glass">' +
      '<button type="button" class="orbi-x orbi-modal-x">&times;</button>' +
      '<h2 id="orbi-modal-title"></h2>' +
      '<div class="orbi-screen"><video muted playsinline webkit-playsinline preload="auto" aria-hidden="true"></video></div>' +
      '<p class="orbi-caption" aria-live="polite"></p>' +
      '<div class="orbi-dots"></div>' +
      '<div class="orbi-modal-actions"><button type="button" class="orbi-pill orbi-next"></button></div>' +
    '</div>';
  var mVideo = modal.querySelector("video");
  mVideo.muted = true; mVideo.playsInline = true;
  var mCaption = modal.querySelector(".orbi-caption");
  var mDots = modal.querySelector(".orbi-dots");
  var mNext = modal.querySelector(".orbi-next");
  var mClose = modal.querySelector(".orbi-modal-x");
  STORY_CLIPS.forEach(function (c, i) {
    var d = el("button", "orbi-dot", { type: "button" });
    d.addEventListener("click", function () { storyGo(i); });
    mDots.appendChild(d);
  });

  /* ---------- Video-Steuerung (zwei Ebenen, damit es beim Wechsel nicht flackert) ---------- */
  var cur = vA, nxt = vB, token = 0, state = "out", busy = false, lastAction = "";
  function staticFallback() { stage.classList.add("orbi-static"); }
  function play(name, loop) {
    var my = ++token;
    var v = nxt;
    var src = BASE + "orbi-peek-" + name + ".mp4";
    v.loop = !!loop;
    if (v.getAttribute("src") !== src) { v.setAttribute("src", src); try { v.load(); } catch (e) {} }
    else { try { v.currentTime = 0; } catch (e) {} }
    return new Promise(function (resolve) {
      function show() {
        if (my !== token) { resolve(null); return; }
        v.classList.add("on");
        cur.classList.remove("on");
        var old = cur;
        cur = v; nxt = old;
        setTimeout(function () { if (old !== cur) old.pause(); }, 80);
        resolve(v);
      }
      var p;
      try { p = v.play(); } catch (e) { p = null; }
      if (p && typeof p.then === "function") {
        p.then(function () {
          if (v.readyState >= 2) show(); else v.addEventListener("playing", show, { once: true });
        }, function () { staticFallback(); resolve(null); });
      } else { show(); }
    });
  }
  function afterEnd(v, cb) {
    if (!v) { cb(); return; }
    v.addEventListener("ended", function h() { v.removeEventListener("ended", h); cb(); });
  }
  function idle() { if (state === "in") play("idle", true); }

  function enter(greet) {
    if (state !== "out" || suppressed()) return;
    state = "entering";
    stage.classList.remove("orbi-static");
    shown(true);
    play("rein").then(function (v) {
      afterEnd(v, function () {
        if (state !== "entering") return;
        state = "in"; busy = true;
        play("winken").then(function (v2) {
          if (greet) say(T().hello);
          afterEnd(v2, function () { busy = false; idle(); });
        });
      });
    });
  }
  function leave() {
    if (state === "out" || state === "leaving") return;
    state = "leaving";
    hideBubble();
    play("raus").then(function (v) {
      afterEnd(v, function () {
        if (state !== "leaving") return;
        state = "out";
        shown(false);
        vA.pause(); vB.pause();
      });
    });
  }
  function action() {
    if (state !== "in" || busy) return;
    var pool = ACTIONS.filter(function (a) { return a !== lastAction; });
    var a = pool[Math.floor(Math.random() * pool.length)];
    lastAction = a; busy = true;
    play(a).then(function (v) { afterEnd(v, function () { busy = false; idle(); }); });
  }

  /* ---------- Sprechblase ---------- */
  var tipIdx = {}, bubbleTimer = 0;
  function area() {
    var m = /^#\/(schule|handball|freizeit)/.exec(location.hash || "");
    return m ? m[1] : "home";
  }
  function nextTip() {
    var t = T().tips, a = area();
    var list = t[a].concat(t.any);
    var i = tipIdx[a] || 0;
    tipIdx[a] = (i + 1) % list.length;
    return list[i];
  }
  function say(text) {
    var tx = T();
    bText.textContent = text;
    bMeet.textContent = tx.meet;
    bHide.textContent = tx.hide;
    bClose.setAttribute("aria-label", tx.close);
    root.classList.add("orbi-talking");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () {
      if (!bubble.contains(document.activeElement)) hideBubble();
    }, 9000);
  }
  function hideBubble() { clearTimeout(bubbleTimer); root.classList.remove("orbi-talking"); }

  hit.addEventListener("click", function () {
    if (state !== "in") return;
    say(nextTip());
    action();
  });
  bClose.addEventListener("click", hideBubble);
  bMeet.addEventListener("click", function () { hideBubble(); openStory(); });
  bHide.addEventListener("click", function () {
    say(T().bye);
    setTimeout(function () { setOn(false); }, 2600);
  });

  /* ---------- "Orbi kennenlernen": die sieben Ganzkörper-Clips ---------- */
  var storyI = 0, lastFocus = null;
  function storyGo(i) {
    storyI = i;
    var tx = T();
    mVideo.setAttribute("src", BASE + "orbi-" + STORY_CLIPS[i] + ".mp4");
    try { mVideo.load(); } catch (e) {}
    var p; try { p = mVideo.play(); } catch (e) { p = null; }
    if (p && p.catch) p.catch(function () {});
    mCaption.textContent = tx.story[i];
    Array.prototype.forEach.call(mDots.children, function (d, k) {
      d.setAttribute("aria-label", tx.clip + " " + (k + 1));
      d.setAttribute("aria-current", k === i ? "true" : "false");
    });
    mNext.textContent = i === STORY_CLIPS.length - 1 ? tx.done : tx.next;
  }
  function openStory() {
    var tx = T();
    lastFocus = document.activeElement;
    modal.querySelector("h2").textContent = tx.title;
    mClose.setAttribute("aria-label", tx.close);
    modal.hidden = false;
    cur.pause();
    storyGo(0);
    mClose.focus();
  }
  function closeStory() {
    if (modal.hidden) return;
    modal.hidden = true;
    mVideo.pause();
    if (state === "in" && !document.hidden) { var p = cur.play(); if (p && p.catch) p.catch(function () {}); }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  mVideo.addEventListener("ended", function () { if (storyI < STORY_CLIPS.length - 1) storyGo(storyI + 1); });
  mNext.addEventListener("click", function () { if (storyI < STORY_CLIPS.length - 1) storyGo(storyI + 1); else closeStory(); });
  mClose.addEventListener("click", closeStory);
  modal.addEventListener("click", function (e) { if (e.target === modal) closeStory(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { if (!modal.hidden) closeStory(); else hideBubble(); }
    if (e.key === "Tab" && !modal.hidden) {
      var f = modal.querySelectorAll("button");
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- Einstellung im Menü ---------- */
  function syncSettings() {
    var on = isOn(), tx = T();
    document.querySelectorAll("[data-orbi-set]").forEach(function (b) {
      b.setAttribute("aria-pressed", String((b.getAttribute("data-orbi-set") === "on") === on));
      b.textContent = b.getAttribute("data-orbi-set") === "on" ? tx.on : tx.off;
    });
    hit.setAttribute("aria-label", tx.hit);
  }
  function setOn(on) {
    store(on ? "on" : "off");
    syncSettings();
    if (on) enter(false); else leave();
  }

  /* ---------- Start ---------- */
  function init() {
    document.body.appendChild(stage);
    document.body.appendChild(root);
    document.body.appendChild(modal);
    syncSettings();
    document.querySelectorAll("[data-orbi-set]").forEach(function (b) {
      b.addEventListener("click", function () { setOn(b.getAttribute("data-orbi-set") === "on"); });
    });
    new MutationObserver(function () {
      syncSettings();
      if (suppressed() && state !== "out") { state = "out"; shown(false); vA.pause(); vB.pause(); }
    }).observe(doc, { attributes: true, attributeFilter: ["lang", "class"] });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { vA.pause(); vB.pause(); mVideo.pause(); }
      else if (state === "in" && modal.hidden) { var p = cur.play(); if (p && p.catch) p.catch(function () {}); }
    });
    // Erst auftauchen, wenn die Anmeldung (protect.js) erledigt ist
    var waited = 0;
    (function wait() {
      if (document.getElementById("protect-overlay")) { waited = 0; setTimeout(wait, 700); return; }
      if (waited < 1800) { waited += 300; setTimeout(wait, 300); return; }
      if (isOn()) enter(true);
    })();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
