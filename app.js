/* ---------------------------------------------------------
   app.js
   Steuert die Ordner-Navigation. Die Struktur (welche Ordner
   und Unterordner es gibt) steht hier fest; die Beiträge selbst
   kommen aus posts-data.js.

   "Neueste" ist kein echter Ordner mit eigenen Beiträgen,
   sondern wird bei jedem Seitenaufruf neu berechnet: alle
   Beiträge, deren Datum nicht älter als 30 Tage ist, über alle
   Kategorien hinweg, neueste zuerst.
--------------------------------------------------------- */

/* Kleines, wiederverwendetes Set an Glyphen: der Ball (Kreis + Nahtlinien)
   dient sowohl als große Kachel-Reserve als auch als Mini-Symbol, der
   Controller ebenso mit/ohne Schraubenschlüssel-Zusatz. */
const BALL_GLYPH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8"/><path d="M12 4c2.2 2.6 2.2 12.8 0 16M6.3 7c3 1.4 8.4 1.4 11.4 0M6.3 17c3-1.4 8.4-1.4 11.4 0" stroke-linecap="round"/></svg>';
const CONTROLLER_GLYPH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10.5v3M5.5 12h3M15.3 10.8h.01M17.3 12.8h.01M15.8 14.8h.01M17.8 10.8h.01"/><path d="M7.5 7.5h9A4 4 0 0 1 20.4 12l-.6 3.7a2.3 2.3 0 0 1-4.1 1L15 15.7H9l-.7 1a2.3 2.3 0 0 1-4.1-1L3.6 12A4 4 0 0 1 7.5 7.5z"/></svg>';
const WRENCH_GLYPH = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.6 8.7a4.6 4.6 0 0 1-6 5.1l-6.6 6.6-2.4-2.4 6.6-6.6a4.6 4.6 0 0 1 5.1-6l-3 3 2.3 2.3 3-3z"/></svg>';
const STAR_GLYPH = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.97 6.19 6.83.82-5.03 4.66 1.36 6.76L12 17.77l-6.13 3.16 1.36-6.76-5.03-4.66 6.83-.82z"/></svg>';
const BOOK_GLYPH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.2c-1.7-1.3-3.9-2-6.3-2-.9 0-1.8.1-2.7.3v12.6c.9-.2 1.8-.3 2.7-.3 2.4 0 4.6.7 6.3 2m0-12.6c1.7-1.3 3.9-2 6.3-2 .9 0 1.8.1 2.7.3v12.6c-.9-.2-1.8-.3-2.7-.3-2.4 0-4.6.7-6.3 2m0-12.6v12.6"/></svg>';

/* Große Kachel-Icons (Startseite, Ordner-Übersicht) — anschaulich statt
   abstrakt: Stern, aufgeschlagenes Buch, das echte HSG-Wettenberg-Logo
   und Controller+Schraubenschlüssel für Gaming & Werkstatt. */
const ICONS = {
  neueste: STAR_GLYPH,
  schule: BOOK_GLYPH,
  handball: '<img src="strafenkasse/hsg-logo.png" alt="HSG Wettenberg" class="folder-icon-img">',
  freizeit: `<span class="icon-duo">${CONTROLLER_GLYPH}<span class="icon-duo-badge">${WRENCH_GLYPH}</span></span>`
};

/* Kleine Symbole neben jedem einzelnen Beitrag in den Listen — vereinfachte
   Varianten, die auch im Miniaturformat klar erkennbar bleiben. */
const MINI_ICONS = {
  neueste: STAR_GLYPH,
  schule: BOOK_GLYPH,
  handball: BALL_GLYPH,
  freizeit: CONTROLLER_GLYPH
};

const folderStructure = {
  schule: {
    label: "Schule",
    color: "var(--c-schule)",
    icon: ICONS.schule,
    subfolders: [
      { id: "mathematik", label: "Mathematik" },
      { id: "arbeitslehre", label: "Arbeitslehre" },
      { id: "sonstiges", label: "Sonstiges" }
    ]
  },
  handball: {
    label: "Handball",
    color: "var(--c-handball)",
    icon: ICONS.handball,
    subfolders: [
      { id: "jugend", label: "Jugend" },
      { id: "maenner1", label: "Männer 1" },
      { id: "maenner2", label: "Männer 2" },
      { id: "hallendienst", label: "Hallendienst" },
      { id: "training", label: "Training" }
    ]
  },
  freizeit: {
    label: "Freizeit",
    color: "var(--c-freizeit)",
    icon: ICONS.freizeit,
    subfolders: []
  }
};

const content = document.getElementById("content");
const breadcrumb = document.getElementById("breadcrumb");

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  return raw.length ? raw.split("/") : [];
}

function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
}

function isWithinLast30Days(iso) {
  const postDate = new Date(iso + "T00:00:00");
  const now = new Date();
  const diffDays = (now - postDate) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 30;
}

const EXTERNAL_LINK_GLYPH = '<svg class="post-external-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>';

function renderPostList(list) {
  if (!list.length) {
    return '<p class="empty-state">Hier gibt es noch keine Beiträge.</p>';
  }
  const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
  return (
    '<ul class="post-list">' +
    sorted
      .map((p) => {
        const isExternal = /^https?:\/\//i.test(p.url);
        const linkAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
        const externalBadge = isExternal ? EXTERNAL_LINK_GLYPH : "";
        return `
      <li>
        <a class="post-card" href="${p.url}"${linkAttrs}>
          <span class="post-tag"><span class="icon-badge icon-badge--${p.category}">${MINI_ICONS[p.category] || ""}</span>${folderStructure[p.category] ? folderStructure[p.category].label : p.category}</span>
          <h3>${p.title}${externalBadge}</h3>
          <p class="post-excerpt">${p.excerpt}</p>
          <span class="post-meta">${formatDate(p.date)}</span>
        </a>
      </li>`;
      })
      .join("") +
    "</ul>"
  );
}

function renderTopLevel() {
  if (window.Protect) window.Protect.removeShareButton();
  document.documentElement.classList.remove("share-mode");
  breadcrumb.innerHTML = "";
  const cards = [
    { id: "neueste", href: "#/neueste", label: "Neueste", icon: ICONS.neueste, count: posts.filter((p) => isWithinLast30Days(p.date)).length },
    ...Object.entries(folderStructure).map(([id, f]) => ({
      id,
      href: `#/${id}`,
      label: f.label,
      icon: f.icon,
      count: posts.filter((p) => p.category === id).length
    }))
  ];

  content.innerHTML = `
    <div class="folder-grid">
      ${cards
        .map(
          (c) => `
        <a class="folder-card" href="${c.href}">
          <span class="folder-icon icon-${c.id}">${c.icon}</span>
          <h2>${c.label}</h2>
          <span class="folder-count">${c.count === 1 ? "1 Beitrag" : c.count + " Beiträge"}</span>
        </a>`
        )
        .join("")}
    </div>
  `;
}

function renderNeueste() {
  if (window.Protect) window.Protect.removeShareButton();
  document.documentElement.classList.remove("share-mode");
  breadcrumb.innerHTML = `<a href="#/">Start</a><span class="sep">›</span><span class="current">Neueste</span>`;
  const recent = posts.filter((p) => isWithinLast30Days(p.date));
  content.innerHTML = `
    <h1 class="section-label">Neueste Beiträge</h1>
    <p style="color:var(--ink-soft); margin-top:-10px; margin-bottom: 28px;">Alle Beiträge der letzten 30 Tage, automatisch sortiert — unabhängig vom Ordner.</p>
    ${renderPostList(recent)}
  `;
}

function renderFolder(id) {
  const folder = folderStructure[id];
  if (!folder) {
    renderTopLevel();
    return;
  }
  if (window.Protect) {
    window.Protect.removeShareButton();
    window.Protect.guard(id, () => renderFolderUnlocked(id));
  } else {
    renderFolderUnlocked(id);
  }
}

function renderFolderUnlocked(id) {
  const folder = folderStructure[id];
  breadcrumb.innerHTML = `<a href="#/">Start</a><span class="sep">›</span><span class="current">${folder.label}</span>`;

  if (!folder.subfolders.length) {
    const list = posts.filter((p) => p.category === id);
    content.innerHTML = `
      <h1 class="section-label">${folder.label}</h1>
      ${renderPostList(list)}
    `;
  } else {
    const subCards = folder.subfolders.map((sf) => ({
      href: `#/${id}/${sf.id}`,
      label: sf.label,
      count: posts.filter((p) => p.category === id && p.subcategory === sf.id).length
    }));

    content.innerHTML = `
      <h1 class="section-label">${folder.label}</h1>
      <div class="folder-grid">
        ${subCards
          .map(
            (c) => `
          <a class="folder-card" href="${c.href}">
            <span class="folder-icon" style="--tile-accent:${folder.color}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/></svg>
            </span>
            <h2>${c.label}</h2>
            <span class="folder-count">${c.count} Beitrag${c.count === 1 ? "" : "e"}</span>
          </a>`
          )
          .join("")}
      </div>
    `;
  }
  if (window.Protect) window.Protect.addShareButton(id);
}

function renderSubfolder(id, subId) {
  const folder = folderStructure[id];
  if (!folder) {
    renderTopLevel();
    return;
  }
  if (window.Protect) {
    window.Protect.removeShareButton();
    window.Protect.guard(id, () => renderSubfolderUnlocked(id, subId));
  } else {
    renderSubfolderUnlocked(id, subId);
  }
}

function renderSubfolderUnlocked(id, subId) {
  const folder = folderStructure[id];
  const sub = folder.subfolders.find((s) => s.id === subId);
  const label = sub ? sub.label : subId;
  breadcrumb.innerHTML = `<a href="#/">Start</a><span class="sep">›</span><a href="#/${id}">${folder.label}</a><span class="sep">›</span><span class="current">${label}</span>`;

  const list = posts.filter((p) => p.category === id && p.subcategory === subId);
  content.innerHTML = `
    <h1 class="section-label">${folder.label} — ${label}</h1>
    ${renderPostList(list)}
  `;
  if (window.Protect) window.Protect.addShareButton(id);
}

/* Bei einer aktiven "Für Lernende freigeben"-Freigabe merken wir uns den
   Hash, mit dem die Seite geöffnet wurde — das ist die einzige Route, die
   während der Freigabe erreichbar sein soll. Start, "Neueste" und andere
   Kategorien werden dann kommentarlos (ohne Passwortabfrage) dorthin
   zurückgeleitet, statt angezeigt zu werden. */
let shareHomeHash = null;
let shareHomeCaptured = false;

function ensureShareHomeHash() {
  if (shareHomeCaptured) return;
  shareHomeCaptured = true;
  if (window.Protect && window.Protect.isShareMode()) {
    shareHomeHash = location.hash || "#/";
  }
}

function isAllowedRoute(segments) {
  if (!(window.Protect && window.Protect.isShareMode())) return true;
  if (segments.length === 0) return false;
  if (segments[0] === "neueste") return false;
  return window.Protect.isRouteAllowed(segments[0]);
}

function render() {
  ensureShareHomeHash();
  const segments = parseHash();
  if (!isAllowedRoute(segments)) {
    location.hash = shareHomeHash || "#/";
    return;
  }
  if (segments.length === 0) {
    renderTopLevel();
  } else if (segments[0] === "neueste") {
    renderNeueste();
  } else if (segments.length === 1) {
    renderFolder(segments[0]);
  } else {
    renderSubfolder(segments[0], segments[1]);
  }
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);

/* Liquid-Glass-Glanzlicht: folgt der Maus-/Fingerposition auf Karten,
   per Event-Delegation, damit es auch nach jedem Neu-Rendern (Routing)
   ohne erneutes Binden funktioniert. */
function updateGlassHighlight(x, y, target) {
  const el = target.closest(".folder-card, .post-card");
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", ((x - r.left) / r.width) * 100 + "%");
  el.style.setProperty("--my", ((y - r.top) / r.height) * 100 + "%");
}

document.addEventListener("pointermove", (e) => updateGlassHighlight(e.clientX, e.clientY, e.target));
document.addEventListener(
  "touchstart",
  (e) => {
    const t = e.touches[0];
    if (t) updateGlassHighlight(t.clientX, t.clientY, e.target);
  },
  { passive: true }
);
