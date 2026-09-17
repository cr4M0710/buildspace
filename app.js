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

const ICONS = {
  neueste: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" stroke-linecap="round"/></svg>',
  schule: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M3 9l9-4 9 4-9 4-9-4z" stroke-linejoin="round"/><path d="M7 11v5c0 1.1 2.2 2 5 2s5-.9 5-2v-5" stroke-linejoin="round"/></svg>',
  handball: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 4c2 2.5 2 13 0 16M6 7c3 1.5 9 1.5 12 0M6 17c3-1.5 9-1.5 12 0"/></svg>',
  freizeit: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M12 21s-7-4.5-7-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.5-7 10-7 10" stroke-linejoin="round" stroke-linecap="round"/></svg>'
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
      { id: "hallendienst", label: "Hallendienst" }
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

function dotClassFor(category) {
  return "dot-" + category;
}

function renderPostList(list) {
  if (!list.length) {
    return '<p class="empty-state">Hier gibt es noch keine Beiträge.</p>';
  }
  const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
  return (
    '<ul class="post-list">' +
    sorted
      .map(
        (p) => `
      <li>
        <a class="post-card" href="${p.url}">
          <span class="post-tag"><span class="dot ${dotClassFor(p.category)}" style="background:${folderStructure[p.category] ? folderStructure[p.category].color : "var(--ink-soft)"}"></span>${folderStructure[p.category] ? folderStructure[p.category].label : p.category}</span>
          <h3>${p.title}</h3>
          <p class="post-excerpt">${p.excerpt}</p>
          <span class="post-meta">${formatDate(p.date)}</span>
        </a>
      </li>`
      )
      .join("") +
    "</ul>"
  );
}

function renderTopLevel() {
  breadcrumb.innerHTML = "";
  const cards = [
    { href: "#/neueste", label: "Neueste", color: "var(--c-neueste)", icon: ICONS.neueste, count: posts.filter((p) => isWithinLast30Days(p.date)).length },
    ...Object.entries(folderStructure).map(([id, f]) => ({
      href: `#/${id}`,
      label: f.label,
      color: f.color,
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
          <span class="folder-icon" style="background:${c.color}">${c.icon}</span>
          <h2>${c.label}</h2>
          <span class="folder-count">${c.count === 1 ? "1 Beitrag" : c.count + " Beiträge"}</span>
        </a>`
        )
        .join("")}
    </div>
  `;
}

function renderNeueste() {
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
  breadcrumb.innerHTML = `<a href="#/">Start</a><span class="sep">›</span><span class="current">${folder.label}</span>`;

  if (!folder.subfolders.length) {
    const list = posts.filter((p) => p.category === id);
    content.innerHTML = `
      <h1 class="section-label">${folder.label}</h1>
      ${renderPostList(list)}
    `;
    return;
  }

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
          <span class="folder-icon" style="background:${folder.color}">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><circle cx="12" cy="12" r="4"/></svg>
          </span>
          <h2>${c.label}</h2>
          <span class="folder-count">${c.count} Beitrag${c.count === 1 ? "" : "e"}</span>
        </a>`
        )
        .join("")}
    </div>
  `;
}

function renderSubfolder(id, subId) {
  const folder = folderStructure[id];
  if (!folder) {
    renderTopLevel();
    return;
  }
  const sub = folder.subfolders.find((s) => s.id === subId);
  const label = sub ? sub.label : subId;
  breadcrumb.innerHTML = `<a href="#/">Start</a><span class="sep">›</span><a href="#/${id}">${folder.label}</a><span class="sep">›</span><span class="current">${label}</span>`;

  const list = posts.filter((p) => p.category === id && p.subcategory === subId);
  content.innerHTML = `
    <h1 class="section-label">${folder.label} — ${label}</h1>
    ${renderPostList(list)}
  `;
}

function render() {
  const segments = parseHash();
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
