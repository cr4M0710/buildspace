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
    color: "var(--c-schule)",
    icon: ICONS.schule,
    subfolders: [
      { id: "mathematik" },
      { id: "arbeitslehre" },
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
    folders: { neueste: "Neueste", schule: "Schule", handball: "Handball", freizeit: "Freizeit" },
    subfolders: {
      mathematik: "Mathematik", arbeitslehre: "Arbeitslehre", sonstiges: "Sonstiges",
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
    folders: { neueste: "Latest", schule: "School", handball: "Handball", freizeit: "Leisure" },
    subfolders: {
      mathematik: "Mathematics", arbeitslehre: "Vocational Studies", sonstiges: "Miscellaneous",
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
        const isNew = p0.date === newestDate;
        const emojiBadge = p.emoji
          ? `<span class="post-emoji" aria-hidden="true">${p.emoji}</span>`
          : `<span class="post-emoji post-emoji--plain icon-badge--${p.category}" aria-hidden="true">${MINI_ICONS[p.category] || ""}</span>`;
        const title = opts.highlight ? highlightMatch(p.title, opts.highlight) : escapeHtml(p.title);
        const excerpt = opts.highlight ? highlightMatch(p.excerpt, opts.highlight) : escapeHtml(p.excerpt);
        return `
      <li class="post-list-item" style="--i:${i}">
        <a class="post-card${opts.featured ? " post-card--featured" : ""}" href="${p.url}"${linkAttrs}>
          ${emojiBadge}
          <div class="post-card-body">
            <span class="post-tag"><span class="icon-badge icon-badge--${p.category}">${MINI_ICONS[p.category] || ""}</span>${folderStructure[p.category] ? folderLabel(p.category) : p.category}${isNew ? `<span class="badge-new">${t("newBadge")}</span>` : ""}</span>
            <h3>${title}${externalBadge}</h3>
            <p class="post-excerpt">${excerpt}</p>
            <span class="post-meta">${formatDate(p.date)}</span>
          </div>
        </a>
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
  ];

  const featured = posts.filter((p) => p.featured);
  const recentPosts = getRecentPosts();

  content.innerHTML = `
    <div class="home-search">
      <svg class="home-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      <input type="search" id="site-search" class="home-search-input" placeholder="${escapeHtml(t("searchPlaceholder"))}" autocomplete="off" aria-label="${escapeHtml(t("searchLabel"))}">
      <span class="home-search-hint" id="search-hint" aria-hidden="true">/</span>
    </div>
    <div id="search-results" class="search-results" hidden></div>
    <div id="home-normal">
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
          .map(
            (c, i) => `
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

  searchInput.addEventListener("input", () => {
    const raw = searchInput.value.trim();
    const q = raw.toLowerCase();
    if (!q) {
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
      const p = localizePost(p0);
      return p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q);
    });
    searchResults.innerHTML = matches.length
      ? `<h2 class="section-label">${t("searchResults")(matches.length, escapeHtml(raw))}</h2>${renderPostList(matches, { highlight: raw })}`
      : `<p class="empty-state">${t("searchEmpty")(escapeHtml(raw))}</p>`;
  });
}

function renderNeueste() {
  if (window.Protect) window.Protect.removeShareButton();
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

/* Merkt sich per Klick auf eine Beitragskarte den Verlauf für "Zuletzt
   geöffnet" — per Event-Delegation, damit es unabhängig davon greift,
   welche Liste gerade gerendert ist (Neueste, Kategorie, Suche, …). */
document.addEventListener("click", (e) => {
  const link = e.target.closest("a.post-card");
  if (!link) return;
  recordRecent(link.getAttribute("href"));
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
