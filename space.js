/* ---------------------------------------------------------
   space.js
   Hintergrund der Startseite: ein Planet am Horizont bei Nacht
   (assets/bg-nacht.jpg) mit leuchtendem Rand und spiegelnder
   Fläche. Das Bild liegt fest hinter allen Inhalten; ein dunkler
   Verlauf sorgt dafür, dass Text auf den Glas-Flächen gut lesbar
   bleibt. Die Sternschnuppen (stars.js) fliegen darüber in der
   oberen Bildschirmhälfte.
--------------------------------------------------------- */
(function () {
  "use strict";
  var bg = document.createElement("div");
  bg.id = "bg-space";
  bg.setAttribute("aria-hidden", "true");
  document.body.insertBefore(bg, document.body.firstChild);
})();
