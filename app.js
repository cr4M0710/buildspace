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
    heroSub: "Materialien, Lernspiele und Tools von Marc Stroh — Mathematik, Arbeitslehre, Handball & Freizeit, gesammelt an einem Ort.",
    greeting: { night: "Noch spät unterwegs", morning: "Guten Morgen", noon: "Schönen Mittag", day: "Guten Tag", evening: "Guten Abend" },
    statPost: (n) => (n === 1 ? "Beitrag" : "Beiträge"),
    statAreas: "Bereiche",
    statNew: "diesen Monat neu",
    searchPlaceholder: "Spiele, Tools & Beiträge durchsuchen…",
    searchLabel: "Beiträge durchsuchen",
    recentTitle: "Zuletzt geöffnet",
    clearRecent: "Verlauf löschen",
    featuredTitle: "Empfohlen",
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
    themeToDark: "Dunkelmodus aktivieren",
    themeToLight: "Hellmodus aktivieren",
    langSwitchTo: "Switch to English",
    langButtonLabel: "EN",
    dateLocale: "de-DE",
    favoritesTitle: "Favoriten",
    favAdd: "Zu Favoriten hinzufügen",
    favRemove: "Von Favoriten entfernen",
    tagFilterClear: "Filter zurücksetzen",
    tagFilterResults: (n) => (n === 1 ? "1 Treffer" : `${n} Treffer`),
    tagFilterEmpty: "Keine Treffer für diese Auswahl.",
    guestLocked: "Nur mit Zugangscode",
    tagLabels: {
      einzelarbeit: "Einzelarbeit", partnerarbeit: "Partnerarbeit", gruppenarbeit: "Gruppenarbeit",
      spiel: "Spiel", tool: "Tool", jg5: "Jahrgang 5", jg6: "Jahrgang 6",
      jg7: "Jahrgang 7", jg10: "Jahrgang 10", vertretung: "Vertretungsstunde"
    },
    folders: { neueste: "Neueste", schule: "Schule", handball: "Handball", freizeit: "Freizeit" },
    subfolders: {
      mathematik: "Mathematik", arbeitslehre: "Arbeitslehre",
      faecheruebergreifend: "Fächerübergreifend", weiterefaecher: "Weitere Fächer",
      sonstiges: "Sonstiges",
      jugend: "Jugend", maenner1: "Männer 1", maenner2: "Männer 2",
      hallendienst: "Hallendienst", training: "Training"
    }
  },
  en: {
    heroSub: "Materials, learning games and tools by Marc Stroh — maths, careers education, handball & leisure, all in one place.",
    greeting: { night: "Up late", morning: "Good morning", noon: "Good midday", day: "Good afternoon", evening: "Good evening" },
    statPost: (n) => (n === 1 ? "post" : "posts"),
    statAreas: "areas",
    statNew: "new this month",
    searchPlaceholder: "Search games, tools & posts…",
    searchLabel: "Search posts",
    recentTitle: "Recently opened",
    clearRecent: "Clear history",
    featuredTitle: "Featured",
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
    themeToDark: "Enable dark mode",
    themeToLight: "Enable light mode",
    langSwitchTo: "Auf Deutsch wechseln",
    langButtonLabel: "DE",
    dateLocale: "en-GB",
    favoritesTitle: "Favourites",
    favAdd: "Add to favourites",
    favRemove: "Remove from favourites",
    tagFilterClear: "Clear filters",
    tagFilterResults: (n) => (n === 1 ? "1 result" : `${n} results`),
    tagFilterEmpty: "No results for this selection.",
    guestLocked: "Access code required",
    tagLabels: {
      einzelarbeit: "Solo", partnerarbeit: "Pairs", gruppenarbeit: "Group",
      spiel: "Game", tool: "Tool", jg5: "Grade 5", jg6: "Grade 6",
      jg7: "Grade 7", jg10: "Grade 10", vertretung: "Substitute-friendly"
    },
    folders: { neueste: "Latest", schule: "School", handball: "Handball", freizeit: "Leisure" },
    subfolders: {
      mathematik: "Mathematics", arbeitslehre: "Vocational Studies",
      faecheruebergreifend: "Cross-curricular", weiterefaecher: "Other subjects",
      sonstiges: "Miscellaneous",
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
        const emojiBadge = p.emoji
          ? `<span class="post-emoji" aria-hidden="true">${p.emoji}</span>`
          : `<span class="post-emoji post-emoji--plain icon-badge--${p.category}" aria-hidden="true">${MINI_ICONS[p.category] || ""}</span>`;
        const title = opts.highlight ? highlightMatch(p.title, opts.highlight) : escapeHtml(p.title);
        const excerpt = opts.highlight ? highlightMatch(p.excerpt, opts.highlight) : escapeHtml(p.excerpt);
        const fav = isFavorite(p0.url);
        const favLabel = fav ? t("favRemove") : t("favAdd");
        return `
      <li class="post-list-item" style="--i:${i}">
        <div class="post-card${opts.featured ? " post-card--featured" : ""}">
          <a class="post-card-link" href="${href}"${linkAttrs} aria-label="${escapeHtml(p.title)}"></a>
          <button type="button" class="post-fav-btn${fav ? " is-active" : ""}" data-url="${escapeHtml(p0.url)}" aria-pressed="${fav}" aria-label="${escapeHtml(favLabel)}" title="${escapeHtml(favLabel)}">${fav ? STAR_GLYPH : STAR_OUTLINE_GLYPH}</button>
          ${emojiBadge}
          <div class="post-card-body">
            <span class="post-tag"><span class="icon-badge icon-badge--${p.category}">${MINI_ICONS[p.category] || ""}</span>${folderStructure[p.category] ? folderLabel(p.category) : p.category}${isNew ? `<span class="badge-new">${t("newBadge")}</span>` : ""}</span>
            <h3>${title}${externalBadge}</h3>
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
   "Zuletzt geöffnet" — merkt sich lokal im Browser (localStorage),
   welche Beiträge zuletzt angeklickt wurden, damit man z. B. über
   mehrere Stunden hinweg dieselbe Klasse schnell wieder zum zuletzt
   gezeigten Spiel zurückführen kann. Rein clientseitig, pro Gerät/
   Browser — daher der gut sichtbare "Verlauf löschen"-Button, weil
   das Gerät oft mit wechselnden Klassen genutzt wird.
--------------------------------------------------------- */
const RECENT_KEY = "myhome_recent_urls_v1";
const RECENT_MAX = 3;

function getRecentUrls() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function recordRecent(url) {
  if (!url) return;
  try {
    const current = getRecentUrls().filter((u) => u !== url);
    current.unshift(url);
    localStorage.setItem(RECENT_KEY, JSON.stringify(current.slice(0, RECENT_MAX)));
  } catch (e) {
    /* localStorage kann in seltenen Fällen blockiert sein (privates
       Fenster o. Ä.) — der Verlauf ist ein Komfortfeature, kein Muss. */
  }
}

function clearRecent() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch (e) {}
}

function getRecentPosts() {
  return getRecentUrls()
    .map((url) => posts.find((p) => p.url === url))
    .filter(Boolean);
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

/* ---------------------------------------------------------
   Tags — zusätzlich zur festen Ordnerstruktur (Kategorie/Unterkategorie)
   können Beiträge in posts-data.js beliebige Tags bekommen, z. B.
   Gruppengröße (Einzel-/Partner-/Gruppenarbeit), Beitragsart (Spiel/Tool)
   oder Jahrgang. Auf der Startseite lassen sie sich als Filter-Chips
   quer über alle Ordner hinweg an- und abwählen. TAG_ORDER legt nur die
   Anzeige-Reihenfolge bekannter Tags fest — neue, dort nicht gelistete
   Tags aus posts-data.js tauchen automatisch (alphabetisch hinten) mit
   auf, auch ohne dass hier etwas ergänzt wird (dann allerdings ohne
   übersetztes Label, siehe tagLabel()).
--------------------------------------------------------- */
const TAG_ORDER = ["einzelarbeit", "partnerarbeit", "gruppenarbeit", "spiel", "tool", "jg5", "jg6"];

function getAllTagIds() {
  const used = new Set();
  posts.forEach((p) => (p.tags || []).forEach((tg) => used.add(tg)));
  const ordered = TAG_ORDER.filter((tg) => used.has(tg));
  const extra = [...used].filter((tg) => !TAG_ORDER.includes(tg)).sort();
  return [...ordered, ...extra];
}

function tagLabel(id) {
  const labels = I18N[getLang()].tagLabels || {};
  return labels[id] || id;
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

  // Im Gast-Zugriff dürfen Favoriten/Verlauf/Empfohlen aus gesperrten
  // Bereichen (z. B. von einer früheren Anmeldung mit vollem Zugriff)
  // nicht auf der Startseite auftauchen.
  const isPostAllowed = (p) => (window.Protect ? window.Protect.isCategoryAllowed(p.category) : true);
  const featured = posts.filter((p) => p.featured && isPostAllowed(p));
  const recentPosts = getRecentPosts().filter(isPostAllowed);
  const favoritePosts = getFavoritePosts().filter(isPostAllowed);
  const tagIds = getAllTagIds();
  // Aktive Tag-Auswahl lebt nur innerhalb dieses Renders (wie das leere
  // Suchfeld bei jedem Seitenaufruf) — kein eigener localStorage-Schlüssel.
  const activeTags = new Set();

  content.innerHTML = `
    <div class="home-search">
      <svg class="home-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      <input type="search" id="site-search" class="home-search-input" placeholder="${escapeHtml(t("searchPlaceholder"))}" autocomplete="off" aria-label="${escapeHtml(t("searchLabel"))}">
      <span class="home-search-hint" id="search-hint" aria-hidden="true">/</span>
    </div>
    ${
      tagIds.length
        ? `<div class="tag-filter-row" id="tag-filter-row">
             ${tagIds.map((id) => `<button type="button" class="tag-chip" data-tag="${escapeHtml(id)}" aria-pressed="false">${escapeHtml(tagLabel(id))}</button>`).join("")}
             <button type="button" class="tag-filter-clear" id="tag-filter-clear" hidden>${escapeHtml(t("tagFilterClear"))}</button>
           </div>`
        : ""
    }
    <div id="search-results" class="search-results" hidden></div>
    <div id="home-normal">
      ${
        favoritePosts.length
          ? `<h2 class="section-label section-label--favorites"><span aria-hidden="true">⭐</span> ${t("favoritesTitle")}</h2>${renderPostList(favoritePosts, { preserveOrder: true })}`
          : ""
      }
      ${
        recentPosts.length
          ? `<div class="section-label-row">
               <h2 class="section-label section-label--recent"><span aria-hidden="true">🕘</span> ${t("recentTitle")}</h2>
               <button type="button" class="clear-recent-btn" id="clear-recent-btn">${t("clearRecent")}</button>
             </div>
             <div id="recent-list">${renderPostList(recentPosts, { preserveOrder: true })}</div>`
          : ""
      }
      ${
        featured.length
          ? `<h2 class="section-label section-label--featured"><span class="sparkle" aria-hidden="true">✨</span> ${t("featuredTitle")}</h2>${renderPostList(featured, { featured: true })}`
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
    </div>
  `;

  const searchInput = document.getElementById("site-search");
  const searchResults = document.getElementById("search-results");
  const homeNormal = document.getElementById("home-normal");
  const searchHint = document.getElementById("search-hint");
  const clearRecentBtn = document.getElementById("clear-recent-btn");
  const tagFilterRow = document.getElementById("tag-filter-row");
  const tagFilterClear = document.getElementById("tag-filter-clear");

  if (clearRecentBtn) {
    clearRecentBtn.addEventListener("click", () => {
      clearRecent();
      renderTopLevel();
    });
  }

  if (searchHint) {
    searchInput.addEventListener("focus", () => { searchHint.hidden = true; });
    searchInput.addEventListener("blur", () => {
      if (!searchInput.value) searchHint.hidden = false;
    });
  }

  /* Text-Suche und Tag-Filter grenzen gemeinsam dieselbe Trefferliste
     ein — beide unabhängig voneinander an- und abschaltbar, damit z. B.
     "Bruch" + "Partnerarbeit" kombiniert werden kann. */
  function updateFilteredView() {
    const raw = searchInput.value.trim();
    const q = raw.toLowerCase();
    if (!q && activeTags.size === 0) {
      searchResults.hidden = true;
      searchResults.innerHTML = "";
      homeNormal.hidden = false;
      return;
    }
    homeNormal.hidden = true;
    searchResults.hidden = false;
    // Suche läuft über den gerade angezeigten (lokalisierten) Text, damit
    // Treffer und sichtbarer Titel/Beschreibung immer zusammenpassen.
    const matches = posts.filter((p0) => {
      if (!isPostAllowed(p0)) return false;
      const p = localizePost(p0);
      const textMatch = !q || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q);
      const tagMatch = activeTags.size === 0 || [...activeTags].every((tg) => (p0.tags || []).includes(tg));
      return textMatch && tagMatch;
    });
    if (!matches.length) {
      searchResults.innerHTML = `<p class="empty-state">${q ? t("searchEmpty")(escapeHtml(raw)) : t("tagFilterEmpty")}</p>`;
      return;
    }
    const heading = q ? t("searchResults")(matches.length, escapeHtml(raw)) : t("tagFilterResults")(matches.length);
    searchResults.innerHTML = `<h2 class="section-label">${heading}</h2>${renderPostList(matches, { highlight: q ? raw : "" })}`;
  }

  searchInput.addEventListener("input", updateFilteredView);

  if (tagFilterRow) {
    tagFilterRow.querySelectorAll(".tag-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const id = chip.dataset.tag;
        const wasActive = activeTags.has(id);
        if (wasActive) activeTags.delete(id);
        else activeTags.add(id);
        chip.classList.toggle("is-active", !wasActive);
        chip.setAttribute("aria-pressed", String(!wasActive));
        if (tagFilterClear) tagFilterClear.hidden = activeTags.size === 0;
        updateFilteredView();
      });
    });
  }

  if (tagFilterClear) {
    tagFilterClear.addEventListener("click", () => {
      activeTags.clear();
      tagFilterRow.querySelectorAll(".tag-chip").forEach((chip) => {
        chip.classList.remove("is-active");
        chip.setAttribute("aria-pressed", "false");
      });
      tagFilterClear.hidden = true;
      updateFilteredView();
    });
  }
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
  breadcrumb.innerHTML = `<a href="#/">${t("home")}</a><span class="sep">›</span><span class="current">${folderLabel(id)}</span>`;

  if (!folder.subfolders.length) {
    const list = posts.filter((p) => p.category === id);
    content.innerHTML = `
      <h1 class="section-label">${folderLabel(id)}</h1>
      ${renderPostList(list)}
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
  const label = sub ? subfolderLabel(subId) : subId;
  breadcrumb.innerHTML = `<a href="#/">${t("home")}</a><span class="sep">›</span><a href="#/${id}">${folderLabel(id)}</a><span class="sep">›</span><span class="current">${label}</span>`;

  const list = posts.filter((p) => p.category === id && p.subcategory === subId);
  content.innerHTML = `
    <h1 class="section-label">${folderLabel(id)} — ${label}</h1>
    ${renderPostList(list)}
  `;
  if (window.Protect) window.Protect.addShareButton(id);
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
  content.innerHTML = `
    <h1 class="section-label">📋 Vertretungsstunde</h1>
    <p style="color:var(--ink-soft); margin-top:-10px; margin-bottom:28px;">Selbsterklärende Lernspiele ohne Vorbereitung — ideal, wenn eine Vertretungskraft ohne Vorwissen eine Klasse übernimmt. Einfach den Link teilen, kein Passwort nötig.</p>
    ${renderPostList(list, { preserveOrder: true })}
  `;
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
    <h1 class="section-label">📚 ${km.title ? escapeHtml(km.title) : "Kursmappe"}</h1>
    ${renderPostList(list, { preserveOrder: true })}
  `;
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
    <h1 class="section-label">🧩 Kursmappe erstellen</h1>
    <p style="color:var(--ink-soft); margin-top:-10px; margin-bottom:20px;">Wähle die Beiträge für diese Stunde aus. Der Link zeigt Lernenden nur genau diese Auswahl — ganz ohne Anmeldung, automatisch zeitlich begrenzt.</p>
    <div class="km-builder">
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
            <span class="km-post-emoji">${p.emoji || ""}</span>
            <span class="km-post-title">${escapeHtml(p.title)}</span>
            <span class="km-post-meta">${folderLabel(p.category)}${p.subcategory ? " · " + subfolderLabel(p.subcategory) : ""}</span>
          </label>`
          )
          .join("")}
      </div>
      <button type="button" class="protect-submit" id="km-generate" style="max-width:280px;">Link erstellen</button>
      <div id="km-link-area" style="display:none; margin-top:18px;">
        <div class="protect-link-row">
          <input type="text" id="km-link-out" readonly />
          <button class="protect-copy-btn" id="km-copy-btn">Kopieren</button>
        </div>
        <div class="protect-error" id="km-copy-msg" style="color:#2F6F4F;"></div>
        <div class="protect-qr-wrap" id="km-qr-wrap"></div>
      </div>
    </div>
  `;

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
  breadcrumb.innerHTML = `<a href="#/">${t("home")}</a><span class="sep">›</span><span class="current">Kolleg:innen</span>`;
  content.innerHTML = `
    <h1 class="section-label">🤝 Kolleg:innen-Bereich</h1>
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
    </div>
  `;
}

function renderKollegenFeedback() {
  breadcrumb.innerHTML = `<a href="#/">${t("home")}</a><span class="sep">›</span><a href="#/kollegen">Kolleg:innen</a><span class="sep">›</span><span class="current">Feedback-Auswertung</span>`;
  content.innerHTML = `
    <h1 class="section-label">📊 Feedback-Auswertung</h1>
    <p style="color:var(--ink-soft); margin-top:-10px; margin-bottom:20px;">Rückmeldungen (👍/👎), die Lernende auf den einzelnen Werkzeug-Seiten abgegeben haben.</p>
    <div id="feedback-agg-list"><p class="empty-state">Lade Rückmeldungen …</p></div>
  `;
  if (!window.Protect || typeof window.Protect.loadFirebase !== "function") return;
  window.Protect.loadFirebase()
    .then(({ db }) => db.collection("tool_feedback").get())
    .then((snap) => {
      const agg = {};
      snap.forEach((doc) => {
        const d = doc.data();
        if (!d || !d.tool) return;
        if (!agg[d.tool]) agg[d.tool] = { up: 0, down: 0 };
        if (d.vote === "up") agg[d.tool].up++;
        else if (d.vote === "down") agg[d.tool].down++;
      });
      const rows = Object.keys(agg).sort((a, b) => agg[b].up + agg[b].down - (agg[a].up + agg[a].down));
      const el = document.getElementById("feedback-agg-list");
      if (!el) return;
      if (!rows.length) {
        el.innerHTML = '<p class="empty-state">Noch keine Rückmeldungen.</p>';
        return;
      }
      el.innerHTML =
        '<table class="feedback-table"><thead><tr><th>Werkzeug</th><th>👍</th><th>👎</th></tr></thead><tbody>' +
        rows.map((tool) => `<tr><td>${escapeHtml(tool)}</td><td>${agg[tool].up}</td><td>${agg[tool].down}</td></tr>`).join("") +
        "</tbody></table>";
    })
    .catch(() => {
      const el = document.getElementById("feedback-agg-list");
      if (el) el.innerHTML = '<p class="empty-state">Konnte Rückmeldungen nicht laden (Firestore-Regeln prüfen).</p>';
    });
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

  const subEl = document.getElementById("hero-sub");
  if (subEl) subEl.textContent = t("heroSub");

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
   Dunkel-/Hellmodus-Umschalter oben rechts. Folgt standardmäßig der
   Systemeinstellung (siehe style.css); ein Klick merkt sich eine
   bewusste Wahl in localStorage und überschreibt das per data-theme
   auf <html>, bis der Umschalter erneut betätigt wird.
--------------------------------------------------------- */
const THEME_KEY = "myhome_theme";
const SUN_GLYPH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"/></svg>';
const MOON_GLYPH = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.7 14.9A8.7 8.7 0 0 1 9.1 3.3a.6.6 0 0 0-.7-.8A9.9 9.9 0 1 0 21.5 15.6a.6.6 0 0 0-.8-.7z"/></svg>';

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (e) {
    return null;
  }
}

function getSystemTheme() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getEffectiveTheme() {
  return getStoredTheme() || getSystemTheme();
}

function applyThemeAttribute(theme) {
  if (theme) {
    document.documentElement.setAttribute("data-theme", theme);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function updateThemeToggleUI() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const effective = getEffectiveTheme();
  const label = effective === "dark" ? t("themeToLight") : t("themeToDark");
  btn.setAttribute("aria-label", label);
  btn.title = label;
  btn.innerHTML = effective === "dark" ? SUN_GLYPH : MOON_GLYPH;
}

function toggleTheme() {
  const next = getEffectiveTheme() === "dark" ? "light" : "dark";
  setThemeStorage(next);
  applyThemeAttribute(next);
  updateThemeToggleUI();
}

function setThemeStorage(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {}
}

function initTheme() {
  applyThemeAttribute(getStoredTheme());
  updateThemeToggleUI();
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.addEventListener("click", toggleTheme);
}

/* ---------------------------------------------------------
   Sprachumschalter oben rechts (DE/EN) — siehe I18N weiter oben.
   Ändert nur die Oberflächensprache dieser Startseite/SPA; die
   einzelnen Spiel-/Tool-Seiten bleiben deutsch.
--------------------------------------------------------- */
function updateLangToggleUI() {
  const btn = document.getElementById("lang-toggle");
  const labelEl = document.getElementById("lang-toggle-label");
  if (!btn) return;
  const label = t("langSwitchTo");
  btn.setAttribute("aria-label", label);
  btn.title = label;
  if (labelEl) labelEl.textContent = t("langButtonLabel");
  document.documentElement.lang = getLang();
}

function toggleLang() {
  setLang(getLang() === "de" ? "en" : "de");
  updateLangToggleUI();
  updateThemeToggleUI();
  initHero();
  render();
}

function initLang() {
  updateLangToggleUI();
  const btn = document.getElementById("lang-toggle");
  if (btn) btn.addEventListener("click", toggleLang);
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initLang();
  initHero();
});

/* ---------------------------------------------------------
   Service Worker — macht buildspace installierbar (siehe
   site.webmanifest) und auch offline nutzbar, z. B. bei schwachem
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
function updateAdminNavLinks() {
  const access = window.Protect ? window.Protect.getAccess() : null;
  const kollegenLink = document.getElementById("kollegen-nav-link");
  const kursmappeLink = document.getElementById("kursmappe-nav-link");
  if (kollegenLink) kollegenLink.style.display = access === "full" || access === "kollegen" ? "" : "none";
  if (kursmappeLink) kursmappeLink.style.display = access === "full" ? "" : "none";
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
  updateAdminNavLinks();
  const segments = parseHash();
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
  } else if (segments[0] === "kollegen") {
    renderKollegen(segments[1]);
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

/* Merkt sich per Klick auf eine Beitragskarte den Verlauf für "Zuletzt
   geöffnet" — per Event-Delegation, damit es unabhängig davon greift,
   welche Liste gerade gerendert ist (Neueste, Kategorie, Suche, …). */
document.addEventListener("click", (e) => {
  const link = e.target.closest(".post-card-link");
  if (!link) return;
  // Während einer Freigabe (Kursmappe/Vertretungsstunde) hängt an jedem
  // Link zusätzlich deren Kennung dran (siehe renderPostList) — im
  // Verlauf soll aber weiterhin die reine Beitrags-URL landen, damit sie
  // sich mit posts-data.js abgleichen lässt.
  const href = (link.getAttribute("href") || "").split("?")[0];
  recordRecent(href);
});

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

/* Tastaturkürzel "/" springt ins Suchfeld auf der Startseite — nur wenn
   gerade nicht ohnehin in einem Eingabefeld getippt wird. */
document.addEventListener("keydown", (e) => {
  if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
  const active = document.activeElement;
  const isTyping = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
  if (isTyping) return;
  const searchInput = document.getElementById("site-search");
  if (!searchInput) return;
  e.preventDefault();
  searchInput.focus();
});
