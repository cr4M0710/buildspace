/* ---------------------------------------------------------
   richtext.js
   -----------------------------------------------------------
   Sehr einfacher, abhängigkeitsfreier Rich-Text-Editor (Fett/Kursiv/
   Unterstrichen/Überschrift/Listen/Link) für ausführlichere, formatierte
   Aufgabenbeschreibungen in "Kurse & Projekte" -- ähnlich den einfachen
   Text-Editoren, wie man sie z. B. von fobizz-Aufgaben kennt, bewusst aber
   ohne externe Bibliothek (Bildersuche/Uploads o.ä. gehören NICHT dazu,
   dafür gibt es die separate Datei-Upload-Funktion je Aufgabe).

   Genutzt sowohl in kurse-projekte.html (Lehrkraft: Editor zum Schreiben)
   als auch in lernbereich.html (Lernende: nur RichText.sanitize(), um
   gespeichertes HTML sicher anzuzeigen -- doppelte Absicherung, auch wenn
   nur die Lehrkraft schreibend auf Projekte zugreifen darf).

   SICHERHEIT: RichText.sanitize() lässt nur eine kleine, feste Liste von
   harmlosen Tags/Attributen zu (u.a. kein <script>, keine on*-Attribute,
   keine javascript:-Links) und wird sowohl beim Speichern (Lehrkraft-Seite)
   als auch nochmal beim Anzeigen (Lernbereich) angewendet. */
(function (global) {
  "use strict";

  const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "UL", "OL", "LI", "BR", "P", "H3", "H4", "A", "DIV", "SPAN"]);
  const ALLOWED_ATTRS = { A: ["href", "target", "rel"] };

  function sanitizeNode(root) {
    Array.from(root.childNodes).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        if (!ALLOWED_TAGS.has(child.tagName)) {
          if (child.tagName === "SCRIPT" || child.tagName === "STYLE") {
            child.remove();
            return;
          }
          // Unbekanntes/nicht erlaubtes Element: Kindknoten behalten (Text
          // nicht verlieren), nur die Hülle entfernen.
          while (child.firstChild) child.parentNode.insertBefore(child.firstChild, child);
          child.remove();
          return;
        }
        const allowedAttrs = ALLOWED_ATTRS[child.tagName] || [];
        Array.from(child.attributes).forEach((attr) => {
          if (allowedAttrs.indexOf(attr.name.toLowerCase()) === -1) child.removeAttribute(attr.name);
        });
        if (child.tagName === "A") {
          const href = child.getAttribute("href") || "";
          if (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href)) {
            child.removeAttribute("href");
          } else {
            child.setAttribute("target", "_blank");
            child.setAttribute("rel", "noopener noreferrer");
          }
        }
        sanitizeNode(child);
      } else if (child.nodeType !== Node.TEXT_NODE) {
        child.remove();
      }
    });
  }

  function sanitize(html) {
    const tpl = document.createElement("template");
    tpl.innerHTML = String(html || "");
    sanitizeNode(tpl.content);
    return tpl.innerHTML;
  }

  /* Baut Werkzeugleiste + editierbaren Bereich in "container" auf und gibt
     { getHtml(), setHtml(html), focus() } zurück. */
  function mount(container, opts) {
    opts = opts || {};
    container.innerHTML = "";
    container.classList.add("richtext-wrap");

    const toolbar = document.createElement("div");
    toolbar.className = "richtext-toolbar";

    const editable = document.createElement("div");
    editable.className = "richtext-editable";
    editable.contentEditable = "true";
    if (opts.placeholder) editable.setAttribute("data-placeholder", opts.placeholder);
    editable.innerHTML = sanitize(opts.initialHtml || "");

    const buttons = [
      { cmd: "bold", label: "B", title: "Fett", style: "font-weight:800" },
      { cmd: "italic", label: "I", title: "Kursiv", style: "font-style:italic" },
      { cmd: "underline", label: "U", title: "Unterstrichen", style: "text-decoration:underline" },
      { cmd: "heading", label: "H", title: "Überschrift" },
      { cmd: "insertUnorderedList", label: "• Liste", title: "Aufzählung" },
      { cmd: "insertOrderedList", label: "1. Liste", title: "Nummerierte Liste" },
      { cmd: "link", label: "🔗 Link", title: "Link einfügen" },
      { cmd: "removeFormat", label: "✕ Format", title: "Formatierung entfernen" }
    ];
    buttons.forEach((b) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "richtext-btn";
      btn.textContent = b.label;
      btn.title = b.title;
      if (b.style) btn.style.cssText = b.style;
      // mousedown statt click + preventDefault, damit die Textauswahl im
      // editierbaren Bereich beim Klick auf die Werkzeugleiste erhalten
      // bleibt (sonst geht der Fokus vorher verloren und execCommand wirkt
      // nicht mehr auf die vorher markierte Stelle).
      btn.addEventListener("mousedown", (e) => e.preventDefault());
      btn.addEventListener("click", () => {
        editable.focus();
        if (b.cmd === "link") {
          const url = (prompt("Link-Adresse (https://...)") || "").trim();
          if (!url) return;
          if (!/^https?:\/\//i.test(url)) { alert("Bitte eine vollständige Adresse mit https:// eingeben."); return; }
          document.execCommand("createLink", false, url);
        } else if (b.cmd === "heading") {
          const current = document.queryCommandValue("formatBlock");
          document.execCommand("formatBlock", false, /^h3$/i.test(current) ? "P" : "H3");
        } else {
          document.execCommand(b.cmd, false, null);
        }
      });
      toolbar.appendChild(btn);
    });

    container.appendChild(toolbar);
    container.appendChild(editable);

    return {
      getHtml: () => sanitize(editable.innerHTML),
      setHtml: (html) => { editable.innerHTML = sanitize(html || ""); },
      focus: () => editable.focus()
    };
  }

  global.RichText = { sanitize: sanitize, mount: mount };
})(window);
