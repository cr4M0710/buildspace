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
/* Ungefüllte Variante desselben Sterns fürs Favoriten-Symbol auf jeder
   Karte — gefüllt = gemerkt, umrandet = (noch) nicht gemerkt. */
const STAR_OUTLINE_GLYPH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 2.5l2.97 6.19 6.83.82-5.03 4.66 1.36 6.76L12 17.77l-6.13 3.16 1.36-6.76-5.03-4.66 6.83-.82z"/></svg>';
const BOOK_GLYPH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.2c-1.7-1.3-3.9-2-6.3-2-.9 0-1.8.1-2.7.3v12.6c.9-.2 1.8-.3 2.7-.3 2.4 0 4.6.7 6.3 2m0-12.6c1.7-1.3 3.9-2 6.3-2 .9 0 1.8.1 2.7.3v12.6c-.9-.2-1.8-.3-2.7-.3-2.4 0-4.6.7-6.3 2m0-12.6v12.6"/></svg>';
/* Schloss-Symbol für ausgegraute Ordner-Kacheln, die im Gast-Zugriff
   nicht nutzbar sind (siehe renderTopLevel). */
const LOCK_GLYPH = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5"/><path d="M8 10.5V7.2a4 4 0 0 1 8 0v3.3"/></svg>';

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
    color: "var(--c-schule)",
    icon: ICONS.schule,
    subfolders: [
      { id: "mathematik" },
      { id: "arbeitslehre" },
      { id: "faecheruebergreifend" },
      { id: "weiterefaecher" },
      { id: "sonstiges" }
    ]
  },
  handball: {
    color: "var(--c-handball)",
    icon: ICONS.handball,
    subfolders: [
      { id: "jugend" },
      { id: "maenner1" },
      { id: "maenner2" },
      { id: "hallendienst" },
      { id: "training" }
    ]
  },
  freizeit: {
    color: "var(--c-freizeit)",
    icon: ICONS.freizeit,
    subfolders: []
  }
};

/* ---------------------------------------------------------
   Zweisprachigkeit (DE/EN) — der Sprachumschalter oben rechts.
   Übersetzt wird die Navigations-/Oberflächen-Sprache der Startseite
   sowie Titel/Beschreibung jedes Beitrags (siehe titleEn/excerptEn in
   posts-data.js, mit deutschem Text als Fallback, falls eine
   Übersetzung fehlt). Die einzelnen Spiel-/Tool-Seiten selbst bleiben
   bewusst deutsch — das wäre eine eigene, deutlich größere Aufgabe.
--------------------------------------------------------- */
const LANG_KEY = "myhome_lang";

const I18N = {
  de: {
    heroSlogan: "Wo Innovation das Lernen verändert und Spiel zum individuellen Erfolg wird.",
    greeting: { night: "Noch spät unterwegs", morning: "Guten Morgen", noon: "Schönen Mittag", day: "Guten Tag", evening: "Guten Abend" },
    statPost: (n) => (n === 1 ? "Beitrag" : "Beiträge"),
    statAreas: "Bereiche",
    statNew: "diesen Monat neu",
    searchPlaceholder: "Spiele & Tools durchsuchen…",
    searchLabel: "Beiträge durchsuchen",
    categoriesTitle: "Kategorien",
    newBadge: "Neu",
    home: "Start",
    emptyState: "Hier gibt es noch keine Beiträge.",
    searchResults: (n, raw) => `${n} Treffer für „${raw}“`,
    searchEmpty: (raw) => `Keine Treffer für „${raw}“. Versuch es mit einem anderen Suchbegriff.`,
    latestTitle: "Neueste Beiträge",
    latestSub: "Alle Beiträge der letzten 30 Tage, automatisch sortiert — unabhängig vom Ordner.",
    footer: "buildspace — gebaut mit HTML, CSS & JavaScript, gehostet auf GitHub Pages.",
    postCount: (n) => (n === 1 ? "1 Beitrag" : `${n} Beiträge`),
    menuOpen: "Menü öffnen",
    menuClose: "Menü schließen",
    searchOpen: "Suche öffnen",
    searchClear: "Suche leeren",
    navLabel: "Bereiche",
    navAdmin: "Verwaltung",
    kollegenLabel: "Kolleg:innen-Bereich",
    kursmappeLabel: "Kursmappe erstellen",
    expandLabel: "Unterordner ein- oder ausklappen",
    setTheme: "Darstellung",
    themeLight: "Hell",
    themeDark: "Nacht",
    setLang: "Sprache",
    dateLocale: "de-DE",
    favoritesTitle: "Favoriten",
    favAdd: "Zu Favoriten hinzufügen",
    favRemove: "Von Favoriten entfernen",
    guestLocked: "Nur mit Zugangscode",
    folders: { neueste: "Neueste", schule: "Schule", handball: "Handball", freizeit: "Freizeit" },
    subfolders: {
      mathematik: "Mathematik", arbeitslehre: "Arbeitslehre",
      faecheruebergreifend: "Classroom Management", weiterefaecher: "Weitere Fächer",
      sonstiges: "Sonstiges", unterrichtsmaterialien: "Unterrichtsmaterialien",
      jugend: "Jugend", maenner1: "Männer 1", maenner2: "Männer 2",
      hallendienst: "Hallendienst", training: "Training"
    }
  },
  en: {
    heroSlogan: "Where innovation transforms learning and play becomes individual success.",
    greeting: { night: "Up late", morning: "Good morning", noon: "Good midday", day: "Good afternoon", evening: "Good evening" },
    statPost: (n) => (n === 1 ? "post" : "posts"),
    statAreas: "areas",
    statNew: "new this month",
    searchPlaceholder: "Search games & tools…",
    searchLabel: "Search posts",
    categoriesTitle: "Categories",
    newBadge: "New",
    home: "Home",
    emptyState: "There are no posts here yet.",
    searchResults: (n, raw) => `${n} result${n === 1 ? "" : "s"} for “${raw}”`,
    searchEmpty: (raw) => `No results for “${raw}”. Try a different search term.`,
    latestTitle: "Latest posts",
    latestSub: "All posts from the last 30 days, sorted automatically — across every folder.",
    footer: "buildspace — built with HTML, CSS & JavaScript, hosted on GitHub Pages.",
    postCount: (n) => (n === 1 ? "1 post" : `${n} posts`),
    menuOpen: "Open menu",
    menuClose: "Close menu",
    searchOpen: "Open search",
    searchClear: "Clear search",
    navLabel: "Areas",
    navAdmin: "Administration",
    kollegenLabel: "Colleagues area",
    kursmappeLabel: "Create course folder",
    expandLabel: "Expand or collapse subfolders",
    setTheme: "Appearance",
    themeLight: "Light",
    themeDark: "Night",
    setLang: "Language",
    dateLocale: "en-GB",
    favoritesTitle: "Favourites",
    favAdd: "Add to favourites",
    favRemove: "Remove from favourites",
    guestLocked: "Access code required",
    folders: { neueste: "Latest", schule: "School", handball: "Handball", freizeit: "Leisure" },
    subfolders: {
      mathematik: "Mathematics", arbeitslehre: "Vocational Studies",
      faecheruebergreifend: "Classroom Management", weiterefaecher: "Other subjects",
      sonstiges: "Miscellaneous", unterrichtsmaterialien: "Teaching materials",
      jugend: "Youth", maenner1: "Men's 1", maenner2: "Men's 2",
      hallendienst: "Hall Duty", training: "Training"
    }
  }
};

function getLang() {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    return stored === "en" ? "en" : "de";
  } catch (e) {
    return "de";
  }
}

function setLang(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch (e) {}
}

function t(key) {
  const val = I18N[getLang()][key];
  return val;
}

function folderLabel(id) {
  return I18N[getLang()].folders[id] || id;
}

function subfolderLabel(id) {
  return I18N[getLang()].subfolders[id] || id;
}

/* Beitrag in der aktuell gewählten Sprache — fällt auf den deutschen
   Text zurück, solange (oder falls) keine Übersetzung hinterlegt ist. */
function localizePost(p) {
  if (getLang() === "en" && (p.titleEn || p.excerptEn)) {
    return { ...p, title: p.titleEn || p.title, excerpt: p.excerptEn || p.excerpt };
  }
  return p;
}

/* Marker für protect.js: hier läuft die Startseite (nicht ein einzelnes Tool). */
window.BUILDSPACE_HOME = true;

const content = document.getElementById("content");
const breadcrumb = document.getElementById("breadcrumb");

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  return raw.length ? raw.split("/") : [];
}

function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(t("dateLocale"), { day: "numeric", month: "long", year: "numeric" });
}

function isWithinLast30Days(iso) {
  const postDate = new Date(iso + "T00:00:00");
  const now = new Date();
  const diffDays = (now - postDate) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 30;
}

/* "NEU" bekommt automatisch, was auf das jeweils aktuellste Datum im
   gesamten Bestand fällt — kein fester Tage-Schwellwert, der irgendwann
   entweder nichts mehr markiert oder (bei einem frischen Stapel wie
   diesem hier) fast alles. Dadurch bleibt der Hinweis immer knapp und
   zeigt genau das, was zuletzt hinzugekommen ist. */
function latestPostDate(list) {
  return list.reduce((max, p) => (p.date > max ? p.date : max), "0000-00-00");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const EXTERNAL_LINK_GLYPH = '<svg class="post-external-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>';

/* Escaped Text + optional Hervorhebung des Suchbegriffs (Treffer werden in
   <mark> gepackt, nachdem der Text bereits escaped wurde — verhindert, dass
   die Nutzereingabe selbst als HTML interpretiert wird). */
function highlightMatch(text, rawQuery) {
  const escaped = escapeHtml(text);
  if (!rawQuery) return escaped;
  const escapedQuery = escapeHtml(rawQuery).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escapedQuery) return escaped;
  const re = new RegExp(escapedQuery, "ig");
  return escaped.replace(re, (m) => `<mark>${m}</mark>`);
}

function renderPostList(list, opts) {
  opts = opts || {};
  const hl = opts.headingLevel === 2 ? 2 : 3;
  if (!list.length) {
    return `<p class="empty-state">${t("emptyState")}</p>`;
  }
  // Beim Verlauf ("Zuletzt geöffnet") ist die Reihenfolge bereits die
  // gewünschte (neuestes zuerst) — dort NICHT nach Datum neu sortieren.
  const sorted = opts.preserveOrder ? list : [...list].sort((a, b) => b.date.localeCompare(a.date));
  const newestDate = latestPostDate(posts);
  return (
    '<ul class="post-list">' +
    sorted
      .map((p0, i) => {
        const p = localizePost(p0);
        const isExternal = /^https?:\/\//i.test(p.url);
        const linkAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
        const externalBadge = isExternal ? EXTERNAL_LINK_GLYPH : "";
        // Läuft gerade eine Freigabe (Kategorie, Kursmappe oder
        // Vertretungsstunde), muss deren Kennung an jeden internen Link
        // weitergereicht werden — sonst verlangt die nächste Seite erneut
        // eine Anmeldung, weil die Freigabe nur für DIESEN Seitenaufruf galt.
        const shareQS = !isExternal && window.Protect && typeof window.Protect.shareQueryString === "function"
          ? window.Protect.shareQueryString()
          : "";
        const href = p.url + shareQS;
        const isNew = p0.date === newestDate;
        const title = opts.highlight ? highlightMatch(p.title, opts.highlight) : escapeHtml(p.title);
        const excerpt = opts.highlight ? highlightMatch(p.excerpt, opts.highlight) : escapeHtml(p.excerpt);
        const fav = isFavorite(p0.url);
        const favLabel = fav ? t("favRemove") : t("favAdd");
        return `
      <li class="post-list-item" style="--i:${i}">
        <div class="post-card${opts.featured ? " post-card--featured" : ""}">
          <a class="post-card-link" href="${href}"${linkAttrs} aria-label="${escapeHtml(p.title)}"></a>
          <button type="button" class="post-fav-btn${fav ? " is-active" : ""}" data-url="${escapeHtml(p0.url)}" aria-pressed="${fav}" aria-label="${escapeHtml(favLabel)}" title="${escapeHtml(favLabel)}">${fav ? STAR_GLYPH : STAR_OUTLINE_GLYPH}</button>
          <div class="post-card-body">
            <span class="post-tag"><span class="icon-badge icon-badge--${p.category}">${MINI_ICONS[p.category] || ""}</span>${folderStructure[p.category] ? folderLabel(p.category) : p.category}${isNew ? `<span class="badge-new">${t("newBadge")}</span>` : ""}</span>
            <h${hl}>${title}${externalBadge}</h${hl}>
            <p class="post-excerpt">${excerpt}</p>
            <span class="post-meta">${formatDate(p.date)}</span>
          </div>
        </div>
      </li>`;
      })
      .join("") +
    "</ul>"
  );
}

/* ---------------------------------------------------------
   Favoriten — im Unterschied zu "Zuletzt geöffnet" eine bewusste,
   dauerhafte Auswahl per Stern-Symbol auf jeder Karte, unabhängig
   vom Verlauf. Ebenfalls rein lokal im Browser gespeichert.
--------------------------------------------------------- */
const FAVORITES_KEY = "buildspace_favorites_v1";

function getFavoriteUrls() {
  try {
    const raw = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function isFavorite(url) {
  return getFavoriteUrls().includes(url);
}

function toggleFavorite(url) {
  if (!url) return;
  try {
    const current = getFavoriteUrls();
    const idx = current.indexOf(url);
    if (idx === -1) current.unshift(url);
    else current.splice(idx, 1);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(current));
  } catch (e) {
    /* Favoriten sind ein Komfortfeature, kein Muss — ein blockierter
       localStorage (z. B. privates Fenster) darf nicht die Seite stören. */
  }
}

function getFavoritePosts() {
  return getFavoriteUrls()
    .map((url) => posts.find((p) => p.url === url))
    .filter(Boolean);
}

/* Gast-Zugriff: nur Beiträge aus erlaubten Bereichen anzeigen. */
function isPostAllowed(p) {
  return window.Protect ? window.Protect.isCategoryAllowed(p.gate || p.category) : true;
}

function renderTopLevel() {
  if (window.Protect) window.Protect.removeShareButton();
  document.documentElement.classList.remove("share-mode");
  breadcrumb.innerHTML = "";
  const cards = [
    { id: "neueste", href: "#/neueste", icon: ICONS.neueste, count: posts.filter((p) => isWithinLast30Days(p.date)).length },
    ...Object.entries(folderStructure).map(([id, f]) => ({
      id,
      href: `#/${id}`,
      icon: f.icon,
      count: posts.filter((p) => p.category === id).length
    }))
  ].map((c) => ({
    ...c,
    // Im Gast-Zugriff ist ausschließlich Schule nutzbar — "Neueste" mischt
    // Beiträge aller Bereiche und zählt hier bewusst mit dazu.
    locked: window.Protect ? !window.Protect.isCategoryAllowed(c.id) : false
  }));

  // Im Gast-Zugriff dürfen Favoriten aus gesperrten Bereichen (z. B. von
  // einer früheren Anmeldung mit vollem Zugriff) nicht auf der Startseite
  // auftauchen.
  const favoritePosts = getFavoritePosts().filter(isPostAllowed);

  content.innerHTML = `
    ${
      favoritePosts.length
        ? `<h2 class="section-label section-label--favorites">${t("favoritesTitle")}</h2>${renderPostList(favoritePosts, { preserveOrder: true })}`
        : ""
    }
    <h2 class="section-label">${t("categoriesTitle")}</h2>
    <div class="folder-grid">
      ${cards
        .map((c, i) =>
          c.locked
            ? `
        <a class="folder-card is-disabled" href="${c.href}" style="--i:${i}" title="${escapeHtml(t("guestLocked"))}">
          <span class="folder-icon icon-${c.id}">${c.icon}</span>
          <h2>${folderLabel(c.id)}</h2>
          <span class="folder-count folder-count--locked">${LOCK_GLYPH} ${escapeHtml(t("guestLocked"))}</span>
        </a>`
            : `
        <a class="folder-card" href="${c.href}" style="--i:${i}">
          <span class="folder-icon icon-${c.id}">${c.icon}</span>
          <h2>${folderLabel(c.id)}</h2>
          <span class="folder-count">${t("postCount")(c.count)}</span>
        </a>`
        )
        .join("")}
    </div>
  `;
}

function renderNeueste() {
  // "Neueste" mischt Beiträge aller Bereiche — im Gast-Zugriff (nur
  // Schule) daher genauso hinter dem Zugriffs-Check wie ein echter Ordner,
  // sonst ließe sich die Sperre einfach per Adresszeile umgehen.
  if (window.Protect) {
    window.Protect.removeShareButton();
    window.Protect.guard("neueste", () => renderNeuesteUnlocked());
  } else {
    renderNeuesteUnlocked();
  }
}

function renderNeuesteUnlocked() {
  document.documentElement.classList.remove("share-mode");
  breadcrumb.innerHTML = `<a href="#/">${t("home")}</a><span class="sep">›</span><span class="current">${folderLabel("neueste")}</span>`;
  const recent = posts.filter((p) => isWithinLast30Days(p.date));
  content.innerHTML = `
    <h1 class="section-label">${t("latestTitle")}</h1>
    <p style="color:var(--ink-soft); margin-top:-10px; margin-bottom: 28px;">${t("latestSub")}</p>
    ${renderPostList(recent, { headingLevel: 2 })}
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
  breadcrumb.innerHTML = `<a href="#/">${t("home")}</a><span class="sep">›</span><span class="current">${folderLabel(id)}</span>`;

  if (!folder.subfolders.length) {
    const list = posts.filter((p) => p.category === id);
    content.innerHTML = `
      <h1 class="section-label">${folderLabel(id)}</h1>
      ${renderPostList(list, { headingLevel: 2 })}
    `;
  } else {
    const subCards = folder.subfolders
      .map((sf) => ({
        href: `#/${id}/${sf.id}`,
        label: subfolderLabel(sf.id),
        count: posts.filter((p) => p.category === id && p.subcategory === sf.id).length
      }))
      // Leere Unterordner blenden wir aus, statt sie als Sackgasse mit
      // "0 Beiträge" anzuzeigen — sobald der erste Beitrag eingetragen
      // wird, taucht die Kachel von selbst wieder auf.
      .filter((c) => c.count > 0);

    content.innerHTML = subCards.length
      ? `
      <h1 class="section-label">${folderLabel(id)}</h1>
      <div class="folder-grid">
        ${subCards
          .map(
            (c, i) => `
          <a class="folder-card" href="${c.href}" style="--i:${i}">
            <span class="folder-icon" style="--tile-accent:${folder.color}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/></svg>
            </span>
            <h2>${c.label}</h2>
            <span class="folder-count">${t("postCount")(c.count)}</span>
          </a>`
          )
          .join("")}
      </div>
    `
      : `
      <h1 class="section-label">${folderLabel(id)}</h1>
      <p class="empty-state">${t("emptyState")}</p>
    `;
  }
  if (window.Protect) window.Protect.addShareButton(id);
}

/* Ordner innerhalb eines Unterordners, die nur mit dem Passwort (voller Zugang) erreichbar sind.
   Der Wert ist die Zugriffs-Kategorie (siehe LABELS in protect.js). Beiträge darin tragen
   dasselbe als "gate" in posts-data.js und data-category im protect.js-Tag der Seite. */
const GATED_FOLDERS = { unterrichtsmaterialien: "material" };

function renderSubfolder(id, subId, matId) {
  const folder = folderStructure[id];
  if (!folder) {
    renderTopLevel();
    return;
  }
  if (window.Protect) {
    window.Protect.removeShareButton();
    window.Protect.guard((matId && GATED_FOLDERS[matId]) || id, () => renderSubfolderUnlocked(id, subId, matId));
  } else {
    renderSubfolderUnlocked(id, subId, matId);
  }
}

function renderSubfolderUnlocked(id, subId, matId) {
  /* "Classroom Management" (Schule → faecheruebergreifend) sammelt Marcs
     eigene Unterrichtsorganisation statt nur allgemeine Lernwerkzeuge --
     deshalb ein eigenes, vom normalen Zugriffslevel unabhängiges Gate
     direkt vor dieser einen Unterordner-Ansicht (siehe protect.js). Gilt
     unabhängig davon, wie der/die Aufrufende die Kategorie "Schule"
     überhaupt erreicht hat (Passwort, Kolleg:innen-Kennwort, Gast oder
     Freigabe-Link) -- alle Wege laufen hier zusammen. */
  if (id === "schule" && subId === "faecheruebergreifend" && window.Protect && typeof window.Protect.guardClassroomManagement === "function") {
    window.Protect.guardClassroomManagement((cmAuthInfo) => renderSubfolderContent(id, subId, cmAuthInfo, matId));
    return;
  }
  renderSubfolderContent(id, subId, undefined, matId);
}

/* cmAuthInfo ist nur bei "schule/faecheruebergreifend" gesetzt (siehe oben)
   und enthält { user, status, isAdmin } aus der Classroom-Management-
   Anmeldung -- für den Admin (Marc) blenden wir hier zusätzlich eine
   Warteliste ein, um neu angemeldete Lehrkräfte freizuschalten. */
function renderSubfolderContent(id, subId, cmAuthInfo, matId) {
  const folder = folderStructure[id];
  const sub = folder.subfolders.find((s) => s.id === subId);
  const label = sub ? subfolderLabel(subId) : subId;
  /* Dritte Ebene: Beiträge mit "folder" (z. B. "unterrichtsmaterialien") liegen in einem
     Ordner INNERHALB des Unterordners und erscheinen dort als eigene Kachel. */
  const inSub = posts.filter((p) => p.category === id && p.subcategory === subId);
  const matLabel = matId ? subfolderLabel(matId) : "";
  breadcrumb.innerHTML = `<a href="#/">${t("home")}</a><span class="sep">›</span><a href="#/${id}">${folderLabel(id)}</a><span class="sep">›</span>` +
    (matId ? `<a href="#/${id}/${subId}">${label}</a><span class="sep">›</span><span class="current">${matLabel}</span>` : `<span class="current">${label}</span>`);

  const list = matId ? inSub.filter((p) => p.folder === matId) : inSub.filter((p) => !p.folder);
  const matIds = matId ? [] : [...new Set(inSub.map((p) => p.folder).filter(Boolean))];
  const matCards = matIds.length
    ? `<div class="folder-grid">${matIds.map((m, i) => `
        <a class="folder-card" href="#/${id}/${subId}/${m}" style="--i:${i}">
          <span class="folder-icon" style="--tile-accent:${folderStructure[id].color}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          </span>
          <h2>${subfolderLabel(m)}</h2>
          <span class="folder-count${GATED_FOLDERS[m] && window.Protect && !window.Protect.isCategoryAllowed(GATED_FOLDERS[m]) ? " folder-count--locked" : ""}">${GATED_FOLDERS[m] && window.Protect && !window.Protect.isCategoryAllowed(GATED_FOLDERS[m]) ? LOCK_GLYPH + " " + escapeHtml(t("guestLocked")) : t("postCount")(inSub.filter((p) => p.folder === m).length)}</span>
        </a>`).join("")}</div>`
    : "";
  content.innerHTML = `
    <h1 class="section-label">${folderLabel(id)} — ${matId ? label + " — " + matLabel : label}</h1>
    ${cmAuthInfo ? '<div id="cm-account-bar" class="cm-account-bar"></div>' : ""}
    ${cmAuthInfo && cmAuthInfo.isAdmin ? '<div id="cm-admin-panel" class="cm-admin-panel"></div>' : ""}
    ${matCards ? matCards + (list.length ? '<div class="folder-list-gap"></div>' : "") : ""}
    ${matCards && !list.length ? "" : renderPostList(list, { headingLevel: 2 })}
  `;
  if (window.Protect) window.Protect.addShareButton(id);
  if (cmAuthInfo) renderCmAccountBar(cmAuthInfo);
  if (cmAuthInfo && cmAuthInfo.isAdmin) renderCmAdminPanel();
}

function renderCmAccountBar(cmAuthInfo) {
  const bar = document.getElementById("cm-account-bar");
  if (!bar) return;
  bar.innerHTML =
    `<span>Angemeldet als <strong>${cmAuthInfo.user.email}</strong></span>` +
    `<button type="button" id="cm-logout-btn" class="cm-logout-btn">Abmelden</button>`;
  bar.querySelector("#cm-logout-btn").addEventListener("click", () => {
    if (window.CmAuth) window.CmAuth.signOut().then(() => location.reload());
  });
}

function renderCmAdminPanel() {
  const panel = document.getElementById("cm-admin-panel");
  if (!panel || !window.CmAuth) return;
  panel.innerHTML = `<p class="muted small">Lade Warteliste…</p>`;
  window.CmAuth.listPendingTeachers().then((pending) => {
    if (!pending.length) {
      panel.innerHTML = "";
      return;
    }
    renderCmAdminPanelList(panel, pending);
  }).catch((err) => {
    panel.innerHTML =
      '<p class="muted small" style="color:#C23B3B;">Warteliste konnte nicht geladen werden (' +
      ((err && err.message) || err) +
      ').</p>';
  });
}

function renderCmAdminPanelList(panel, pending) {
  panel.innerHTML =
    `<h2 class="cm-admin-title">Warteliste (${pending.length})</h2>` +
    pending
      .map(
        (p) =>
          `<div class="cm-admin-row" data-uid="${p.uid}"><span>${p.email}</span><button type="button" class="cm-approve-btn">Freischalten</button></div>`
      )
      .join("");
  panel.querySelectorAll(".cm-approve-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".cm-admin-row");
      const uid = row.dataset.uid;
      btn.disabled = true;
      btn.textContent = "Wird freigeschaltet…";
      window.CmAuth.approveTeacher(uid)
        .then(() => {
          row.remove();
          const title = panel.querySelector(".cm-admin-title");
          const remaining = panel.querySelectorAll(".cm-admin-row").length;
          if (!remaining) panel.innerHTML = "";
          else if (title) title.textContent = `Warteliste (${remaining})`;
        })
        .catch((err) => {
          btn.disabled = false;
          btn.textContent = "Freischalten fehlgeschlagen -- erneut versuchen";
          try { console.error("Freischalten fehlgeschlagen:", err); } catch (e) {}
        });
    });
  });
}

/* ---------------------------------------------------------
   Vertretungsstunde — feste, dauerhaft freigegebene Auswahl an
   selbsterklärenden Lernspielen (Tag "vertretung" in posts-data.js),
   erreichbar ganz ohne Anmeldung über index.html?vertretung=1#/vertretung
   (siehe protect.js). Normal angemeldet ist die Seite ebenfalls
   einsehbar, als schnelle kuratierte Liste.
--------------------------------------------------------- */
function renderVertretung() {
  // Kein classList-Eingriff hier: Läuft gerade eine Vertretungsstunden-
  // Freigabe, hat guard() beim ersten Laden bereits "share-mode" gesetzt
  // (blendet Marken-/Navigationslinks aus) — das soll über die gesamte
  // Sitzung hinweg so bleiben, solange /#vertretung die einzig erreichbare
  // Route ist. Ruft Marc die Seite normal (voller Zugang) auf, ist die
  // Klasse ohnehin nicht gesetzt.
  breadcrumb.innerHTML = `<a href="#/">${t("home")}</a><span class="sep">›</span><span class="current">Vertretungsstunde</span>`;
  const list = posts.filter((p) => (p.tags || []).includes("vertretung"));
  const shortLink = location.origin + "/vertretung/";
  content.innerHTML = `
    <div class="section-label-row no-print">
      <h1 class="section-label">Vertretungsstunde</h1>
      <button type="button" class="clear-recent-btn" id="vertretung-print-btn">Drucken</button>
    </div>
    <p style="color:var(--ink-soft); margin-top:-10px; margin-bottom:28px;" class="no-print">Selbsterklärende Lernspiele ohne Vorbereitung — ideal, wenn eine Vertretungskraft ohne Vorwissen eine Klasse übernimmt. Einfach den Link teilen, kein Passwort nötig.</p>
    <div class="print-sheet" id="vertretung-print-sheet">
      <h2>Vertretungsstunde</h2>
      <p>Dauerhafter Link ohne Anmeldung: ${escapeHtml(shortLink)}</p>
      <div class="protect-qr-wrap" id="vertretung-print-qr"></div>
      <ul>${list.map((p) => `<li>${escapeHtml(p.title)}</li>`).join("")}</ul>
    </div>
    <div class="no-print">${renderPostList(list, { preserveOrder: true })}</div>
  `;
  const printBtn = document.getElementById("vertretung-print-btn");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      if (window.Protect && window.Protect.renderQrCode) {
        window.Protect.renderQrCode(document.getElementById("vertretung-print-qr"), shortLink);
      }
      if (window.Protect && window.Protect.printHandout) {
        window.Protect.printHandout({
          title: "Vertretungsstunde",
          meta: "Dauerhafter Link ohne Anmeldung: " + shortLink,
          items: list.map((p) => p.title),
          qrText: shortLink,
          filename: "vertretungsstunde-handzettel.png"
        });
      } else {
        window.print();
      }
    });
  }
}

/* ---------------------------------------------------------
   Kursmappe — kuratierte Auswahl einzelner Beiträge für genau eine
   Stunde/Einheit, zeitlich begrenzt freigegeben über
   ?share=1&exp=...&posts=a.html,b.html[&title=...] (siehe protect.js).
--------------------------------------------------------- */
function renderKursmappeView() {
  // Kein classList-Eingriff hier — siehe renderVertretung() oben.
  const km = window.Protect && window.Protect.kursmappeStatus ? window.Protect.kursmappeStatus() : { active: false };
  breadcrumb.innerHTML = `<span class="current">Kursmappe</span>`;
  if (!km.active) {
    content.innerHTML = `<p class="empty-state">${t("emptyState")}</p>`;
    return;
  }
  const list = posts.filter((p) => km.urls.indexOf(p.url) !== -1);
  content.innerHTML = `
    <h1 class="section-label">${km.title ? escapeHtml(km.title) : "Kursmappe"}</h1>
    ${renderPostList(list, { preserveOrder: true })}
  `;
}

/* ---------------------------------------------------------
   Kursmappen-Vorlagen — rein lokal im Browser gespeicherte Auswahlen
   (Titel + Gültigkeitsdauer + Beiträge), damit sich wiederkehrende
   Kombinationen (z. B. "Standardauswahl Jg. 6 Mathe") mit einem Klick
   neu laden lassen, statt die Häkchen jedes Mal von Hand zu setzen. Der
   eigentliche Freigabe-Link bleibt trotzdem wie gewohnt ein frischer,
   zeitlich begrenzter Link — gespeichert wird nur die Auswahl selbst.
--------------------------------------------------------- */
const KM_PRESETS_KEY = "buildspace_km_presets_v1";

function getKmPresets() {
  try {
    const raw = JSON.parse(localStorage.getItem(KM_PRESETS_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function saveKmPresets(list) {
  try { localStorage.setItem(KM_PRESETS_KEY, JSON.stringify(list.slice(0, 20))); } catch (e) {}
}

/* ---------------------------------------------------------
   Kursmappe erstellen — nur mit vollem Zugang (Marc) erreichbar: Beiträge
   auswählen, Titel/Gültigkeitsdauer festlegen, Link + QR-Code erzeugen.
--------------------------------------------------------- */
function renderKursmappeBuilder() {
  if (!window.Protect || window.Protect.getAccess() !== "full") {
    location.hash = "#/";
    return;
  }
  document.documentElement.classList.remove("share-mode");
  breadcrumb.innerHTML = `<a href="#/">${t("home")}</a><span class="sep">›</span><span class="current">Kursmappe erstellen</span>`;
  content.innerHTML = `
    <h1 class="section-label">Kursmappe erstellen</h1>
    <p style="color:var(--ink-soft); margin-top:-10px; margin-bottom:20px;" class="no-print">Wähle die Beiträge für diese Stunde aus. Der Link zeigt Lernenden nur genau diese Auswahl — ganz ohne Anmeldung, automatisch zeitlich begrenzt.</p>
    <div class="km-builder">
      <div class="km-form-fields no-print">
        <div class="km-presets">
          <div class="km-presets-header"><span>Meine Vorlagen</span></div>
          <div id="km-presets-list"></div>
        </div>
        <label class="km-field">Titel (optional, erscheint im Hinweisbanner)
          <input type="text" id="km-title" placeholder="z. B. Bruchrechnen – Doppelstunde" maxlength="60" />
        </label>
        <label class="km-field">Gültigkeitsdauer
          <select id="km-minutes">
            <option value="15">15 Minuten</option>
            <option value="30" selected>30 Minuten</option>
            <option value="45">45 Minuten</option>
            <option value="90">90 Minuten (Doppelstunde)</option>
            <option value="180">3 Stunden</option>
          </select>
        </label>
        <div class="km-post-list">
          ${posts
            .map(
              (p, i) => `
            <label class="km-post-item">
              <input type="checkbox" class="km-post-check" value="${escapeHtml(p.url)}" data-idx="${i}">
              <span class="km-post-title">${escapeHtml(p.title)}</span>
              <span class="km-post-meta">${folderLabel(p.category)}${p.subcategory ? " · " + subfolderLabel(p.subcategory) : ""}</span>
            </label>`
            )
            .join("")}
        </div>
        <div class="km-actions">
          <button type="button" class="protect-submit" id="km-generate" style="max-width:280px;">Link erstellen</button>
          <button type="button" class="protect-copy-btn" id="km-save-preset">Als Vorlage speichern</button>
        </div>
      </div>
      <div id="km-link-area" style="display:none; margin-top:18px;">
        <div id="km-print-sheet" class="print-sheet">
          <h2 id="km-print-title"></h2>
          <p id="km-print-meta"></p>
          <ul id="km-print-list"></ul>
        </div>
        <div class="protect-qr-wrap" id="km-qr-wrap"></div>
        <div class="protect-link-row no-print">
          <input type="text" id="km-link-out" readonly />
          <button class="protect-copy-btn" id="km-copy-btn">Kopieren</button>
        </div>
        <div class="protect-error no-print" id="km-copy-msg" style="color:#2F6F4F;"></div>
        <button type="button" class="protect-copy-btn no-print" id="km-print-btn" style="margin-top:10px;">Als Handzettel drucken</button>
      </div>
    </div>
  `;

  function renderPresetsList() {
    const el = document.getElementById("km-presets-list");
    if (!el) return;
    const presetsList = getKmPresets();
    if (!presetsList.length) {
      el.innerHTML = '<p class="km-presets-empty">Noch keine Vorlagen gespeichert.</p>';
      return;
    }
    el.innerHTML = presetsList
      .map(
        (p) => `
      <div class="km-preset-row">
        <span class="km-preset-name">${escapeHtml(p.name)}</span>
        <span class="km-preset-meta">${p.urls.length} Beiträge · ${p.minutes} Min.</span>
        <button type="button" class="km-preset-load" data-id="${escapeHtml(p.id)}">Laden</button>
        <button type="button" class="km-preset-delete" data-id="${escapeHtml(p.id)}" aria-label="Vorlage löschen">✕</button>
      </div>`
      )
      .join("");
    el.querySelectorAll(".km-preset-load").forEach((btn) => {
      btn.addEventListener("click", () => {
        const preset = getKmPresets().find((p) => p.id === btn.dataset.id);
        if (!preset) return;
        document.getElementById("km-title").value = preset.title || "";
        document.getElementById("km-minutes").value = String(preset.minutes || 30);
        document.querySelectorAll(".km-post-check").forEach((c) => {
          c.checked = preset.urls.indexOf(c.value) !== -1;
        });
      });
    });
    el.querySelectorAll(".km-preset-delete").forEach((btn) => {
      btn.addEventListener("click", () => {
        saveKmPresets(getKmPresets().filter((p) => p.id !== btn.dataset.id));
        renderPresetsList();
      });
    });
  }
  renderPresetsList();

  document.getElementById("km-save-preset").addEventListener("click", () => {
    const checked = Array.from(document.querySelectorAll(".km-post-check:checked")).map((c) => c.value);
    if (!checked.length) {
      alert("Bitte mindestens einen Beitrag auswählen.");
      return;
    }
    const titleVal = document.getElementById("km-title").value.trim();
    const name = (prompt("Name für diese Vorlage:", titleVal || "Neue Vorlage") || "").trim();
    if (!name) return;
    const minutes = Number(document.getElementById("km-minutes").value);
    const presetsList = getKmPresets();
    presetsList.unshift({ id: String(Date.now()), name: name.slice(0, 40), title: titleVal, minutes, urls: checked });
    saveKmPresets(presetsList);
    renderPresetsList();
  });

  document.getElementById("km-generate").addEventListener("click", () => {
    const checked = Array.from(document.querySelectorAll(".km-post-check:checked")).map((c) => c.value);
    if (!checked.length) {
      alert("Bitte mindestens einen Beitrag auswählen.");
      return;
    }
    const minutes = Number(document.getElementById("km-minutes").value);
    const title = document.getElementById("km-title").value.trim();
    const link = window.Protect.kursmappeLinkFor(checked, minutes, title);
    document.getElementById("km-link-out").value = link;
    document.getElementById("km-link-area").style.display = "block";
    if (window.Protect.renderQrCode) window.Protect.renderQrCode(document.getElementById("km-qr-wrap"), link);

    // Handzettel-Inhalt fürs Drucken (siehe .print-sheet in style.css) —
    // wird nur beim Drucken sichtbar, nicht am Bildschirm.
    const chosenPosts = checked.map((url) => posts.find((p) => p.url === url)).filter(Boolean);
    const expDate = new Date(Date.now() + minutes * 60000);
    const expStr = expDate.toLocaleString(t("dateLocale"), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    document.getElementById("km-print-title").textContent = "" + (title || "Kursmappe");
    document.getElementById("km-print-meta").textContent = "Gültig bis " + expStr + " Uhr — kein Passwort nötig, einfach den QR-Code scannen.";
    document.getElementById("km-print-list").innerHTML = chosenPosts
      .map((p) => `<li>${escapeHtml(p.title)}</li>`)
      .join("");
  });
  document.getElementById("km-copy-btn").addEventListener("click", async () => {
    const out = document.getElementById("km-link-out");
    const msg = document.getElementById("km-copy-msg");
    try {
      await navigator.clipboard.writeText(out.value);
      msg.textContent = "Link kopiert!";
    } catch (e) {
      out.select();
      try {
        document.execCommand("copy");
        msg.textContent = "Link kopiert!";
      } catch (e2) {
        msg.textContent = "Bitte manuell kopieren.";
      }
    }
  });
  document.getElementById("km-print-btn").addEventListener("click", () => {
    if (window.Protect && window.Protect.printHandout) {
      const items = Array.from(document.querySelectorAll("#km-print-list li")).map((li) => li.textContent);
      window.Protect.printHandout({
        title: document.getElementById("km-print-title").textContent,
        meta: document.getElementById("km-print-meta").textContent,
        items: items,
        qrText: document.getElementById("km-link-out").value,
        filename: "kursmappe-handzettel.png"
      });
    } else {
      window.print();
    }
  });
}

/* ---------------------------------------------------------
   Kolleg:innen-Bereich — dritte Zugriffs-Ebene (Kolleg:innen-Kennwort,
   siehe protect.js), zusätzlich zu Schule nutzbar. Aktuell ein Grundgerüst
   mit Platz für Fortbildungsunterlagen; die Feedback-Auswertung ist bereits
   funktionsfähig.
--------------------------------------------------------- */
function renderKollegen(sub) {
  if (window.Protect) {
    window.Protect.removeShareButton();
    window.Protect.guard("kollegen", () => renderKollegenUnlocked(sub));
  } else {
    renderKollegenUnlocked(sub);
  }
}

function renderKollegenUnlocked(sub) {
  if (sub === "feedback") {
    renderKollegenFeedback();
    return;
  }
  if (sub === "bestenlisten") {
    renderKollegenBestenlisten();
    return;
  }
  breadcrumb.innerHTML = `<a href="#/">${t("home")}</a><span class="sep">›</span><span class="current">Kolleg:innen</span>`;
  content.innerHTML = `
    <h1 class="section-label">Kolleg:innen-Bereich</h1>
    <p style="color:var(--ink-soft); margin-top:-10px; margin-bottom:28px;">Interner Bereich für Kolleg:innen der GGL — Fortbildungsunterlagen, Vorlagen und Tool-Präsentationen aus dem iPad-Team. Noch im Aufbau.</p>
    <div class="folder-grid">
      <div class="folder-card is-placeholder" style="--i:0">
        <span class="folder-icon">📎</span>
        <h2>Fortbildungs-Vorlagen</h2>
        <span class="folder-count">Bald verfügbar</span>
      </div>
      <div class="folder-card is-placeholder" style="--i:1">
        <span class="folder-icon">🖥️</span>
        <h2>Tool-Präsentationen</h2>
        <span class="folder-count">Bald verfügbar</span>
      </div>
      <a class="folder-card" href="#/kollegen/feedback" style="--i:2">
        <span class="folder-icon">📊</span>
        <h2>Feedback-Auswertung</h2>
        <span class="folder-count">Rückmeldungen zu den Tools</span>
      </a>
      <a class="folder-card" href="#/kollegen/bestenlisten" style="--i:3">
        <span class="folder-icon">🏆</span>
        <h2>Bestenlisten</h2>
        <span class="folder-count">Einträge einsehen &amp; verwalten</span>
      </a>
    </div>
  `;
}

function renderKollegenFeedback() {
  const isFull = window.Protect && window.Protect.getAccess() === "full";
  breadcrumb.innerHTML = `<a href="#/">${t("home")}</a><span class="sep">›</span><a href="#/kollegen">Kolleg:innen</a><span class="sep">›</span><span class="current">Feedback-Auswertung</span>`;
  content.innerHTML = `
    <h1 class="section-label">Feedback-Auswertung</h1>
    <p style="color:var(--ink-soft); margin-top:-10px; margin-bottom:20px;">Rückmeldungen (👍/👎), die Lernende auf den einzelnen Werkzeug-Seiten abgegeben haben. „Letzte 7 Tage" zeigt nur die jüngsten Stimmen.</p>
    <div id="feedback-agg-list"><p class="empty-state">Lade Rückmeldungen …</p></div>
  `;
  if (!window.Protect || typeof window.Protect.loadFirebase !== "function") return;
  window.Protect.loadFirebase()
    .then(({ db }) => db.collection("tool_feedback").get())
    .then((snap) => {
      const agg = {};
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      snap.forEach((doc) => {
        const d = doc.data();
        if (!d || !d.tool) return;
        if (!agg[d.tool]) agg[d.tool] = { up: 0, down: 0, up7: 0, down7: 0, comments: [] };
        const recent = typeof d.ts === "number" && d.ts >= sevenDaysAgo;
        if (d.vote === "up") { agg[d.tool].up++; if (recent) agg[d.tool].up7++; }
        else if (d.vote === "down") { agg[d.tool].down++; if (recent) agg[d.tool].down7++; }
        if (d.comment) agg[d.tool].comments.push({ vote: d.vote, comment: d.comment });
      });
      const rows = Object.keys(agg).sort((a, b) => agg[b].up + agg[b].down - (agg[a].up + agg[a].down));
      const el = document.getElementById("feedback-agg-list");
      if (!el) return;
      if (!rows.length) {
        el.innerHTML = '<p class="empty-state">Noch keine Rückmeldungen.</p>';
        return;
      }
      const allComments = rows.flatMap((tool) => agg[tool].comments.map((c) => ({ tool, ...c })));
      el.innerHTML =
        '<table class="feedback-table"><thead><tr><th>Werkzeug</th><th>👍</th><th>👎</th><th>Letzte 7 Tage</th>' +
        (isFull ? "<th></th>" : "") +
        "</tr></thead><tbody>" +
        rows
          .map(
            (tool) => `<tr>
          <td>${escapeHtml(tool)}</td>
          <td>${agg[tool].up}</td>
          <td>${agg[tool].down}</td>
          <td>${agg[tool].up7}👍 / ${agg[tool].down7}👎</td>
          ${isFull ? `<td><button type="button" class="feedback-reset-btn" data-tool="${escapeHtml(tool)}">Zurücksetzen</button></td>` : ""}
        </tr>`
          )
          .join("") +
        "</tbody></table>" +
        (allComments.length
          ? '<h2 class="section-label" style="margin-top:32px;">Kommentare</h2><ul class="feedback-comments">' +
            allComments.map((c) => `<li><b>${escapeHtml(c.tool)}</b> ${c.vote === "up" ? "👍" : "👎"} — ${escapeHtml(c.comment)}</li>`).join("") +
            "</ul>"
          : "");
    })
    .catch(() => {
      const el = document.getElementById("feedback-agg-list");
      if (el) el.innerHTML = '<p class="empty-state">Konnte Rückmeldungen nicht laden (Firestore-Regeln prüfen).</p>';
    });
}

/* ---------------------------------------------------------
   Bestenlisten verwalten — dieselben Highscore-Daten wie das
   Bestenlisten-Widget auf den einzelnen Werkzeug-Seiten (protect.js),
   hier gebündelt einsehbar; mit vollem Zugang lassen sich einzelne
   Einträge entfernen (z. B. bei Unsinn in Name/Punktzahl).
--------------------------------------------------------- */
function loadHighscoreBlock(file, isFull) {
  const body = document.querySelector(`.hs-tool-body[data-file="${CSS.escape(file)}"]`);
  if (!body || !window.Protect || typeof window.Protect.loadFirebase !== "function") return;
  window.Protect.loadFirebase()
    .then(({ db }) => db.collection("highscores").where("tool", "==", file).orderBy("score", "desc").limit(10).get())
    .then((snap) => {
      if (!document.body.contains(body)) return;
      if (snap.empty) {
        body.innerHTML = '<p class="empty-state">Noch keine Einträge.</p>';
        return;
      }
      body.innerHTML =
        "<ol>" +
        snap.docs
          .map((d) => {
            const v = d.data();
            return `<li><span>${escapeHtml(v.name)}</span><b>${escapeHtml(String(v.score))}</b>${
              isFull ? `<button type="button" class="hs-delete-btn" data-id="${escapeHtml(d.id)}" data-file="${escapeHtml(file)}" aria-label="Eintrag löschen">✕</button>` : ""
            }</li>`;
          })
          .join("") +
        "</ol>";
    })
    .catch(() => {
      if (document.body.contains(body)) body.innerHTML = '<p class="empty-state">Bestenliste gerade nicht verfügbar.</p>';
    });
}

function renderKollegenBestenlisten() {
  const isFull = window.Protect && window.Protect.getAccess() === "full";
  breadcrumb.innerHTML = `<a href="#/">${t("home")}</a><span class="sep">›</span><a href="#/kollegen">Kolleg:innen</a><span class="sep">›</span><span class="current">Bestenlisten</span>`;
  const files = (window.Protect && window.Protect.HIGHSCORE_FILES) || [];
  content.innerHTML = `
    <h1 class="section-label">Bestenlisten</h1>
    <p style="color:var(--ink-soft); margin-top:-10px; margin-bottom:20px;">Höchste Punktzahlen pro Lernspiel.${isFull ? " Einträge lassen sich hier entfernen." : ""}</p>
    <div class="hs-tool-grid">
      ${files
        .map((f) => {
          const post = posts.find((p) => p.url === f);
          const label = post ? post.title : f;
          return `<div class="hs-tool-block">
          <h3>${escapeHtml(label)}</h3>
          <div class="hs-tool-body" data-file="${escapeHtml(f)}"><p class="empty-state">Lade …</p></div>
        </div>`;
        })
        .join("")}
    </div>
  `;
  files.forEach((f) => loadHighscoreBlock(f, isFull));
}

/* ---------------------------------------------------------
   Lebendiger Hero-Kopf: eine tageszeit-abhängige Begrüßung und ein
   paar Kennzahlen, die beim ersten Laden von 0 hochzählen. Läuft
   einmalig beim Start, unabhängig vom Router (Kopf bleibt bei jeder
   Route gleich stehen).
--------------------------------------------------------- */
function greetingForNow() {
  const h = new Date().getHours();
  const g = t("greeting");
  if (h < 5) return g.night;
  if (h < 11) return g.morning;
  if (h < 14) return g.noon;
  if (h < 18) return g.day;
  return g.evening;
}

function animateCount(el, target, duration) {
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(eased * target);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function initHero() {
  const greetingEl = document.getElementById("hero-greeting");
  if (greetingEl) greetingEl.textContent = greetingForNow();

  const sloganEl = document.getElementById("hero-slogan");
  if (sloganEl) sloganEl.textContent = t("heroSlogan");

  const footerEl = document.getElementById("site-footer-text");
  if (footerEl) footerEl.textContent = t("footer");

  const statsEl = document.getElementById("hero-stats");
  if (!statsEl) return;
  const total = posts.length;
  const categories = Object.keys(folderStructure).length;
  const recent = posts.filter((p) => isWithinLast30Days(p.date)).length;
  const stats = [
    { value: total, label: t("statPost")(total) },
    { value: categories, label: t("statAreas") },
    { value: recent, label: t("statNew") }
  ];
  statsEl.innerHTML = stats
    .map(
      (s, i) => `
    <div class="hero-stat" style="--i:${i}">
      <span class="hero-stat-value" data-target="${s.value}">0</span>
      <span class="hero-stat-label">${s.label}</span>
    </div>`
    )
    .join("");
  statsEl.querySelectorAll(".hero-stat-value").forEach((el) => {
    animateCount(el, Number(el.dataset.target), 900);
  });
}

/* ---------------------------------------------------------
   Einstellungen in der Seitenleiste: Darstellung (Nacht/Hell)
   und Sprache (DE/EN). Standard ist "Nacht"; die Wahl wird in
   localStorage gemerkt und per data-theme auf <html> gesetzt.
--------------------------------------------------------- */
const THEME_KEY = "myhome_theme";

/* Standard ist der Nachtmodus (Weltraum-Hintergrund); "Hell" dimmt die Szene. */
function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch (e) {
    return "dark";
  }
}

function applyThemeAttribute(theme) {
  document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
}

function setThemeMode(mode) {
  const theme = mode === "light" ? "light" : "dark";
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {}
  applyThemeAttribute(theme);
  updateSettingsUI();
}

function updateSettingsUI() {
  const mode = getStoredTheme();
  document.querySelectorAll("[data-theme-set]").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.themeSet === mode));
  });
  const lang = getLang();
  document.querySelectorAll("[data-lang-set]").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.langSet === lang));
  });
  const txt = (id, key) => { const el = document.getElementById(id); if (el) el.textContent = t(key); };
  txt("set-theme-label", "setTheme");
  txt("set-lang-label", "setLang");
  const setBtnText = (sel, key) => { const el = document.querySelector(sel); if (el) el.textContent = t(key); };
  setBtnText('[data-theme-set="light"]', "themeLight");
  setBtnText('[data-theme-set="dark"]', "themeDark");
  const menuBtn = document.getElementById("menu-toggle");
  if (menuBtn) menuBtn.setAttribute("aria-label", t("menuOpen"));
  const closeBtn = document.getElementById("sidebar-close");
  if (closeBtn) closeBtn.setAttribute("aria-label", t("menuClose"));
  const searchFab = document.getElementById("search-fab");
  if (searchFab) searchFab.setAttribute("aria-label", t("searchOpen"));
  const clearBtn = document.getElementById("side-search-clear");
  if (clearBtn) clearBtn.setAttribute("aria-label", t("searchClear"));
  const input = document.getElementById("site-search");
  if (input) {
    input.setAttribute("placeholder", t("searchPlaceholder"));
    input.setAttribute("aria-label", t("searchLabel"));
  }
  document.documentElement.lang = lang;
}

function initSettings() {
  applyThemeAttribute(getStoredTheme());
  updateSettingsUI();
  document.querySelectorAll("[data-theme-set]").forEach((b) => {
    b.addEventListener("click", () => setThemeMode(b.dataset.themeSet));
  });
  document.querySelectorAll("[data-lang-set]").forEach((b) => {
    b.addEventListener("click", () => {
      if (b.dataset.langSet === getLang()) return;
      setLang(b.dataset.langSet);
      updateSettingsUI();
      initHero();
      renderSidebarNav();
      renderSearchResults();
      render();
    });
  });
}

/* ---------------------------------------------------------
   Seitenleiste: Menü über alle Bereiche, Suche, Einstellungen.
   Gleitet als Glas-Fläche über die Inhalte (Schließen per Esc, Klick
   daneben, Schließen-Knopf oder Navigation). "/" öffnet sie mit
   fokussierter Suche.
--------------------------------------------------------- */
const HOME_GLYPH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M5.5 10v9.5h4.6v-5.2h3.8v5.2h4.6V10"/></svg>';
const ADMIN_GLYPH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
const CHEVRON_GLYPH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';

const sidebarEl = document.getElementById("sidebar");
const sidebarNavEl = document.getElementById("sidebar-nav");
const sideResultsEl = document.getElementById("side-results");
const searchInputEl = document.getElementById("site-search");
const searchClearEl = document.getElementById("side-search-clear");
const openGroups = new Set();

function isSidebarOpen() {
  return document.documentElement.classList.contains("sidebar-open");
}

function openSidebar() {
  closeSearch(false);
  document.documentElement.classList.add("sidebar-open");
  sidebarEl.setAttribute("aria-hidden", "false");
  const toggle = document.getElementById("menu-toggle");
  if (toggle) toggle.setAttribute("aria-expanded", "true");
  renderSidebarNav();
  setTimeout(() => sidebarEl.focus({ preventScroll: true }), 60);
}

function closeSidebar(returnFocus) {
  if (!isSidebarOpen()) return;
  document.documentElement.classList.remove("sidebar-open");
  sidebarEl.setAttribute("aria-hidden", "true");
  const toggle = document.getElementById("menu-toggle");
  if (toggle) {
    toggle.setAttribute("aria-expanded", "false");
    if (returnFocus) toggle.focus({ preventScroll: true });
  }
}

function isSearchOpen() {
  return document.documentElement.classList.contains("search-open");
}

function openSearch() {
  closeSidebar(false);
  document.documentElement.classList.add("search-open");
  const panel = document.getElementById("search-panel");
  const fab = document.getElementById("search-fab");
  if (panel) panel.setAttribute("aria-hidden", "false");
  if (fab) fab.setAttribute("aria-expanded", "true");
  setTimeout(() => searchInputEl && searchInputEl.focus(), 60);
}

function closeSearch(returnFocus) {
  if (!isSearchOpen()) return;
  document.documentElement.classList.remove("search-open");
  const panel = document.getElementById("search-panel");
  const fab = document.getElementById("search-fab");
  if (panel) panel.setAttribute("aria-hidden", "true");
  if (fab) {
    fab.setAttribute("aria-expanded", "false");
    if (returnFocus) fab.focus({ preventScroll: true });
  }
}

function currentSegments() {
  return parseHash();
}

function sideIcon(id) {
  const glyph = id === "home" ? HOME_GLYPH : id === "admin" ? ADMIN_GLYPH : MINI_ICONS[id] || "";
  return `<span class="side-ico side-ico--${id}" aria-hidden="true">${glyph}</span>`;
}

function renderSidebarNav() {
  if (!sidebarNavEl) return;
  const seg = currentSegments();
  const route = seg.join("/");
  const lockOf = (id) => (window.Protect ? !window.Protect.isCategoryAllowed(id) : false);
  const lockMark = (id) => (lockOf(id) ? `<span class="side-lock" aria-hidden="true">${LOCK_GLYPH}</span>` : "");
  const cls = (active, locked) => "side-link" + (active ? " is-active" : "") + (locked ? " is-locked" : "");
  const cur = (active) => (active ? ' aria-current="page"' : "");

  let html = "";
  html += `<div class="side-row"><a class="${cls(route === "", false)}" href="#/"${cur(route === "")}>${sideIcon("home")}<span class="side-text">${escapeHtml(t("home"))}</span></a></div>`;
  const newCount = posts.filter((p) => isWithinLast30Days(p.date)).length;
  html += `<div class="side-row"><a class="${cls(route === "neueste", lockOf("neueste"))}" href="#/neueste"${cur(route === "neueste")}>${sideIcon("neueste")}<span class="side-text">${escapeHtml(folderLabel("neueste"))}</span>${lockMark("neueste")}<span class="side-count">${newCount}</span></a></div>`;

  Object.entries(folderStructure).forEach(([id, f]) => {
    const subs = f.subfolders
      .map((sf) => ({ id: sf.id, count: posts.filter((p) => p.category === id && p.subcategory === sf.id).length }))
      .filter((s2) => s2.count > 0);
    const total = posts.filter((p) => p.category === id).length;
    const active = seg[0] === id;
    if (active) openGroups.add(id);
    const open = openGroups.has(id);
    const locked = lockOf(id);
    html += `<div class="side-group${open ? " is-open" : ""}" data-group="${id}">
      <div class="side-row">
        <a class="${cls(active && seg.length === 1, locked)}" href="#/${id}"${cur(active && seg.length === 1)}>${sideIcon(id)}<span class="side-text">${escapeHtml(folderLabel(id))}</span>${lockMark(id)}<span class="side-count">${total}</span></a>
        ${subs.length ? `<button type="button" class="side-expand" data-expand="${id}" aria-expanded="${open}" aria-label="${escapeHtml(t("expandLabel"))}">${CHEVRON_GLYPH}</button>` : ""}
      </div>
      ${subs.length ? `<div class="side-sub"><div>${subs.map((s2) => {
        const a2 = active && seg[1] === s2.id;
        return `<a class="side-sublink${a2 ? " is-active" : ""}" href="#/${id}/${s2.id}"${cur(a2)}><span class="side-text">${escapeHtml(subfolderLabel(s2.id))}</span><span class="side-count">${s2.count}</span></a>`;
      }).join("")}</div></div>` : ""}
    </div>`;
  });

  html += `<div class="side-label" id="side-admin-label" style="display:none">${escapeHtml(t("navAdmin"))}</div>`;
  html += `<div class="side-row"><a class="${cls(route === "kollegen" || route.startsWith("kollegen/"), false)}" href="#/kollegen" id="kollegen-nav-link" style="display:none">${sideIcon("admin")}<span class="side-text">${escapeHtml(t("kollegenLabel"))}</span></a></div>`;
  html += `<div class="side-row"><a class="${cls(route === "kursmappe-erstellen", false)}" href="#/kursmappe-erstellen" id="kursmappe-nav-link" style="display:none">${sideIcon("admin")}<span class="side-text">${escapeHtml(t("kursmappeLabel"))}</span></a></div>`;
  sidebarNavEl.innerHTML = html;
  updateAdminNavLinks();
}

function renderSearchResults() {
  if (!sideResultsEl || !searchInputEl) return;
  const raw = searchInputEl.value.trim();
  const q = raw.toLowerCase();
  if (searchClearEl) searchClearEl.hidden = !searchInputEl.value;
  if (!q) {
    sideResultsEl.hidden = true;
    sideResultsEl.innerHTML = "";
    return;
  }
  sideResultsEl.hidden = false;
  // Suche läuft über den gerade angezeigten (lokalisierten) Text, damit
  // Treffer und sichtbarer Titel/Beschreibung immer zusammenpassen.
  const matches = posts
    .filter((p0) => {
      if (!isPostAllowed(p0)) return false;
      const p = localizePost(p0);
      return p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q);
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!matches.length) {
    sideResultsEl.innerHTML = `<p class="side-empty">${t("searchEmpty")(escapeHtml(raw))}</p>`;
    return;
  }
  sideResultsEl.innerHTML =
    `<p class="side-result-count">${t("searchResults")(matches.length, escapeHtml(raw))}</p>` +
    matches
      .map((p0) => {
        const p = localizePost(p0);
        const isExternal = /^https?:\/\//i.test(p.url);
        const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
        const where = [folderStructure[p.category] ? folderLabel(p.category) : p.category, p.subcategory ? subfolderLabel(p.subcategory) : ""].filter(Boolean).join(" · ");
        return `<a class="side-result" href="${escapeHtml(p.url)}"${attrs}>
          <span class="side-result-emoji" aria-hidden="true"><span class="icon-badge icon-badge--${p.category}">${MINI_ICONS[p.category] || ""}</span></span>
          <span><b>${highlightMatch(p.title, raw)}</b><small>${escapeHtml(where)}</small></span>
        </a>`;
      })
      .join("");
}

function initSidebar() {
  const toggle = document.getElementById("menu-toggle");
  const searchFab = document.getElementById("search-fab");
  const closeBtn = document.getElementById("sidebar-close");
  const backdrop = document.getElementById("sidebar-backdrop");
  if (!sidebarEl) return;

  toggle.addEventListener("click", () => (isSidebarOpen() ? closeSidebar(true) : openSidebar()));
  searchFab.addEventListener("click", () => (isSearchOpen() ? closeSearch(true) : openSearch()));
  document.getElementById("search-backdrop").addEventListener("click", () => closeSearch(false));
  closeBtn.addEventListener("click", () => closeSidebar(true));
  backdrop.addEventListener("click", () => closeSidebar(false));

  // Navigation (innere Links) schließt die Leiste — auch wenn nur der
  // Hash gleich bleibt (z. B. erneuter Klick auf "Start").
  sidebarEl.addEventListener("click", (e) => {
    const expand = e.target.closest("[data-expand]");
    if (expand) {
      const id = expand.dataset.expand;
      const grp = expand.closest(".side-group");
      const open = !grp.classList.contains("is-open");
      grp.classList.toggle("is-open", open);
      expand.setAttribute("aria-expanded", String(open));
      if (open) openGroups.add(id);
      else openGroups.delete(id);
      return;
    }
    const link = e.target.closest("a[href]");
    if (link) closeSidebar(false);
  });

  searchInputEl.addEventListener("input", renderSearchResults);
  searchInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const first = sideResultsEl.querySelector("a.side-result");
      if (first) first.click();
    }
  });
  searchClearEl.addEventListener("click", () => {
    searchInputEl.value = "";
    renderSearchResults();
    searchInputEl.focus();
  });

  // Klick auf ein Suchergebnis schließt die Suche.
  sideResultsEl.addEventListener("click", (e) => {
    if (e.target.closest("a[href]")) closeSearch(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (isSearchOpen()) closeSearch(true);
    else if (isSidebarOpen()) closeSidebar(true);
  });

  // Tastatur-Fokus bleibt im geöffneten Menü bzw. in der Suche.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const box = isSearchOpen() ? document.getElementById("search-panel") : isSidebarOpen() ? sidebarEl : null;
    if (!box) return;
    const items = Array.from(box.querySelectorAll('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])')).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === box)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  });

  // "Zum Inhalt springen": nicht über den Hash (der würde den Router auslösen).
  const skip = document.getElementById("skip-link");
  if (skip) skip.addEventListener("click", (e) => {
    e.preventDefault();
    const m = document.getElementById("main");
    if (m) { m.focus({ preventScroll: false }); m.scrollIntoView(); }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initSettings();
  initSidebar();
  renderSidebarNav();
  initHero();
});

/* ---------------------------------------------------------
   Service Worker — macht buildspace installierbar (siehe
   buildspace-v3.webmanifest) und auch offline nutzbar, z. B. bei schwachem
   Schul-WLAN oder nach dem Hinzufügen zum iPad-Homescreen. Registrierung
   schlägt in nicht unterstützenden Kontexten einfach folgenlos fehl.
--------------------------------------------------------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
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
  if (window.Protect && window.Protect.isVertretungMode && window.Protect.isVertretungMode()) {
    return segments[0] === "vertretung";
  }
  if (window.Protect && window.Protect.isKursmappeMode && window.Protect.isKursmappeMode()) {
    return segments[0] === "kursmappe";
  }
  if (!(window.Protect && window.Protect.isShareMode())) return true;
  if (segments.length === 0) return false;
  if (segments[0] === "neueste") return false;
  return window.Protect.isRouteAllowed(segments[0]);
}

/* Blendet die beiden Verwaltungs-Links oben in der Navigation je nach
   Zugriffs-Ebene ein/aus: "Kolleg:innen" für volle und Kolleg:innen-
   Zugänge, "Kursmappe erstellen" nur für den vollen Zugang (Marc). */
/* Kolleg:innen-Bereich: vorübergehend ausgeblendet (Menü-Eintrag und Seite #/kollegen).
   Zum Wieder-Einschalten hier UND in protect.js (KOLLEGEN_AKTIV) auf true setzen. */
const KOLLEGEN_AKTIV = false;

function updateAdminNavLinks() {
  const access = window.Protect ? window.Protect.getAccess() : null;
  const kollegenLink = document.getElementById("kollegen-nav-link");
  const kursmappeLink = document.getElementById("kursmappe-nav-link");
  const showKollegen = KOLLEGEN_AKTIV && (access === "full" || access === "kollegen");
  const showKursmappe = access === "full";
  const row = (el) => el && el.parentElement;
  if (row(kollegenLink)) row(kollegenLink).style.display = showKollegen ? "" : "none";
  if (row(kursmappeLink)) row(kursmappeLink).style.display = showKursmappe ? "" : "none";
  if (kollegenLink) kollegenLink.style.display = showKollegen ? "" : "none";
  if (kursmappeLink) kursmappeLink.style.display = showKursmappe ? "" : "none";
  const label = document.getElementById("side-admin-label");
  if (label) label.style.display = showKollegen || showKursmappe ? "" : "none";
}

function render() {
  ensureShareHomeHash();
  /* Falls noch ein Passwort-Fenster von der vorherigen Route offen ist (z. B.
     wenn per Zurück-Button aus einem geschützten, noch nicht entsperrten
     Bereich navigiert wird), erst schließen — führt die neue Route wieder in
     einen geschützten, gesperrten Bereich, öffnet guard() es sofort neu.
     Ausnahme: die einmalige Anmeldung ganz am Anfang (noch kein Zugriff
     vergeben) ist NICHT an eine Route gebunden — der automatische
     DOMContentLoaded-Render darf dieses Anmeldefenster nicht wegschließen,
     bevor sich jemand für Passwort oder Gast entschieden hat. */
  if (window.Protect && window.Protect.getAccess()) window.Protect.closeOverlay();
  const segments = parseHash();
  document.documentElement.classList.toggle("is-home", segments.length === 0);
  renderSidebarNav();
  if (!isAllowedRoute(segments)) {
    if (window.Protect && window.Protect.isVertretungMode && window.Protect.isVertretungMode()) {
      location.hash = "#/vertretung";
    } else if (window.Protect && window.Protect.isKursmappeMode && window.Protect.isKursmappeMode()) {
      location.hash = "#/kursmappe";
    } else {
      location.hash = shareHomeHash || "#/";
    }
    return;
  }
  if (segments.length === 0) {
    renderTopLevel();
  } else if (segments[0] === "neueste") {
    renderNeueste();
  } else if (segments[0] === "vertretung") {
    renderVertretung();
  } else if (segments[0] === "kursmappe") {
    renderKursmappeView();
  } else if (segments[0] === "kursmappe-erstellen") {
    renderKursmappeBuilder();
  } else if (segments[0] === "kollegen" && KOLLEGEN_AKTIV) {
    renderKollegen(segments[1]);
  } else if (segments.length === 1) {
    renderFolder(segments[0]);
  } else {
    renderSubfolder(segments[0], segments[1], segments[2]);
  }
  updateDocumentTitle();
  setTimeout(updateDocumentTitle, 400);
}

/* Seitentitel pro Ansicht (für Screenreader, Tab-Leiste und Verlauf). */
function updateDocumentTitle() {
  const h1 = content.querySelector("h1");
  const name = h1 ? h1.textContent.replace(/\s+/g, " ").trim() : "";
  document.title = name ? name + " – buildspace" : "buildspace";
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);

/* Liquid-Glass-Glanzlicht: folgt der Maus-/Fingerposition auf Karten,
   per Event-Delegation, damit es auch nach jedem Neu-Rendern (Routing)
   ohne erneutes Binden funktioniert. */
function updateGlassHighlight(x, y, target) {
  const el = target.closest(".folder-card, .post-card, .mp-card, .ct-card, .hero-inner, .sidebar, .side-link, .side-result");
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

/* Stern-Symbol auf jeder Karte: Favorit an/aus. Liegt als eigenständiges
   Element NEBEN dem Karten-Link (nicht darin verschachtelt), daher ohne
   Navigations-Konflikt — ein kompletter Re-Render der aktuellen Route
   reicht, um Favoriten-Abschnitt/-Zustand überall aufzufrischen. */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".post-fav-btn");
  if (!btn) return;
  e.preventDefault();
  toggleFavorite(btn.dataset.url);
  render();
});

/* Moderation im Kolleg:innen-Bereich (nur mit vollem Zugang sichtbar
   gerendert, hier zusätzlich noch einmal geprüft): einzelne Bestenlisten-
   Einträge löschen oder alle Rückmeldungen zu einem Werkzeug zurücksetzen. */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".hs-delete-btn");
  if (!btn) return;
  if (!window.Protect || window.Protect.getAccess() !== "full") return;
  if (!confirm("Diesen Eintrag wirklich löschen?")) return;
  window.Protect.loadFirebase()
    .then(({ db }) => db.collection("highscores").doc(btn.dataset.id).delete())
    .then(() => loadHighscoreBlock(btn.dataset.file, true))
    .catch(() => alert("Löschen fehlgeschlagen — bitte später erneut versuchen."));
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".feedback-reset-btn");
  if (!btn) return;
  if (!window.Protect || window.Protect.getAccess() !== "full") return;
  if (!confirm(`Alle Rückmeldungen zu "${btn.dataset.tool}" wirklich löschen?`)) return;
  window.Protect.loadFirebase()
    .then(({ db }) => db.collection("tool_feedback").where("tool", "==", btn.dataset.tool).get())
    .then((snap) => {
      const batch = db.batch();
      snap.forEach((doc) => batch.delete(doc.ref));
      return batch.commit();
    })
    .then(() => renderKollegenFeedback())
    .catch(() => alert("Zurücksetzen fehlgeschlagen — bitte später erneut versuchen."));
});

/* Tastaturkürzel "/" öffnet die Seitenleiste mit fokussierter Suche — nur
   wenn gerade nicht ohnehin in einem Eingabefeld getippt wird. */
document.addEventListener("keydown", (e) => {
  if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
  const active = document.activeElement;
  const isTyping = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
  if (isTyping) return;
  if (document.documentElement.classList.contains("share-mode") || document.documentElement.classList.contains("embed-mode")) return;
  e.preventDefault();
  openSearch();
});
