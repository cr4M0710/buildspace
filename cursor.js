/* ---------------------------------------------------------
   cursor.js
   Liquid-Glass-Mauszeiger: die ganz normalen Zeiger (Pfeil, Hand,
   Textcursor), nur im Glas-Look – milchig-durchscheinende Füllung,
   heller Rand, feiner dunkler Umriss für Kontrast und weicher
   Schatten. Es sind echte System-Cursor (SVG), daher ohne Verzögerung
   und überall einsetzbar. Nur auf Geräten mit präzisem Zeiger
   (Maus/Trackpad).
--------------------------------------------------------- */
(function () {
  "use strict";
  var isFine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  if (!isFine) return;

  var DEFS =
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#ffffff" stop-opacity="0.96"/><stop offset="0.55" stop-color="#e3e6f0" stop-opacity="0.72"/><stop offset="1" stop-color="#b9bfd2" stop-opacity="0.58"/></linearGradient>' +
    '<filter id="s" x="-30%" y="-30%" width="170%" height="170%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.3" flood-color="#000" flood-opacity="0.42"/></filter></defs>';

  function svg(w, h, inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '">' + DEFS + inner + "</svg>";
  }
  function glass(d) {
    return '<g filter="url(#s)" stroke-linejoin="round" stroke-linecap="round">' +
      '<path d="' + d + '" fill="none" stroke="#0b0c10" stroke-opacity="0.62" stroke-width="3.2"/>' +
      '<path d="' + d + '" fill="url(#g)" stroke="#ffffff" stroke-opacity="0.95" stroke-width="1.3"/></g>';
  }
  /* Pfeil (Standard-Zeiger) */
  var ARROW_D = "M5 3.2 L5 21.2 L9.4 17.1 L12.5 24.2 L15.6 22.8 L12.5 15.9 L18.6 15.6 Z";
  var arrow = svg(32, 32, glass(ARROW_D) + '<path d="M6.9 6.8 L6.9 15.6" stroke="#fff" stroke-opacity="0.9" stroke-width="1" stroke-linecap="round" fill="none"/>');
  /* Hand (Link/Button) */
  var HAND_D = "M9.2 4.6 C9.2 3.5 10 2.8 10.9 2.8 C11.8 2.8 12.6 3.5 12.6 4.6 L12.6 10.4 C12.9 10 13.4 9.8 13.9 9.8 C14.8 9.8 15.4 10.4 15.5 11.2 C15.8 10.8 16.3 10.6 16.8 10.6 C17.7 10.6 18.3 11.2 18.4 12 C18.7 11.7 19.1 11.5 19.6 11.5 C20.6 11.5 21.3 12.3 21.3 13.3 L21.3 18.4 C21.3 21.8 19 24.4 15.7 24.4 L14.1 24.4 C12.3 24.4 11.2 23.7 10.1 22.4 L5.9 17.3 C5.3 16.5 5.4 15.5 6.1 14.9 C6.8 14.3 7.8 14.4 8.4 15.1 L9.2 16 Z";
  var hand = svg(32, 32, glass(HAND_D) + '<path d="M10.9 5 L10.9 9.5" stroke="#fff" stroke-opacity="0.9" stroke-width="1" stroke-linecap="round" fill="none"/>');
  /* Textcursor (I-Balken) */
  var IBAR_D = "M7 4 L13 4 M10 4 L10 22 M7 22 L13 22";
  var ibar = svg(20, 30, '<g filter="url(#s)" stroke-linecap="round" fill="none"><path d="' + IBAR_D + '" stroke="#0b0c10" stroke-opacity="0.62" stroke-width="4.2"/><path d="' + IBAR_D + '" stroke="#ffffff" stroke-opacity="0.95" stroke-width="2"/></g>');

  function url(s, x, y, fallback) {
    return 'url("data:image/svg+xml,' + encodeURIComponent(s) + '") ' + x + " " + y + ", " + fallback;
  }

  function init() {
    var style = document.createElement("style");
    style.id = "lg-cursor-style";
    style.textContent = [
      "html, body, * { cursor: " + url(arrow, 5, 3, "default") + " !important; }",
      "a, a *, button, button *, [role=button], [role=button] *, summary, select, label, .chip, .btn, .folder-card, .post-card, .post-card *, .folder-card *,",
      "input[type=checkbox], input[type=radio], input[type=range], input[type=submit], input[type=button], input[type=file] { cursor: " + url(hand, 11, 3, "pointer") + " !important; }",
      "input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=submit]):not([type=button]):not([type=file]):not([type=color]), textarea, [contenteditable=true], [contenteditable=\"\"] { cursor: " + url(ibar, 10, 13, "text") + " !important; }",
      "button:disabled, button:disabled *, [disabled] { cursor: " + url(arrow, 5, 3, "default") + " !important; }"
    ].join("\n");
    document.head.appendChild(style);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
