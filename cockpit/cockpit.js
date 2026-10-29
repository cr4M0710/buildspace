/* =====================================================================
   Cockpit 2.0 – Programmlogik
   Läuft als Web-App (buildspaceos.de/cockpit) und in der Mac-App
   (pywebview, Brücke window.pywebview.api = NATIVE).
   Gliederung: Grundlagen · Apps & Öffnen · Start-Widgets · Kalender ·
   Projekte · Gespeichert · Whiteboard · Dateien · Mitteilungen · Suche ·
   Einstellungen · Start
   ===================================================================== */
function cockpitMain() {
'use strict';
const APP_VERSION = '2.6';
const NATIVE = window.NATIVE || null;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ic = (id, c = 'i') => `<svg class="${c}"><use href="#i-${id}"/></svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const isoDay = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDay = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const hm = t => new Date(t * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
const FMT_DAY = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

/* ---------- Speicher ----------
   Mac-App: alles in ~/Library/Application Support/Cockpit/state.json (über NATIVE),
   Browser: localStorage. Große Dateien liegen getrennt (siehe Dateien). */
const MEM = window.NATIVE_STATE || {};
if (NATIVE && !Object.keys(MEM).length) {
  try {
    let n = 0;
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('cockpit:')) { try { MEM[k.slice(8)] = JSON.parse(localStorage.getItem(k)); n++; } catch (e) {} } }
    if (n) { window.__cockpitMigrated = n; setTimeout(() => { try { NATIVE.save_state(MEM); } catch (e) {} }, 300); }
  } catch (e) {}
}
let saveTimer = null, saveWarned = false;
const saveFailed = () => { if (!saveWarned) { saveWarned = true; setTimeout(() => toast('Speichern hat nicht geklappt – Änderungen könnten verloren gehen'), 0); } };
const flushNative = () => { clearTimeout(saveTimer); saveTimer = null; return NATIVE.save_state(MEM).then(ok => { if (ok === false) saveFailed(); return ok; }, () => { saveFailed(); return false; }); };
const store = NATIVE ? {
  get(k, d) { return MEM[k] === undefined ? d : JSON.parse(JSON.stringify(MEM[k])); },
  set(k, v) { MEM[k] = v; clearTimeout(saveTimer); saveTimer = setTimeout(flushNative, 120); }
} : {
  get(k, d) { try { const v = localStorage.getItem('cockpit:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('cockpit:' + k, JSON.stringify(v)); } catch (e) { saveFailed(); } }
};
/* Synchronisieren: jede Änderung meldet sich (siehe SYNCHRONISIEREN); rawSet schreibt ohne Meldung */
let onStoreSet = null;
const rawSet = store.set.bind(store), rawGet = k => store.get(k, undefined);
store.set = (k, v) => { rawSet(k, v); if (onStoreSet) try { onStoreSet(k); } catch (e) {} };
window.__cockpitFlush = () => (NATIVE && saveTimer ? flushNative() : true);
window.__cockpitPending = () => !!(NATIVE && saveTimer);
if (!NATIVE && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* ---------- Rückmeldungen & Fenster ---------- */
function toast(msg, icon = 'check') { $$('.toast').forEach(t => t.remove()); const t = document.createElement('div'); t.className = 'toast glass'; t.setAttribute('role', 'status'); t.innerHTML = ic(icon, 'i sm') + esc(msg); document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
function modal(html) { $('#ov').innerHTML = `<div class="scrim" id="scrim">${html}</div>`; $('#scrim').addEventListener('mousedown', e => { if (e.target.id === 'scrim') close(); }); $$('[data-close]').forEach(b => b.onclick = close); }
function close() { $('#ov').innerHTML = ''; }
async function copy(t) { if (NATIVE) { try { return !!(await NATIVE.copy(t)); } catch (e) { return false; } } try { await navigator.clipboard.writeText(t); return true; } catch (e) { return false; } }
function loadImg(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
function loadScript(src) { return new Promise((res, rej) => { if ($(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Skript fehlt: ' + src)); document.head.appendChild(s); }); }
function pickFiles(accept, multiple) { return new Promise(res => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept; inp.multiple = !!multiple; inp.onchange = () => res([...(inp.files || [])]); inp.click(); }); }
function blobToDataUrl(b) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); }); }
async function dataUrlToBlob(u) { const r = await fetch(u); return r.blob(); }
/* Datei an die Person geben: Browser = Download, Mac-App = Ordner „Downloads“ */
async function deliverFile(name, dataUrl) {
  if (NATIVE) { const r = await NATIVE.save_download(name, dataUrl); if (r && r.ok) toast(`Gespeichert in „Downloads“: ${r.name}`, 'download'); else toast((r && r.error) || 'Speichern fehlgeschlagen', 'x'); return; }
  const a = document.createElement('a'); a.href = dataUrl.startsWith('data:') ? URL.createObjectURL(await dataUrlToBlob(dataUrl)) : dataUrl; a.download = name; document.body.appendChild(a); a.click(); a.remove(); toast('Download gestartet', 'download');
}

/* =====================================================================
   APPS & ÖFFNEN
   ===================================================================== */
const GROUPS = [
  { id: 'schule', name: 'Schule & Unterricht' },
  { id: 'planung', name: 'Planen & Kommunizieren' },
  { id: 'ki', name: 'KI & Schreiben' },
  { id: 'verwaltung', name: 'Geräteverwaltung' },
  { id: 'eigene', name: 'Eigene Projekte' }
];
const COLORS = ['#4F7BFF', '#A46BFF', '#F25FB0', '#FF9A4D', '#E0B24A', '#2FA36B', '#2DD4BF', '#D97757', '#64748B', '#EF4444', '#25D366'];
const ICONS = ['school', 'cal', 'list', 'mail', 'pen', 'sparkle', 'bubble', 'phonechat', 'grid', 'book', 'board', 'tablet', 'cap', 'rocket', 'globe', 'note', 'bolt', 'whiteboard', 'chart', 'link'];
const DEFAULT_APPS = [
  { id: 'iserv', name: 'IServ', sub: 'Schulserver', group: 'schule', icon: 'school', color: '#2FA36B', type: 'web', target: '', hint: 'Adresse deiner Schule, z. B. https://deine-schule.de/iserv' },
  { id: 'untis', name: 'WebUntis', sub: 'Stundenplan', group: 'schule', icon: 'grid', color: '#FF9A4D', type: 'web', target: 'https://webuntis.com/', mac: { name: 'Untis Mobile' } },
  { id: 'idoceo', name: 'iDoceo', sub: 'Lehrerkalender', group: 'schule', icon: 'book', color: '#4F7BFF', type: 'shortcut', target: 'Cockpit iDoceo', mac: { name: 'iDoceo' } },
  { id: 'edumaps', name: 'Edumaps', sub: 'Pinnwände', group: 'schule', icon: 'board', color: '#A46BFF', type: 'web', target: 'https://www.edumaps.de/' },
  { id: 'kalender', name: 'Kalender', sub: 'Termine', group: 'planung', icon: 'cal', color: '#EF4444', type: 'shortcut', target: 'Cockpit Kalender', mac: { bundle: 'com.apple.iCal', name: 'Kalender' } },
  { id: 'erinnerungen', name: 'Erinnerungen', sub: 'Aufgaben', group: 'planung', icon: 'list', color: '#E0B24A', type: 'shortcut', target: 'Cockpit Erinnerungen', mac: { bundle: 'com.apple.reminders', name: 'Erinnerungen' } },
  { id: 'mail', name: 'Mail', sub: 'Postfach', group: 'planung', icon: 'mail', color: '#2DD4BF', type: 'shortcut', target: 'Cockpit Mail', mac: { bundle: 'com.apple.mail', name: 'Mail' } },
  { id: 'whatsapp', name: 'WhatsApp', sub: 'Nachrichten', group: 'planung', icon: 'phonechat', color: '#25D366', type: 'web', target: 'https://web.whatsapp.com/', mac: { name: 'WhatsApp' } },
  { id: 'claude', name: 'Claude', sub: 'KI-Assistent', group: 'ki', icon: 'sparkle', color: '#D97757', type: 'web', target: 'https://claude.ai/new' },
  { id: 'chatgpt', name: 'ChatGPT', sub: 'KI-Assistent', group: 'ki', icon: 'bubble', color: '#10a37f', type: 'web', target: 'https://chatgpt.com/' },
  { id: 'deepl', name: 'DeepL Write', sub: 'Texte verbessern', group: 'ki', icon: 'pen', color: '#1b4d8f', type: 'web', target: 'https://www.deepl.com/write' },
  { id: 'jamf', name: 'Jamf', sub: 'iPad-Verwaltung', group: 'verwaltung', icon: 'tablet', color: '#64748B', type: 'web', target: '', hint: 'Adresse eurer Jamf-Instanz, z. B. https://eure-schule.jamfcloud.com' },
  { id: 'asm', name: 'Apple School Manager', sub: 'Accounts & Geräte', group: 'verwaltung', icon: 'cap', color: '#94a3b8', type: 'web', target: 'https://school.apple.com/' },
  { id: 'buildspace', name: 'buildspace', sub: 'Meine Tools', group: 'eigene', icon: 'rocket', color: '#A46BFF', type: 'web', target: 'https://buildspaceos.de/' }
];
let apps = store.get('apps', null) || DEFAULT_APPS.map(a => ({ ...a }));
/* Neue Standard-Apps (z. B. WhatsApp) einmalig zu bestehenden Listen hinzufügen */
(() => {
  const known = store.get('appsKnown', apps.map(a => a.id).concat(store.get('apps', null) ? [] : DEFAULT_APPS.map(a => a.id)));
  let changed = false;
  DEFAULT_APPS.forEach(d => { if (!known.includes(d.id)) { if (!apps.some(a => a.id === d.id)) { apps.push({ ...d }); changed = true; } known.push(d.id); } });
  apps.forEach(a => { const d = DEFAULT_APPS.find(x => x.id === a.id); if (d && d.mac && !a.mac) a.mac = { ...d.mac }; });
  store.set('appsKnown', known); if (changed) store.set('apps', apps);
})();
let usage = store.get('usage', {});
const saveApps = () => store.set('apps', apps);
const needsSetup = a => a.type === 'web' && !/^https?:\/\/.+/i.test(a.target || '');
const shortcutUrl = (name, text) => 'shortcuts://run-shortcut?name=' + encodeURIComponent(name) + (text != null ? '&input=text&text=' + encodeURIComponent(text) : '');

/* Öffnen mit sichtbarer Rückmeldung.
   Mac-App: ausschließlich über die Python-Brücke (im Fenster selbst würde window.open nichts tun).
   Browser: window.open direkt im Klick; wird es blockiert, erscheint ein Link zum Antippen. */
async function openUrl(u, label) {
  label = label || 'Seite';
  if (NATIVE) {
    try { const r = await NATIVE.open_url(u); if (r && r.ok) { toast(`${label} wird geöffnet`, 'ext'); return true; } toast((r && r.error) || `${label} ließ sich nicht öffnen`, 'x'); }
    catch (e) { toast(`${label} ließ sich nicht öffnen`, 'x'); }
    return false;
  }
  if (!/^https?:/i.test(u)) { location.href = u; toast(`${label} wird gestartet`, 'ext'); return true; }
  const w = window.open(u, '_blank');
  if (w) { try { w.opener = null; } catch (e) {} toast(`${label} wird geöffnet`, 'ext'); return true; }
  modal(`<div class="glass modal"><h3>${esc(label)} öffnen</h3><p class="lead">Der Browser hat das neue Fenster blockiert. Tipp hier, um ${esc(label)} zu öffnen:</p><div class="row" style="justify-content:flex-start"><a class="btn pri" href="${esc(u)}" target="_blank" rel="noopener" id="fbLink">${ic('ext', 'i sm')} ${esc(label)} öffnen</a><button class="btn" data-close>Abbrechen</button></div></div>`);
  $('#fbLink').addEventListener('click', () => setTimeout(close, 100));
  return false;
}
const IS_MAC_BROWSER = !NATIVE && /Macintosh/.test(navigator.userAgent) && !('ontouchend' in document);
const MAC_APP_URL = 'https://buildspaceos.de/#/programme/cockpit';
function macAppOnly(what, view) {
  modal(`<div class="glass modal" role="dialog" aria-label="Nur in der Mac-App"><div class="mh"><h3>${esc(what)} gibt es in der Mac-App</h3><button class="orb sm" data-close aria-label="Schließen">${ic('x', 'i xs')}</button></div>
    <p class="lead">Du nutzt gerade Cockpit im Browser. ${view === 'whatsapp' ? 'Im Browser lässt WhatsApp sich nicht ins Cockpit einbetten – dort öffnet es nur in einem eigenen Fenster.' : 'Im Browser blockieren die Kalender-Server das Laden.'} In der <b>Mac-App</b> läuft es direkt im Cockpit.</p>
    <ol class="steps"><li>Mac-App installiert? Dann <b>In der Mac-App öffnen</b>. Deine Einstellungen holst du mit <i>Einstellungen › Übertragen</i> rüber.</li><li>Noch nicht? <b>Mac-App laden</b>, ZIP entpacken, Installieren.command doppelklicken.</li></ol>
    <div class="row"><button class="btn" id="maLoad">${ic('download', 'i sm')} Mac-App laden</button>${view === 'whatsapp' ? `<button class="btn" id="maWeb">${ic('ext', 'i sm')} WhatsApp Web im Browser</button>` : ''}<button class="btn pri" id="maOpen">${ic('rocket', 'i sm')} In der Mac-App öffnen</button></div></div>`);
  $('#maLoad').onclick = () => { close(); openUrl(MAC_APP_URL, 'buildspace'); };
  $('#maOpen').onclick = () => { close(); location.href = 'cockpit://' + (view || 'start'); setTimeout(() => toast('Öffnet sich nichts? Dann ist die Mac-App noch nicht installiert (ab Version 2.5).', 'x'), 2500); };
  $('#maWeb')?.addEventListener('click', () => { close(); store.set('waWebOk', true); openUrl('https://web.whatsapp.com/', 'WhatsApp Web'); });
}
async function openApp(a, srcEl) {
  if (IS_MAC_BROWSER && a && a.id === 'whatsapp' && !store.get('waWebOk', false)) { macAppOnly('WhatsApp im Cockpit', 'whatsapp'); return; }
  if (NATIVE && a && a.id === 'whatsapp') { usage[a.id] = (usage[a.id] || 0) + 1; store.set('usage', usage); go('whatsapp'); return; }
  if (!a) return;
  if (needsSetup(a)) { editor(a); toast(`Trag zuerst die Adresse für ${a.name} ein`, 'edit'); return; }
  if (srcEl) { srcEl.classList.remove('opening'); void srcEl.offsetWidth; srcEl.classList.add('opening'); }
  usage[a.id] = (usage[a.id] || 0) + 1; store.set('usage', usage);
  setTimeout(renderApps, 500);
  if (NATIVE) {
    if (a.type === 'mac' || a.mac) {
      const spec = a.type === 'mac' ? { name: a.target } : a.mac;
      const r = await NATIVE.open_app(spec).catch(() => ({ ok: false }));
      if (r && r.ok) { toast(`${a.name} wird geöffnet`, 'ext'); return; }
      if (a.type === 'web') return openUrl(a.target, a.name);         // App fehlt → Webseite
      if (a.type === 'shortcut') return openUrl(shortcutUrl(a.target), a.name);
      toast((r && r.error) || `${a.name} ist auf diesem Mac nicht installiert`, 'x'); return;
    }
    return openUrl(a.type === 'shortcut' ? shortcutUrl(a.target) : a.target, a.name);
  }
  if (a.type === 'mac') { toast(`${a.name} lässt sich nur in der Mac-App öffnen`, 'x'); return; }
  if (a.type === 'shortcut') { location.href = shortcutUrl(a.target); toast(`Kurzbefehl „${a.target}“ wird gestartet`, 'bolt'); return; }
  openUrl(a.target, a.name);
}

/* =====================================================================
   PERSÖNLICH · AUSSEHEN · WIDGETS
   ===================================================================== */
const BG_PRESETS = [
  { id: 'horizont', name: 'Horizont', css: 'url("bg.jpg")' },
  { id: 'nordlicht', name: 'Nordlicht', css: 'radial-gradient(120% 80% at 20% 0%, #1f8f7a 0%, transparent 55%), radial-gradient(90% 70% at 85% 15%, #5b3bd6 0%, transparent 60%), radial-gradient(120% 90% at 50% 120%, #0b3d5c 0%, transparent 60%), linear-gradient(180deg, #050a14, #071019)' },
  { id: 'morgenrot', name: 'Morgenrot', css: 'radial-gradient(110% 70% at 80% 100%, #ff7a3d 0%, transparent 55%), radial-gradient(90% 70% at 10% 90%, #d63b7a 0%, transparent 60%), radial-gradient(120% 80% at 50% -10%, #2a1a4a 0%, transparent 70%), linear-gradient(180deg, #120a1c, #1d0d17)' },
  { id: 'ozean', name: 'Ozean', css: 'radial-gradient(100% 70% at 30% 10%, #1e5bd6 0%, transparent 55%), radial-gradient(100% 80% at 90% 90%, #0a8fb0 0%, transparent 55%), linear-gradient(180deg, #040b1c, #031424)' },
  { id: 'wald', name: 'Wald', css: 'radial-gradient(100% 70% at 15% 20%, #2f7d4a 0%, transparent 55%), radial-gradient(90% 80% at 85% 85%, #6b8f2a 0%, transparent 55%), linear-gradient(180deg, #050d08, #0b140b)' },
  { id: 'graphit', name: 'Graphit', css: 'radial-gradient(90% 60% at 50% 0%, #3a3d4a 0%, transparent 65%), linear-gradient(180deg, #0c0d12, #050507)' }
];
const ACCENTS = { blue: ['#4F7BFF', '#A46BFF'], violet: ['#A46BFF', '#F25FB0'], magenta: ['#F25FB0', '#FF9A4D'], orange: ['#FF9A4D', '#F25FB0'], green: ['#34C759', '#2DD4BF'], teal: ['#2DD4BF', '#4F7BFF'] };
const ACCENT_NAMES = { blue: 'Blau', violet: 'Violett', magenta: 'Magenta', orange: 'Orange', green: 'Grün', teal: 'Türkis' };
const LOOK_DEFAULT = { bg: 'horizont', blur: 26, glass: 6.5, dim: 45, accent: 'blue' };
const ICON_COLORS = [['#4F7BFF', '#A46BFF'], ['#A46BFF', '#F25FB0'], ['#FF9A4D', '#F25FB0'], ['#34C759', '#2DD4BF'], ['#EF4444', '#FF9A4D'], ['#E0B24A', '#FF9A4D'], ['#2DD4BF', '#4F7BFF'], ['#334155', '#64748B']];
const ICON_SYMS = ['rocket', 'school', 'book', 'cap', 'sparkle', 'star', 'heart', 'flag', 'bolt', 'grid', 'board', 'globe', 'pen', 'user'];
const PROFILE_DEFAULT = { name: '', title: 'Cockpit', icon: { kind: 'logo', color: 0, sym: 'rocket', text: '' } };
const WIDGETS = [
  { id: 'clock', name: 'Uhr', desc: 'Große Uhrzeit oben rechts', icon: 'clock', color: '#64748B', sel: '#clock' },
  { id: 'quick', name: 'KI-Schnellzeile', desc: 'Text an Claude, ChatGPT, DeepL, WhatsApp, als Projekt, Erinnerung oder Notiz', icon: 'sparkle', color: '#D97757', sel: '#w-quick' },
  { id: 'dock', name: 'Schnellstart', desc: 'Die sechs meistgenutzten Apps', icon: 'bolt', color: '#E0B24A', sel: '#w-dock' },
  { id: 'groups', name: 'App-Bereiche', desc: 'Alle Kacheln nach Bereichen', icon: 'grid', color: '#4F7BFF', sel: '#w-groupsCard' },
  { id: 'today', name: 'Heute', desc: 'Deine Termine des Tages als Zeitleiste', icon: 'cal', color: '#EF4444', sel: '#w-today' },
  { id: 'projects', name: 'Projekte', desc: 'Überblick über In Planung · In Bearbeitung · Fertig', icon: 'kanban', color: '#4F7BFF', sel: '#w-projects' },
  { id: 'whatsapp', name: 'WhatsApp', desc: 'Ungelesene Chats (nur Mac-App)', icon: 'phonechat', color: '#25D366', sel: '#w-whatsapp', nativeOnly: true },
  { id: 'stats', name: 'buildspace-Aufrufe', desc: 'Wie oft deine Website besucht wurde', icon: 'chart', color: '#A46BFF', sel: '#w-stats' },
  { id: 'notes', name: 'Notizen & To-dos', desc: 'Schnelle Notizen zum Abhaken', icon: 'note', color: '#2FA36B', sel: '#w-notes' },
  { id: 'saved', name: 'Gespeichert', desc: 'Zuletzt gespeicherte Links', icon: 'bookmark', color: '#E0B24A', sel: '#w-saved' },
  { id: 'timer', name: 'Timer', desc: 'Für Arbeitsphasen, auch groß für den Beamer', icon: 'timer', color: '#A46BFF', sel: '#w-timer' },
  { id: 'countdown', name: 'Countdown', desc: 'Tage bis Ferien, Konferenz, Abgabe …', icon: 'flag', color: '#F25FB0', sel: '#w-countdown' },
  { id: 'tips', name: 'Gut zu wissen', desc: 'Kurze Tipps zur Bedienung', icon: 'bolt', color: '#2DD4BF', sel: '#w-tips' }
];
const getLook = () => Object.assign({}, LOOK_DEFAULT, store.get('look', {}));
const getProfile = () => { const p = Object.assign({}, PROFILE_DEFAULT, store.get('profile', {}) || {}); p.icon = Object.assign({}, PROFILE_DEFAULT.icon, p.icon || {}); return p; };
const getWidgets = () => Object.assign({}, store.get('widgets', {}));

function applyLook() {
  const L = getLook(), st = document.documentElement.style;
  let bg = (BG_PRESETS.find(b => b.id === L.bg) || BG_PRESETS[0]).css;
  if (L.bg === 'custom') { const img = store.get('bgImage', ''); bg = img ? `url("${img}")` : BG_PRESETS[0].css; }
  st.setProperty('--bg-image', bg);
  st.setProperty('--blur', L.blur + 'px');
  st.setProperty('--ga', (L.glass / 100).toFixed(3));
  st.setProperty('--dim', (L.dim / 100).toFixed(2));
  const a = ACCENTS[L.accent] || ACCENTS.blue;
  st.setProperty('--accent', a[0]); st.setProperty('--accent-2', a[1]);
}
function setLook(patch) { store.set('look', Object.assign(getLook(), patch)); applyLook(); }

function symbolSvg(sym, color) { const node = document.getElementById('i-' + sym); return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${node ? node.innerHTML : ''}</svg>`; }
async function iconDataUrl(icon) {
  if (icon.kind === 'custom') { const c = store.get('iconImage', ''); if (c) return c; }
  if (icon.kind !== 'gen') return 'icon-512.png';
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d'), col = ICON_COLORS[icon.color] || ICON_COLORS[0];
  const r = 112; g.beginPath(); g.moveTo(r, 0); g.arcTo(S, 0, S, S, r); g.arcTo(S, S, 0, S, r); g.arcTo(0, S, 0, 0, r); g.arcTo(0, 0, S, 0, r); g.closePath(); g.clip();
  const gr = g.createLinearGradient(0, 0, S, S); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]); g.fillStyle = gr; g.fillRect(0, 0, S, S);
  const gl = g.createRadialGradient(S * .3, S * .2, 10, S * .3, S * .2, S * .8); gl.addColorStop(0, 'rgba(255,255,255,.35)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(0, 0, S, S);
  const txt = (icon.text || '').trim().slice(0, 2);
  g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
  if (txt) { g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `600 ${txt.length > 1 ? 220 : 280}px Poppins, system-ui, -apple-system, sans-serif`; g.fillText(txt, S / 2, S / 2 + 12); }
  else { try { const im = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(symbolSvg(icon.sym || 'rocket', '#fff'))); g.drawImage(im, S * .2, S * .2, S * .6, S * .6); } catch (e) {} }
  return cv.toDataURL('image/png');
}
let iconCache = '';
async function applyProfile() {
  const P = getProfile();
  const url = await iconDataUrl(P.icon); iconCache = url;
  $('#brandIc').src = url; const rb = $('#railBrand img'); if (rb) rb.src = url;
  const rn = $('#railBrand .lb'); if (rn) rn.textContent = P.title || 'Cockpit';
  $('#brandNm').textContent = P.title || 'Cockpit';
  document.title = P.title || 'Cockpit';
  const set = (sel, attr, v) => { const el = document.querySelector(sel); if (el) el.setAttribute(attr, v); };
  set('link[rel="apple-touch-icon"]', 'href', url); set('link[rel="icon"]', 'href', url);
  set('meta[name="apple-mobile-web-app-title"]', 'content', P.title || 'Cockpit');
  if (NATIVE) { try { NATIVE.set_icon(P.icon.kind === 'logo' ? null : url); NATIVE.set_title(P.title || 'Cockpit'); } catch (e) {} }
  tick();
}
function setProfile(patch) { const P = getProfile(); store.set('profile', Object.assign(P, patch, { icon: Object.assign(P.icon, patch.icon || {}) })); applyProfile(); }
async function shrink(file, max, square) {
  const url = URL.createObjectURL(file);
  try {
    const im = await loadImg(url);
    let sw = im.naturalWidth, sh = im.naturalHeight, sx = 0, sy = 0;
    if (square) { const m = Math.min(sw, sh); sx = (sw - m) / 2; sy = (sh - m) / 2; sw = sh = m; }
    const k = Math.min(1, max / Math.max(sw, sh)), cv = document.createElement('canvas');
    cv.width = Math.round(sw * k); cv.height = Math.round(sh * k);
    cv.getContext('2d').drawImage(im, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', square ? .9 : .82);
  } finally { URL.revokeObjectURL(url); }
}
/* =====================================================================
   STARTSEITE ALS RASTER (wie Apple-Widgets)
   Jeder Baustein – Widget oder einzelne App/Link – liegt in einem Raster
   aus quadratischen Zellen. Reihenfolge und Größe sind frei; das Raster
   füllt Lücken automatisch (dichte Anordnung), damit es auf jeder
   Fenstergröße aufgeht.
   ===================================================================== */
const SIZES = { S: [2, 2], M: [4, 2], L: [4, 4], XL: [8, 4], W: [99, 2], A1: [1, 1], A2: [2, 1], A4: [2, 2] };
const SIZE_NAMES = { S: 'Klein', M: 'Mittel', L: 'Groß', XL: 'Sehr groß', W: 'Ganze Breite', A1: 'Symbol', A2: 'Breit', A4: 'Groß' };
const WSIZES = { quick: ['W', 'XL', 'L'], dock: ['M', 'W', 'L'], groups: ['XL', 'W', 'L'], today: ['L', 'M', 'S', 'XL'], projects: ['M', 'S', 'L'], whatsapp: ['S', 'M'],
  stats: ['M', 'S', 'L'], notes: ['L', 'M', 'S'], saved: ['M', 'S', 'L'], timer: ['S', 'M', 'L'], countdown: ['M', 'S', 'L'], tips: ['M', 'L'] };
const APP_SIZES = ['A1', 'A2', 'A4'];
const BOARD_DEFAULT_ORDER = ['quick', 'today', 'dock', 'projects', '@apps', 'whatsapp', 'timer', 'notes', 'saved', 'countdown', 'stats', 'tips'];
const wDef = id => WIDGETS.find(w => w.id === id);
const wEl = id => { const w = wDef(id); return w ? $(w.sel) : null; };
const itemKey = it => it.k + ':' + it.id;
const sizesFor = it => it.k === 'a' ? APP_SIZES : (WSIZES[it.id] || ['M']);
const showable = it => it.k === 'a' ? apps.some(a => a.id === it.id) : !!wDef(it.id) && !(wDef(it.id).nativeOnly && !NATIVE);

function defaultBoard() {
  const W = store.get('widgets', {}) || {}, on = id => W[id] !== false;
  const old = store.get('layout', null);
  const appItems = () => GROUPS.flatMap(g => apps.filter(a => a.group === g.id)).map(a => ({ k: 'a', id: a.id, s: 'A1' }));
  const items = [];
  /* Wer die Widgets schon angeordnet hatte: diese Reihenfolge übernehmen (oben, Hauptspalte, Seitenspalte) */
  const order = old ? [...(old.top || []), ...(old.main || []), ...(old.side || [])].map(id => id === 'groups' ? '@apps' : id) : BOARD_DEFAULT_ORDER;
  const seen = new Set();
  order.concat(BOARD_DEFAULT_ORDER).forEach(id => {
    if (seen.has(id)) return; seen.add(id);
    if (id === '@apps') { if (on('groups')) items.push(...appItems()); return; }
    if (!wDef(id) || id === 'clock' || id === 'groups' || !on(id)) return;
    items.push({ k: 'w', id, s: WSIZES[id][0] });
  });
  return items;
}
function getBoard() {
  let b = store.get('homeBoard', null);
  if (!Array.isArray(b)) { const old = store.get('board', null); b = Array.isArray(old) ? old : defaultBoard(); store.set('homeBoard', b); }
  const off = new Set(store.get('boardOff', []));
  const seen = new Set(), out = [];
  b.forEach(it => { if (!it || !it.k || !it.id) return; const k = itemKey(it); if (seen.has(k)) return; seen.add(k);
    if (it.k === 'a' && !apps.some(a => a.id === it.id)) return;
    if (it.k === 'w' && (!wDef(it.id) || it.id === 'clock')) return;
    if (!sizesFor(it).includes(it.s)) it.s = sizesFor(it)[0];
    out.push(it); });
  /* neu angelegte Apps landen automatisch auf der Startseite */
  apps.forEach(a => { if (!seen.has('a:' + a.id) && !off.has(a.id)) out.push({ k: 'a', id: a.id, s: 'A1' }); });
  return out;
}
const setBoard = b => { store.set('homeBoard', b); renderBoard(); };
const onBoard = (k, id) => getBoard().some(it => it.k === k && it.id === id);
const widgetOn = id => id === 'clock' ? (store.get('widgets', {}) || {}).clock !== false : onBoard('w', id);
const hotkeysOn = () => widgetOn('dock') && store.get('hotkeys', true) !== false;
function setWidget(id, on) {
  if (id === 'clock') { const W = store.get('widgets', {}) || {}; W.clock = on; store.set('widgets', W); applyWidgets(); return; }
  let b = getBoard().filter(it => !(it.k === 'w' && it.id === id));
  if (on) { const at = b.findIndex(it => !(it.k === 'w' && it.id === 'quick')); b.splice(at < 0 ? b.length : at, 0, { k: 'w', id, s: WSIZES[id][0] }); }
  setBoard(b); if (on) refreshWidget(id); if (id === 'dock') renderApps();
}
function setAppOnBoard(id, on) {
  const off = new Set(store.get('boardOff', []));
  let b = getBoard().filter(it => !(it.k === 'a' && it.id === id));
  if (on) { off.delete(id); b.push({ k: 'a', id, s: 'A1' }); } else off.add(id);
  store.set('boardOff', [...off]); setBoard(b);
}
function refreshWidget(id) { ({ today: renderToday, projects: renderProjMini, stats: loadStats, saved: renderSavedMini, whatsapp: renderWaWidget, notes: renderNotes, countdown: renderCds })[id]?.(); }

/* --- Zeichnen --- */
const appEls = new Map();
function appItemEl(a) {
  let el = appEls.get(a.id);
  if (!el) { el = document.createElement('button'); el.type = 'button'; el.className = 'bitem bapp'; el.dataset.app = a.id; appEls.set(a.id, el); }
  el.title = a.name;
  el.innerHTML = `${tileHtml(a)}<span class="txt"><span class="nm">${esc(a.name)}</span><span class="meta">${appMeta(a)}</span></span>${needsSetup(a) ? '<span class="setup" aria-label="Einrichtung nötig"></span>' : ''}`;
  return el;
}
let boardCols = 8;
function boardMetrics() {
  const bd = $('#board'), w = bd.clientWidth || 800, phone = innerWidth <= 760;
  const gap = phone ? 12 : 16, min = phone ? 64 : 84;
  let cols = Math.max(4, Math.floor((w + gap) / (min + gap)));
  if (cols > 4 && cols % 2) cols -= 1;
  const cell = (w - gap * (cols - 1)) / cols;
  return { cols, cell, gap };
}
function applyBoardMetrics() {
  const m = boardMetrics(), bd = $('#board'); boardCols = m.cols;
  bd.style.setProperty('--cols', m.cols); bd.style.setProperty('--cell', m.cell.toFixed(1) + 'px'); bd.style.setProperty('--gap', m.gap + 'px');
  return m;
}
function spanStyle(el, s) {
  const [w, h] = SIZES[s];
  el.style.gridColumn = w >= 99 ? '1 / -1' : `span ${Math.min(w, boardCols)}`;
  el.style.gridRow = `span ${h}`;
  Object.keys(SIZES).forEach(k => el.classList.toggle('sz-' + k, k === s));
  /* schmale Fenster: zu breite Bausteine werden wie „Ganze Breite“ dargestellt */
  el.classList.toggle('sz-full', w >= 99 || w >= boardCols);
}
function renderBoard() {
  const bd = $('#board'), park = $('#parking'); if (!bd) return;
  applyBoardMetrics();
  const items = getBoard().filter(showable), editing = document.body.classList.contains('edit-on');
  const want = items.map(it => {
    const el = it.k === 'a' ? appItemEl(apps.find(a => a.id === it.id)) : wEl(it.id);
    if (!el) return null;
    el.classList.add('bitem'); el.dataset.key = itemKey(it); el.dataset.size = it.s; el.hidden = false;
    spanStyle(el, it.s);
    decorateItem(el, it, editing);
    return el;
  }).filter(Boolean);
  /* nicht (mehr) platzierte Widgets parken */
  WIDGETS.forEach(w => { const el = $(w.sel); if (el && w.id !== 'clock' && !want.includes(el) && el.parentElement !== park) { park.appendChild(el); el.querySelector(':scope > .bctl')?.remove(); } });
  [...bd.children].forEach(ch => { if (!want.includes(ch) && !ch.classList.contains('bph')) ch.remove(); });
  const cur = [...bd.children].filter(c => !c.classList.contains('bph'));
  if (want.length !== cur.length || want.some((el, i) => cur[i] !== el)) want.forEach(el => bd.appendChild(el));
  $('#clock').hidden = !widgetOn('clock');
  bd.classList.toggle('empty', !want.length);
}
function applyWidgets() { renderBoard(); }
function decorateItem(el, it, editing) {
  let c = el.querySelector(':scope > .bctl');
  if (!editing) { c?.remove(); return; }
  const name = it.k === 'a' ? (apps.find(a => a.id === it.id) || {}).name : wDef(it.id).name;
  const sizes = sizesFor(it);
  if (!c) { c = document.createElement('span'); c.className = 'bctl'; el.appendChild(c); }
  c.innerHTML = `<span role="button" tabindex="0" class="bdel" data-bdel aria-label="${esc(name)} von der Startseite nehmen">${ic('x', 'i xs')}</span>`
    + (sizes.length > 1 ? `<span role="button" tabindex="0" class="bsize" data-bsize aria-label="Größe von ${esc(name)}: ${SIZE_NAMES[it.s]} – tippen zum Wechseln, Ecke ziehen zum Ändern" title="${SIZE_NAMES[it.s]}"><b>${SIZE_NAMES[it.s]}</b>${ic('expand', 'i xs')}</span>` : '');
}
new ResizeObserver(() => { if (currentView === 'start') { const before = boardCols; applyBoardMetrics(); if (boardCols !== before) renderBoard(); } }).observe(document.getElementById('board'));

/* --- Bearbeiten: wackeln, ziehen, Größe, entfernen --- */
function setEdit(on) {
  document.body.classList.toggle('edit-on', on);
  $('#editBtn').setAttribute('aria-pressed', on); $('#editBtn span').textContent = on ? 'Fertig' : 'Anpassen';
  const bar = $('#arrangeBar'); bar.hidden = !on;
  if (on) {
    bar.innerHTML = `${ic('layout', 'i sm')}<div class="t"><b>Startseite anpassen</b><span>Bausteine ziehen zum Verschieben · Ecke ziehen oder Größe antippen · ✕ nimmt sie von der Startseite. Apps antippen zum Bearbeiten.</span></div>
      <button class="btn sm" id="arrAdd">${ic('plus', 'i xs')} Hinzufügen</button><button class="btn sm" id="arrReset">Zurücksetzen</button><button class="btn sm pri" id="arrDone">${ic('check', 'i xs')} Fertig</button>`;
    $('#arrAdd').onclick = gallery;
    $('#arrReset').onclick = () => { if (!$('#arrReset').dataset.sure) { $('#arrReset').dataset.sure = 1; $('#arrReset').textContent = 'Wirklich zurücksetzen?'; return; } store.set('layout', null); store.set('boardOff', []); store.set('homeBoard', null); renderBoard(); setEdit(true); toast('Startseite zurückgesetzt', 'layout'); };
    $('#arrDone').onclick = () => setEdit(false);
  }
  renderApps(); renderBoard();
}
$('#editBtn').addEventListener('click', () => setEdit(!document.body.classList.contains('edit-on')));

function cycleSize(key, dir = 1) {
  const b = getBoard(), it = b.find(x => itemKey(x) === key); if (!it) return;
  const s = sizesFor(it), i = s.indexOf(it.s); it.s = s[(i + dir + s.length) % s.length];
  setBoard(b); refreshWidget(it.id);
  toast(`Größe: ${SIZE_NAMES[it.s]}`, 'expand');
  requestAnimationFrame(() => document.querySelector(`[data-key="${key}"] [data-bsize]`)?.focus());
}
function removeItem(key) {
  const [k, id] = key.split(':');
  if (k === 'a') setAppOnBoard(id, false); else setWidget(id, false);
  toast('Von der Startseite genommen – über „Hinzufügen“ holst du es zurück', 'x');
}
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const t = e.target.closest?.('[data-bdel],[data-bsize]'); if (!t) return;
  e.preventDefault(); const key = t.closest('[data-key]').dataset.key;
  if (t.matches('[data-bdel]')) removeItem(key); else cycleSize(key);
});

let swallowClick = false, swallowT = null;
const swallow = (ms = 350) => { swallowClick = true; clearTimeout(swallowT); swallowT = setTimeout(() => { swallowClick = false; }, ms); };
document.addEventListener('click', e => {
  const del = e.target.closest && e.target.closest('#board [data-bdel]');
  if (del && !swallowClick) { e.preventDefault(); e.stopPropagation(); removeItem(del.closest('[data-key]').dataset.key); return; }
  if (swallowClick) { swallowClick = false; clearTimeout(swallowT); e.preventDefault(); e.stopPropagation(); } }, true);

/* Langes Drücken auf einen Baustein startet das Anpassen (wie auf dem iPhone) */
let lpTimer = null;
document.addEventListener('pointerdown', e => {
  const it = e.target.closest('#board > .bitem'); if (!it || document.body.classList.contains('edit-on') || e.button > 0) return;
  if (e.target.closest('input,textarea,select,[contenteditable]')) return;
  const x0 = e.clientX, y0 = e.clientY;
  const cancel = () => { clearTimeout(lpTimer); removeEventListener('pointermove', mv); removeEventListener('pointerup', cancel); removeEventListener('pointercancel', cancel); };
  const mv = ev => { if (Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) > 10) cancel(); };
  lpTimer = setTimeout(() => { cancel(); swallow(900); if (navigator.vibrate) try { navigator.vibrate(10); } catch (er) {} setEdit(true); }, 550);
  addEventListener('pointermove', mv); addEventListener('pointerup', cancel); addEventListener('pointercancel', cancel);
});

/* Ziehen und Größe ändern im Anpassen-Modus */
document.addEventListener('pointerdown', e => {
  if (!document.body.classList.contains('edit-on') || e.button > 0) return;
  const el = e.target.closest('#board > .bitem'); if (!el) return;
  const key = el.dataset.key;
  if (e.target.closest('[data-bdel]')) return;   /* entfernen übernimmt der Klick */
  const handle = e.target.closest('[data-bsize]');
  e.preventDefault();
  const x0 = e.clientX, y0 = e.clientY, m = boardMetrics(), step = m.cell + m.gap;
  let moved = false;
  if (handle) {
    /* Größe: Ecke ziehen → nächste erlaubte Größe; nur antippen → nächste Größe */
    const b = getBoard(), it = b.find(x => itemKey(x) === key), allowed = sizesFor(it);
    const [w0, h0] = SIZES[it.s].map((v, i) => i === 0 ? Math.min(v, m.cols) : v);
    let cur = it.s;
    const mv = ev => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 8) return; moved = true;
      const tw = w0 + dx / step, th = h0 + dy / step;
      let best = cur, bd = Infinity;
      allowed.forEach(s => { const [w, h] = SIZES[s], ww = Math.min(w, m.cols), d = (ww - tw) ** 2 + (h - th) ** 2; if (d < bd) { bd = d; best = s; } });
      if (best !== cur) { cur = best; el.dataset.size = cur; spanStyle(el, cur); el.querySelector('[data-bsize] b').textContent = SIZE_NAMES[cur]; }
    };
    const up = () => {
      removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      swallow(60);
      if (!moved) { cycleSize(key); return; }
      if (cur !== it.s) { it.s = cur; setBoard(b); refreshWidget(it.id); toast(`Größe: ${SIZE_NAMES[cur]}`, 'expand'); }
    };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    return;
  }
  /* Verschieben */
  let ph = null, dx = 0, dy = 0;
  const start = ev => {
    const r = el.getBoundingClientRect(); dx = x0 - r.left; dy = y0 - r.top;
    ph = document.createElement('div'); ph.className = 'bph'; ph.style.gridColumn = el.style.gridColumn; ph.style.gridRow = el.style.gridRow;
    el.after(ph);
    el.classList.add('bdrag'); Object.assign(el.style, { width: r.width + 'px', height: r.height + 'px', left: r.left + 'px', top: r.top + 'px' });
    document.body.classList.add('dragging-w');
  };
  const mv = ev => {
    if (!moved) { if (Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) < 8) return; moved = true; start(ev); }
    el.style.left = ev.clientX - dx + 'px'; el.style.top = ev.clientY - dy + 'px';
    const hit = document.elementFromPoint(ev.clientX, ev.clientY), over = hit && hit.closest('#board > .bitem:not(.bdrag)');
    const bd = $('#board');
    if (over) {
      const r = over.getBoundingClientRect(), after = (ev.clientX - r.left) / r.width + (ev.clientY - r.top) / r.height * 0.35 > 0.6;
      if (after) { if (over.nextElementSibling !== ph) over.after(ph); } else if (over.previousElementSibling !== ph) over.before(ph);
    } else if (hit && (hit === bd || bd.contains(hit)) && !hit.closest('.bph')) {
      const last = [...bd.children].filter(c => c !== el && c !== ph).pop();
      if (last && ev.clientY > last.getBoundingClientRect().bottom - 4 && bd.lastElementChild !== ph) bd.appendChild(ph);
    }
    if (ev.clientY < 70) scrollBy(0, -16); else if (ev.clientY > innerHeight - 70) scrollBy(0, 16);
  };
  const up = () => {
    removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
    if (!moved) return;           /* nur angetippt: der normale Klick übernimmt (App bearbeiten) */
    swallow(60);
    document.body.classList.remove('dragging-w');
    ph.replaceWith(el); el.classList.remove('bdrag'); ['width', 'height', 'left', 'top'].forEach(p => el.style[p] = '');
    const order = [...$('#board').children].map(c => c.dataset.key).filter(Boolean);
    const b = getBoard(), byKey = new Map(b.map(it => [itemKey(it), it]));
    const nb = order.map(k => byKey.get(k)).filter(Boolean); b.forEach(it => { if (!order.includes(itemKey(it))) nb.push(it); });
    setBoard(nb);
  };
  addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
});

/* Hinzufügen: Widgets und Apps zurückholen oder neu anlegen */
function gallery() {
  const b = getBoard(), has = new Set(b.map(itemKey));
  const ws = WIDGETS.filter(w => w.id !== 'clock' && !has.has('w:' + w.id) && !(w.nativeOnly && !NATIVE));
  const as = apps.filter(a => !has.has('a:' + a.id));
  modal(`<div class="glass modal wide" role="dialog" aria-label="Zur Startseite hinzufügen"><div class="mh"><h3>Zur Startseite hinzufügen</h3><button class="orb sm" data-close aria-label="Schließen">${ic('x', 'i xs')}</button></div>
    <h4 class="zh" style="margin-top:4px">Widgets</h4>
    <div class="gal">${ws.length ? ws.map(w => `<div class="galw"><span class="tile sm" style="--c:${w.color}">${ic(w.icon, 'i sm')}</span><span class="t"><b>${w.name}</b><span>${w.desc}</span></span>
      <span class="sizes">${WSIZES[w.id].map(s => `<button type="button" class="chipbtn" data-gadd="w:${w.id}:${s}">${SIZE_NAMES[s]}</button>`).join('')}</span></div>`).join('') : '<p class="empty">Alle Widgets sind schon auf der Startseite.</p>'}</div>
    <h4 class="zh">Apps und Links</h4>
    <div class="gal">${as.map(a => `<div class="galw">${tileHtml(a, true)}<span class="t"><b>${esc(a.name)}</b><span>${appMeta(a)}</span></span><span class="sizes">${APP_SIZES.map(s => `<button type="button" class="chipbtn" data-gadd="a:${a.id}:${s}">${SIZE_NAMES[s]}</button>`).join('')}</span></div>`).join('') || '<p class="empty">Alle Apps sind schon auf der Startseite.</p>'}</div>
    <div class="row" style="justify-content:flex-start;margin-top:14px"><button class="btn pri" id="galNew">${ic('plus', 'i sm')} Neue App oder neuen Link anlegen</button></div></div>`);
  $('#ov').querySelectorAll('[data-gadd]').forEach(btn => btn.onclick = () => {
    const [k, id, s] = btn.dataset.gadd.split(':');
    const nb = getBoard().filter(it => !(it.k === k && it.id === id));
    const at = nb.findIndex(it => !(it.k === 'w' && it.id === 'quick'));
    nb.splice(at < 0 ? nb.length : at, 0, { k, id, s });
    if (k === 'a') { const off = new Set(store.get('boardOff', [])); off.delete(id); store.set('boardOff', [...off]); }
    setBoard(nb); if (k === 'w') refreshWidget(id); close(); toast(`${k === 'a' ? apps.find(a => a.id === id).name : wDef(id).name} hinzugefügt`, 'plus');
    requestAnimationFrame(() => document.querySelector(`[data-key="${k}:${id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  });
  $('#galNew').onclick = () => { close(); editor(null, 'eigene'); };
}

/* =====================================================================
   SEITENREITER & ANSICHTEN
   ===================================================================== */
const VIEWS = [
  { id: 'start', name: 'Start', icon: 'home' },
  { id: 'kalender', name: 'Kalender', icon: 'cal' },
  ...(NATIVE ? [{ id: 'whatsapp', name: 'WhatsApp', icon: 'phonechat' }] : []),
  { id: 'projekte', name: 'Projekte', icon: 'kanban' },
  { id: 'gespeichert', name: 'Gespeichert', icon: 'bookmark' },
  { id: 'whiteboard', name: 'Whiteboard', icon: 'whiteboard' },
  { id: 'dateien', name: 'Dateien', icon: 'file' }
];
let currentView = 'start';
function renderRail() {
  const P = getProfile(), open = store.get('railOpen', false);
  $('#rail').classList.toggle('open', open); document.body.classList.toggle('rail-open', open);
  $('#rail').innerHTML = `
    <button class="rb brand opt" id="railBrand" aria-label="Persönlich anpassen"><img src="${esc(iconCache || 'icon-192.png')}" alt=""><span class="lb">${esc(P.title || 'Cockpit')}</span><span class="tt">${esc(P.title || 'Cockpit')}</span></button>
    <hr class="opt">
    ${VIEWS.map(v => `<a class="rb" href="#${v.id}" data-view-link="${v.id}" ${v.id === currentView ? 'aria-current="page"' : ''} aria-label="${v.name}">${ic(v.icon)}${v.id === 'whatsapp' ? '<span class="badge num" id="waBadge" hidden>0</span>' : ''}<span class="lb">${v.name}</span><span class="tt">${v.name}</span></a>`).join('')}
    <hr>
    <button class="rb" id="railSearch" aria-label="Suchen (⌘K)">${ic('search')}<span class="lb">Suchen</span><span class="tt">Suchen · ⌘K</span></button>
    <button class="rb" id="railBell" aria-label="Mitteilungen">${ic('bell')}<span class="badge num" id="bellBadge" hidden>0</span><span class="lb">Mitteilungen</span><span class="tt">Mitteilungen</span></button>
    <button class="rb" id="railSet" aria-label="Einstellungen">${ic('gear')}<span class="lb">Einstellungen</span><span class="tt">Einstellungen</span></button>
    <button class="rb toggle" id="railToggle" aria-label="${open ? 'Leiste einklappen' : 'Leiste aufklappen'}" aria-expanded="${open}">${ic('chev2')}<span class="lb">Einklappen</span><span class="tt">Aufklappen</span></button>`;
  $('#railBrand').onclick = () => setup('personal');
  $('#railSearch').onclick = () => palette();
  $('#railBell').onclick = () => toggleNotif();
  $('#railSet').onclick = () => setup();
  $('#railToggle').onclick = () => { store.set('railOpen', !store.get('railOpen', false)); renderRail(); updateBadge(); };
  updateBadge();
}
function showView(id) {
  if (id !== 'start' && document.body.classList.contains('edit-on')) setEdit(false);
  if (!VIEWS.some(v => v.id === id)) id = 'start';
  if (currentView === 'whiteboard' && id !== 'whiteboard') wbLeave();
  if (currentView === 'whatsapp' && id !== 'whatsapp') waLeave();
  document.body.classList.toggle('wa-on', id === 'whatsapp');
  currentView = id;
  $$('.view').forEach(s => { s.hidden = s.dataset.view !== id; });
  $$('#rail [data-view-link]').forEach(a => a.dataset.viewLink === id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  ({ start: renderStart, kalender: renderCalendar, projekte: renderKanban, gespeichert: renderSaved, whiteboard: renderWhiteboard, dateien: renderFiles, whatsapp: renderWhatsApp })[id]();
  window.scrollTo({ top: 0 });
  closeNotif();
}
window.addEventListener('hashchange', () => showView(location.hash.slice(1)));
const go = id => { if (location.hash === '#' + id) showView(id); else location.hash = id; };

/* =====================================================================
   START
   ===================================================================== */
function isoWeek(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y0) / 864e5 + 1) / 7); }
function tick() {
  const n = new Date(), h = n.getHours(), nm = getProfile().name;
  $('#greet').textContent = (h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend') + (nm ? ', ' + nm : '');
  $('#date').textContent = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(n);
  $('#kw').textContent = 'KW ' + isoWeek(n);
  $('#clock').textContent = n.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
function renderStart() { tick(); renderApps(); renderNotes(); renderCds(); applyWidgets(); renderToday(); renderProjMini(); renderSavedMini(); renderWaWidget(); if (widgetOn('stats')) loadStats(); }

/* ---------- Kacheln ---------- */
const tileHtml = (a, sm) => `<span class="tile${sm ? ' sm' : ''}" style="--c:${a.color}">${ic(a.icon, sm ? 'i sm' : 'i')}</span>`;
function appMeta(a) {
  if (needsSetup(a)) return 'Adresse eintragen';
  if (a.type === 'shortcut' && !(NATIVE && a.mac)) return 'Kurzbefehl · ' + esc(a.sub || '');
  if (a.type === 'mac' && !NATIVE) return 'Nur Mac-App · ' + esc(a.sub || '');
  return esc(a.sub || '');
}
function appHtml(a, inDock, key) {
  return `<button class="app" data-app="${a.id}" title="${esc(a.name)}">${inDock && key ? `<span class="key num">${key}</span>` : ''}${tileHtml(a)}
    <span class="txt"><span class="nm">${esc(a.name)}</span><span class="meta">${appMeta(a)}</span></span>
    ${needsSetup(a) ? '<span class="setup" aria-label="Einrichtung nötig"></span>' : ''}
    ${inDock ? '' : `<span class="ctl"><span data-mv="-1" aria-label="nach vorne">${ic('left', 'i xs')}</span><span data-ed aria-label="bearbeiten">${ic('edit', 'i xs')}</span><span data-mv="1" aria-label="nach hinten">${ic('right', 'i xs')}</span></span>`}</button>`;
}
function dockApps() { const used = apps.filter(a => usage[a.id]).sort((a, b) => usage[b.id] - usage[a.id]); return [...used, ...apps.filter(a => !usage[a.id])].slice(0, 6); }
function renderApps() {
  const hk = hotkeysOn();
  $('#dock').innerHTML = dockApps().map((a, i) => appHtml(a, true, hk ? i + 1 : 0)).join('');
  $('#dockHint').textContent = [Object.keys(usage).length ? 'Am häufigsten genutzt' : '', hk ? 'Tasten 1–6' : ''].filter(Boolean).join(' · ');
  const editing = document.body.classList.contains('edit-on');
  $('#w-groups').innerHTML = GROUPS.map(g => {
    const list = apps.filter(a => a.group === g.id);
    if (!list.length && !editing) return '';
    return `<section class="glass group${list.length > 4 ? ' wide' : ''}"><div class="sec-h"><h2>${g.name}</h2><small>${list.length}</small></div>
      <div class="apps">${list.map(a => appHtml(a, false)).join('')}<button class="app addapp" data-add="${g.id}">${ic('plus', 'i sm')} App hinzufügen</button></div></section>`;
  }).join('');
  renderBoard();
}
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-app]'); if (!btn) { const add = e.target.closest('[data-add]'); if (add) editor(null, add.dataset.add); return; }
  const a = apps.find(x => x.id === btn.dataset.app); if (!a) return;
  if (document.body.classList.contains('edit-on') && !btn.closest('#dock')) {
    const mv = e.target.closest('[data-mv]');
    if (mv) { move(a, +mv.dataset.mv); return; }
    editor(a); return;
  }
  openApp(a, btn);
});
function move(a, dir) {
  const same = apps.filter(x => x.group === a.group); const i = same.indexOf(a), j = i + dir;
  if (j < 0 || j >= same.length) return;
  const ai = apps.indexOf(a), bi = apps.indexOf(same[j]); [apps[ai], apps[bi]] = [apps[bi], apps[ai]];
  saveApps(); renderApps();
}
function editor(a, group) {
  const isNew = !a;
  const d = a ? { ...a } : { id: 'app' + uid(), name: '', sub: '', group: group || 'eigene', icon: 'globe', color: COLORS[0], type: 'web', target: '' };
  modal(`<form class="glass modal" id="edf">
    <h3>${isNew ? 'App hinzufügen' : esc(d.name) + ' bearbeiten'}</h3>
    <p class="lead">${d.hint ? esc(d.hint) : NATIVE ? 'Webseiten öffnen sich im Browser, Mac-Apps direkt, Kurzbefehle über die Kurzbefehle-App.' : 'Webseiten öffnen sich in einem neuen Tab, Apps auf dem Gerät über einen Kurzbefehl.'}</p>
    <div class="two"><label class="field">Name<input id="eN" required value="${esc(d.name)}"></label><label class="field">Untertitel<input id="eS" value="${esc(d.sub)}"></label></div>
    <div class="field">Öffnen als<div class="seg" id="eT"><button type="button" data-t="web" aria-pressed="${d.type === 'web'}">Webseite</button><button type="button" data-t="shortcut" aria-pressed="${d.type === 'shortcut'}">Kurzbefehl</button>${NATIVE || d.type === 'mac' ? `<button type="button" data-t="mac" aria-pressed="${d.type === 'mac'}">Mac-App</button>` : ''}</div></div>
    <label class="field"><span id="eLl"></span><input id="eU" value="${esc(d.target)}" autocomplete="off" spellcheck="false" autocapitalize="off"><datalist id="macApps"></datalist><small id="eHint"></small></label>
    ${NATIVE && d.type === 'web' ? `<label class="field">Auf dem Mac lieber diese App öffnen (optional)<input id="eMac" list="macApps" value="${esc(d.mac && d.mac.name || '')}" placeholder="z. B. WhatsApp"><small>Ist die App installiert, öffnet Cockpit sie statt der Webseite.</small></label>` : ''}
    <div class="two"><label class="field">Bereich<select id="eG">${GROUPS.map(g => `<option value="${g.id}"${g.id === d.group ? ' selected' : ''}>${g.name}</option>`).join('')}</select></label>
      <label class="field">Symbol<select id="eI">${ICONS.map(i => `<option${i === d.icon ? ' selected' : ''}>${i}</option>`).join('')}</select></label></div>
    <div class="field">Farbe<div class="swatches" id="eC">${COLORS.map(c => `<button type="button" style="background:${c}" data-c="${c}" aria-label="Farbe ${c}" aria-pressed="${c === d.color}"></button>`).join('')}</div></div>
    <div class="row">${isNew ? '' : '<button type="button" class="btn danger" id="eDel">Entfernen</button>'}<span class="spacer"></span><button type="button" class="btn" id="eTest">Testen</button><button type="button" class="btn" data-close>Abbrechen</button><button class="btn pri">Speichern</button></div>
  </form>`);
  const LBL = { web: ['Adresse (https://…)', 'Am einfachsten die Adresse aus der Adresszeile des Browsers kopieren.'], shortcut: ['Name des Kurzbefehls', 'Muss genauso heißen wie in der Kurzbefehle-App.'], mac: ['Name der Mac-App', 'Wie im Ordner „Programme“, z. B. Keynote. Beim Tippen erscheinen Vorschläge.'] };
  const PH = { web: 'https://deine-schule.de/iserv', shortcut: 'Cockpit …', mac: 'z. B. Keynote' };
  const setType = () => { $('#eLl').textContent = LBL[d.type][0]; $('#eHint').textContent = LBL[d.type][1]; const u = $('#eU'); u.placeholder = PH[d.type]; if (d.type === 'mac') u.setAttribute('list', 'macApps'); else u.removeAttribute('list'); };
  setType();
  if (NATIVE) NATIVE.list_apps().then(list => { const dl = $('#macApps'); if (dl) dl.innerHTML = (list || []).map(n => `<option value="${esc(n)}">`).join(''); });
  $('#eT').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; if (d.type !== b.dataset.t) $('#eU').value = ''; d.type = b.dataset.t; $$('#eT button').forEach(x => x.setAttribute('aria-pressed', x === b)); setType(); });
  $('#eC').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; d.color = b.dataset.c; $$('#eC button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  $('#eDel')?.addEventListener('click', () => { apps = apps.filter(x => x.id !== d.id); saveApps(); close(); renderApps(); toast(`${d.name} entfernt`); });
  const collect = () => {
    let url = $('#eU').value.trim();
    if (d.type === 'web' && url && !/^[a-z]+:/i.test(url)) url = 'https://' + url;
    const out = Object.assign({}, d, { name: $('#eN').value.trim() || d.name || 'App', sub: $('#eS').value.trim(), target: url, group: $('#eG').value, icon: $('#eI').value });
    delete out.hint;
    const macName = $('#eMac') ? $('#eMac').value.trim() : null;
    if (macName !== null) { if (macName) out.mac = { name: macName }; else delete out.mac; }
    if (out.type === 'mac') delete out.mac;
    return out;
  };
  $('#eTest')?.addEventListener('click', () => { const t = collect(); if (!t.target) { toast(t.type === 'mac' ? 'Bitte den Namen der Mac-App eintragen' : t.type === 'shortcut' ? 'Bitte den Namen des Kurzbefehls eintragen' : 'Bitte zuerst eine Adresse eintragen', 'x'); return; } openApp(t); });
  $('#edf').addEventListener('submit', e => {
    e.preventDefault();
    const out = collect();
    if (out.type === 'web' && out.target && !/^https?:\/\/[^\s]+\.[^\s]+/i.test(out.target)) { toast('Die Adresse sieht unvollständig aus', 'x'); $('#eU').focus(); return; }
    if (isNew) apps.push(out); else apps[apps.findIndex(x => x.id === out.id)] = out;
    saveApps(); close(); renderApps(); toast('Gespeichert');
  });
  setTimeout(() => (needsSetup(d) && !isNew ? $('#eU') : $('#eN')).focus(), 50);
}

/* ---------- KI-Schnellzeile ---------- */
const TEMPLATES = [
  { n: 'Elternbrief', p: 'Formuliere einen freundlichen, klaren Elternbrief (IGS, Klasse 5–10) zu folgendem Anlass:\n\n' },
  { n: 'Arbeitsblatt', p: 'Erstelle ein differenziertes Arbeitsblatt (A-, B- und C-Kurs) zum Thema:\n\n' },
  { n: 'Mail umformulieren', p: 'Formuliere diese E-Mail höflich, kurz und professionell um:\n\n' },
  { n: 'Zusammenfassen', p: 'Fasse den folgenden Text in 5 Stichpunkten zusammen:\n\n' },
  { n: 'Stundenidee', p: 'Gib mir drei Ideen für einen motivierenden Einstieg (10 Minuten) in die Stunde zum Thema:\n\n' }
];
let tplActive = null;
$('#tpl').insertAdjacentHTML('beforeend', TEMPLATES.map((t, i) => `<button class="chipbtn" data-tpl="${i}" aria-pressed="false">${t.n}</button>`).join(''));
$('#tpl').addEventListener('click', e => { const b = e.target.closest('[data-tpl]'); if (!b) return; const i = +b.dataset.tpl; tplActive = tplActive === i ? null : i; $$('[data-tpl]').forEach(x => x.setAttribute('aria-pressed', +x.dataset.tpl === tplActive)); $('#q').focus(); });
const q = $('#q');
const fullText = () => (tplActive != null ? TEMPLATES[tplActive].p : '') + q.value.trim();
function clearQ() { q.value = ''; tplActive = null; $$('[data-tpl]').forEach(x => x.setAttribute('aria-pressed', 'false')); q.style.height = ''; }
function bump(id) { usage[id] = (usage[id] || 0) + 1; store.set('usage', usage); }
async function sendQ(kind, textOverride) {
  if (textOverride != null) q.value = textOverride;
  const raw = q.value.trim(), t = fullText();
  if (!raw && !['claude', 'chatgpt', 'whatsapp'].includes(kind)) { q.focus(); toast('Erst etwas eingeben', 'edit'); return; }
  if (kind === 'claude') { bump('claude'); openUrl(t ? 'https://claude.ai/new?q=' + encodeURIComponent(t) : 'https://claude.ai/new', 'Claude'); }
  if (kind === 'chatgpt') { bump('chatgpt'); openUrl(t ? 'https://chatgpt.com/?q=' + encodeURIComponent(t) : 'https://chatgpt.com/', 'ChatGPT'); }
  if (kind === 'deepl') { const cp = copy(raw); bump('deepl'); await openUrl('https://www.deepl.com/write', 'DeepL Write'); const ok = await cp; if (ok) setTimeout(() => toast('Text kopiert – in DeepL Write mit ⌘V einfügen', 'copy'), 900); }
  if (kind === 'whatsapp') { bump('whatsapp'); openUrl(raw ? 'https://wa.me/?text=' + encodeURIComponent(raw) : 'https://web.whatsapp.com/', 'WhatsApp'); }
  if (kind === 'task') { addTask({ title: raw }); toast('Als Projekt „In Planung“ angelegt', 'kanban'); }
  if (kind === 'reminder') {
    if (NATIVE) { const r = await NATIVE.add_reminder(raw); if (!r.ok) { toast(r.error, 'x'); return; } toast('Erinnerung angelegt', 'bell'); }
    else { location.href = shortcutUrl('Cockpit Erinnerung neu', raw); toast('Erinnerung wird über den Kurzbefehl angelegt', 'bell'); }
  }
  if (kind === 'note') { addNote(raw); toast('Als Notiz gespeichert', 'note'); }
  clearQ(); renderApps();
}
$$('[data-q]').forEach(b => b.addEventListener('click', () => sendQ(b.dataset.q)));
q.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendQ('claude'); } });
q.addEventListener('input', () => { q.style.height = 'auto'; q.style.height = Math.min(q.scrollHeight + 2, 200) + 'px'; });

/* ---------- Notizen ---------- */
let notes = store.get('notes', null) || [
  { id: 1, t: NATIVE ? 'Kalender verbinden (Kalender › Quellen)' : 'Kurzbefehle für Kalender, Erinnerungen, Mail und iDoceo anlegen (Einstellungen › Kurzbefehle)', d: false },
  { id: 2, t: 'IServ- und Jamf-Adresse eintragen (orange Punkte)', d: false }
];
function renderNotes() {
  const open = notes.filter(n => !n.d).length;
  $('#noteCount').textContent = notes.length ? `${open} offen` : '';
  $('#notes').innerHTML = notes.length ? notes.map(n => `<div class="note${n.d ? ' done' : ''}" data-n="${n.id}"><button class="ck" data-tg aria-label="${n.d ? 'Als offen markieren' : 'Erledigt'}">${n.d ? ic('check', 'i xs') : ''}</button><span class="t">${esc(n.t)}</span><button class="del" data-dl aria-label="Löschen">${ic('x', 'i xs')}</button></div>`).join('')
    : '<p class="empty">Noch keine Notizen. Schreib oben etwas hinein oder nutz die Schnellzeile.</p>';
  store.set('notes', notes);
}
function addNote(t) { if (!t) return; notes.unshift({ id: Date.now(), t, d: false }); renderNotes(); }
$('#noteForm').addEventListener('submit', e => { e.preventDefault(); addNote($('#noteIn').value.trim()); $('#noteIn').value = ''; });
$('#notes').addEventListener('click', e => {
  const row = e.target.closest('[data-n]'); if (!row) return; const n = notes.find(x => x.id === +row.dataset.n); if (!n) return;
  if (e.target.closest('[data-tg]')) { n.d = !n.d; notes.sort((a, b) => a.d - b.d); renderNotes(); }
  if (e.target.closest('[data-dl]')) { notes = notes.filter(x => x !== n); renderNotes(); }
});

/* ---------- Timer ---------- */
const TM = { total: 300, left: 300, end: 0, run: false, iv: null };
const TM_PRE = [1, 3, 5, 10, 15, 20, 30, 45], C = 2 * Math.PI * 52;
const mmss = s => { s = Math.max(0, Math.ceil(s)); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); };
$('#tmPre').innerHTML = TM_PRE.map(m => `<button class="chipbtn" data-tm="${m}">${m} min</button>`).join('');
function tmDraw() {
  const left = TM.run ? (TM.end - Date.now()) / 1000 : TM.left;
  $('#tmT').textContent = mmss(left);
  const ring = $('#tmRing'); ring.style.strokeDasharray = C; ring.style.strokeDashoffset = C * (1 - Math.max(0, left) / (TM.total || 1));
  $('#tmS').textContent = TM.run ? 'läuft' : left <= 0 ? 'fertig' : left < TM.total ? 'pausiert' : 'bereit';
  $('#tmGo').textContent = TM.run ? 'Pause' : left < TM.total && left > 0 ? 'Weiter' : 'Start';
  const big = $('#tmBigView');
  if (big) { big.querySelector('.t').textContent = mmss(left); big.querySelector('.bar i').style.width = (100 * Math.max(0, left) / (TM.total || 1)) + '%'; big.classList.toggle('over', left <= 0); }
  if (TM.run && left <= 0) tmDone();
}
function tmSet(sec) { TM.run = false; clearInterval(TM.iv); TM.total = TM.left = Math.max(10, sec); tmDraw(); }
function tmToggle() {
  if (TM.run) { TM.left = (TM.end - Date.now()) / 1000; TM.run = false; clearInterval(TM.iv); }
  else { if (TM.left <= 0) TM.left = TM.total; TM.end = Date.now() + TM.left * 1000; TM.run = true; TM.iv = setInterval(tmDraw, 250); }
  tmDraw();
}
function beep() { try { const A = new (window.AudioContext || window.webkitAudioContext)(); [0, .35, .7].forEach(t => { const o = A.createOscillator(), g = A.createGain(); o.type = 'sine'; o.frequency.value = 880; g.gain.setValueAtTime(.0001, A.currentTime + t); g.gain.exponentialRampToValueAtTime(.4, A.currentTime + t + .02); g.gain.exponentialRampToValueAtTime(.0001, A.currentTime + t + .28); o.connect(g).connect(A.destination); o.start(A.currentTime + t); o.stop(A.currentTime + t + .3); }); } catch (e) {} }
function tmDone() { TM.run = false; TM.left = 0; clearInterval(TM.iv); beep(); toast('Die Zeit ist um', 'timer'); pushTransient({ id: 'timer:' + Date.now(), icon: 'timer', color: '#A46BFF', title: 'Timer abgelaufen', sub: 'Die eingestellte Zeit ist um' }); systemNotify('Timer', 'Die Zeit ist um'); const w = $('#w-timer'); w.classList.remove('done-pulse'); void w.offsetWidth; w.classList.add('done-pulse'); tmDraw(); }
$('#tmPre').addEventListener('click', e => { const b = e.target.closest('[data-tm]'); if (b) tmSet(+b.dataset.tm * 60); });
$('#tmGo').addEventListener('click', tmToggle);
$('#tmReset').addEventListener('click', () => tmSet(TM.total));
$('#tmPlus').addEventListener('click', () => { if (TM.run) TM.end += 60000; else TM.left += 60; TM.total += 60; tmDraw(); });
$('#tmMinus').addEventListener('click', () => { if (TM.run) TM.end = Math.max(Date.now() + 1000, TM.end - 60000); else TM.left = Math.max(10, TM.left - 60); TM.total = Math.max(10, TM.total - 60); tmDraw(); });
$('#tmBig').addEventListener('click', () => {
  const d = document.createElement('div'); d.className = 'tm-big'; d.id = 'tmBigView';
  d.innerHTML = '<span class="t num"></span><div class="bar"><i></i></div><small>Leertaste: Start/Pause · Tippen oder Esc: schließen</small>';
  d.addEventListener('click', () => d.remove()); document.body.appendChild(d); tmDraw();
});
tmDraw();

/* ---------- Countdown ---------- */
let cds = store.get('countdowns', []);
const daysUntil = iso => Math.round((parseDay(iso) - parseDay(isoDay(new Date()))) / 864e5);
function renderCds() {
  cds.sort((a, b) => a.date.localeCompare(b.date));
  const fmt = iso => new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(parseDay(iso));
  $('#cdCount').textContent = cds.length ? `${cds.filter(c => daysUntil(c.date) >= 0).length} aktiv` : '';
  $('#cds').innerHTML = cds.length ? cds.map(c => { const n = daysUntil(c.date);
    return `<div class="cd${n < 0 ? ' past' : ''}" data-cd="${c.id}"><span class="n num">${n === 0 ? '🎉' : Math.abs(n)}<small>${n === 0 ? 'heute' : n < 0 ? 'Tage her' : n === 1 ? 'Tag' : 'Tage'}</small></span><span class="t"><b>${esc(c.label)}</b><span>${fmt(c.date)}</span></span><button class="x" data-cdx aria-label="Löschen">${ic('x', 'i xs')}</button></div>`; }).join('')
    : '<p class="empty">Noch kein Countdown. Trag unten ein, worauf du wartest, z. B. Ferienbeginn oder Zeugniskonferenz.</p>';
  store.set('countdowns', cds);
}
$('#cdForm').addEventListener('submit', e => { e.preventDefault(); const d = $('#cdD').value; if (!d) return; cds.push({ id: Date.now(), label: $('#cdL').value.trim() || 'Countdown', date: d }); $('#cdL').value = ''; $('#cdD').value = ''; renderCds(); updateBadge(); });
$('#cds').addEventListener('click', e => { if (!e.target.closest('[data-cdx]')) return; const id = +e.target.closest('[data-cd]').dataset.cd; cds = cds.filter(c => c.id !== id); renderCds(); updateBadge(); });

/* ---------- Widget „Heute“ ---------- */
function eventRow(e, now) {
  const past = e.end <= now, cur = e.start <= now && e.end > now;
  return `<div class="ev${past ? ' past' : ''}${cur ? ' now' : ''}"><time class="num">${e.allDay ? 'ganzt.' : hm(e.start)}</time><button class="box" data-evid="${esc(e.key)}" style="--c:${esc(e.color || '#4F7BFF')}"><b>${esc(e.title)}</b><span>${e.allDay ? 'Ganztägig' : hm(e.start) + ' – ' + hm(e.end)}${e.location ? ' · ' + esc(e.location) : ''}${e.calendar ? ' · ' + esc(e.calendar) : ''}</span></button></div>`;
}
async function renderToday() {
  if (!widgetOn('today')) return;
  const box = $('#todayBox');
  const r = await eventsFor(isoDay(new Date()));
  const now = Date.now() / 1000, ev = r.events;
  let html = ev.length ? `<div class="evs">${ev.map(e => eventRow(e, now)).join('')}</div>` : '<p class="empty">Heute stehen keine Termine an.</p>';
  if (NATIVE && r.macState && r.macState !== 'ok') html += `<div class="perm" style="margin-top:10px"><span>${r.macState === 'ask' ? 'Verbinde deinen Mac-Kalender, damit seine Termine hier erscheinen.' : r.macState === 'denied' ? 'Der Zugriff auf den Mac-Kalender ist gesperrt.' : 'Mac-Kalender nicht verfügbar.'}</span><div class="row" style="justify-content:flex-start;margin:0">${r.macState === 'ask' ? '<button class="btn sm pri" data-cal-connect>Kalender verbinden</button>' : r.macState === 'denied' ? '<button class="btn sm" data-cal-prefs>Systemeinstellungen</button>' : ''}</div></div>`;
  if (!NATIVE && !ev.length && !getFeeds().length) html += '<p class="empty">Tipp: Eigene Termine legst du im Kalender an. Auf dem Mac zeigt die Mac-App auch deinen Kalender und IServ/WebUntis-Abos.</p>';
  box.innerHTML = html;
}
document.addEventListener('click', async e => {
  if (e.target.closest('[data-cal-connect]')) { await NATIVE.request_calendar(); calCache.clear(); renderToday(); if (currentView === 'kalender') renderCalendar(); }
  if (e.target.closest('[data-cal-prefs]')) NATIVE.open_privacy('calendar');
  const evb = e.target.closest('[data-evid]'); if (evb) showEvent(evb.dataset.evid);
});

/* ---------- Widget „Projekte“ ---------- */
function renderProjMini() {
  if (!widgetOn('projects')) return;
  const cnt = c => tasks.filter(t => t.col === c).length;
  const open = tasks.filter(t => t.col !== 'done' && t.due).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 3);
  $('#projMini').innerHTML = `<div class="kmini">${KCOLS.map(c => `<a class="stat" href="#projekte" style="--c:${c.c};text-decoration:none"><b class="num">${cnt(c.id)}</b><span>${c.name}</span></a>`).join('')}</div>
    ${open.length ? `<div class="toplist" style="margin-top:12px">${open.map(t => `<div><span>${esc(t.title)}</span>${dueChip(t.due)}</div>`).join('')}</div>` : `<p class="empty" style="margin-top:8px">${tasks.length ? 'Keine fälligen Aufgaben.' : 'Noch keine Projekte. Leg im Board oder über die Schnellzeile („Projekt“) eins an.'}</p>`}`;
}

/* ---------- Widget „Gespeichert“ ---------- */
function renderSavedMini() {
  if (!widgetOn('saved')) return;
  const list = saved.slice().sort((a, b) => (b.fav - a.fav) || b.added - a.added).slice(0, 4);
  $('#savedMini').innerHTML = list.length ? list.map(s => { const c = SV_CATS[s.cat] || SV_CATS.links; return `<button data-svopen="${s.id}"><span class="tile sm" style="--c:${c.c}">${ic(c.icon, 'i sm')}</span><span class="t"><b>${esc(s.title)}</b><small>${esc(hostOf(s.url))}</small></span></button>`; }).join('')
    : '<p class="empty">Noch nichts gespeichert.</p>';
}

/* =====================================================================
   KALENDER
   Quellen: Mac-Kalender (EventKit, nur Mac-App) · Kalender-Abos (iCal-Links
   von IServ/WebUntis; in der Mac-App über Python geladen) · eigene Termine.
   ===================================================================== */
const EV_COLORS = ['#4F7BFF', '#A46BFF', '#F25FB0', '#FF9A4D', '#2FA36B', '#2DD4BF', '#EF4444', '#E0B24A'];
let ownEvents = store.get('events', []);
const getFeeds = () => store.get('icsFeeds', []);
const feedCache = {};           // id → { ts, items | error }
const calCache = new Map();     // Tag → Promise<{events, macState}>
const evIndex = {};             // key → Termin (für Details)
setInterval(() => calCache.clear(), 5 * 60 * 1000);

/* ---- iCal lesen ---- */
function icsDate(v, params) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (h == null || /VALUE=DATE(?!-)/.test(params || '')) return { date: new Date(+y, +mo - 1, +d), allDay: h == null };
  return { date: z ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0))) : new Date(+y, +mo - 1, +d, +h, +mi, +(s || 0)), allDay: false };
}
function icsDuration(v) { const m = /P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/.exec(v || ''); if (!m) return 0; return (((+m[1] || 0) * 7 + (+m[2] || 0)) * 86400 + (+m[3] || 0) * 3600 + (+m[4] || 0) * 60 + (+m[5] || 0)) * 1000; }
const icsText = v => v.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
function parseICS(text) {
  const lines = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
  const out = []; let ev = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { ev = { ex: new Set() }; continue; }
    if (line === 'END:VEVENT') { if (ev && ev.start) { if (!ev.end) ev.end = new Date(ev.start.getTime() + (ev.dur || (ev.allDay ? 864e5 : 0))); out.push(ev); } ev = null; continue; }
    if (!ev) continue;
    const i = line.indexOf(':'); if (i < 0) continue;
    const head = line.slice(0, i), val = line.slice(i + 1), name = head.split(';')[0].toUpperCase(), params = head.slice(name.length);
    if (name === 'SUMMARY') ev.title = icsText(val);
    else if (name === 'LOCATION') ev.location = icsText(val);
    else if (name === 'UID') ev.uid = val;
    else if (name === 'DTSTART') { const d = icsDate(val, params); if (d) { ev.start = d.date; ev.allDay = d.allDay; } }
    else if (name === 'DTEND') { const d = icsDate(val, params); if (d) ev.end = d.date; }
    else if (name === 'DURATION') ev.dur = icsDuration(val);
    else if (name === 'RRULE') ev.rrule = Object.fromEntries(val.split(';').map(p => p.split('=')));
    else if (name === 'EXDATE') val.split(',').forEach(x => { const d = icsDate(x, params); if (d) ev.ex.add(d.date.getTime()); });
    else if (name === 'RECURRENCE-ID') { const d = icsDate(val, params); if (d) ev.recur = d.date.getTime(); }
    else if (name === 'STATUS' && val === 'CANCELLED') ev.cancelled = true;
  }
  const overrides = new Set(out.filter(e => e.recur != null).map(e => e.uid + '|' + e.recur));
  out.forEach(e => { if (e.rrule) out.filter(o => o.uid === e.uid && o.recur != null).forEach(o => e.ex.add(o.recur)); });
  return out.filter(e => !e.cancelled || overrides.has(e.uid + '|' + e.recur));
}
function expandICS(ev, rs, re) {
  const dur = ev.end - ev.start;
  const hit = d => d < re && d.getTime() + Math.max(dur, 1) > rs.getTime();
  if (!ev.rrule) return hit(ev.start) ? [ev.start] : [];
  const r = ev.rrule, step = +(r.INTERVAL || 1), until = r.UNTIL ? (icsDate(r.UNTIL) || {}).date : null, count = r.COUNT ? +r.COUNT : Infinity;
  const days = r.BYDAY ? r.BYDAY.split(',').map(x => ({ SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 })[x.slice(-2)]).filter(x => x != null) : null;
  const out = []; let n = 0, guard = 0;
  const emit = d => { if (until && d > until) return false; if (n >= count) return false; n++; if (!ev.ex.has(d.getTime()) && hit(d)) out.push(new Date(d)); return true; };
  const s = ev.start, H = s.getHours(), M = s.getMinutes(), S = s.getSeconds();
  if (r.FREQ === 'WEEKLY' && days && days.length) {
    const wk = new Date(s.getFullYear(), s.getMonth(), s.getDate() - ((s.getDay() + 6) % 7));
    const order = days.map(d => (d + 6) % 7).sort((a, b) => a - b);
    outer: while (wk < re && guard++ < 2000) {
      for (const off of order) { const d = new Date(wk.getFullYear(), wk.getMonth(), wk.getDate() + off, H, M, S); if (d < s) continue; if (d >= re) break outer; if (!emit(d)) break outer; }
      wk.setDate(wk.getDate() + 7 * step);
    }
    return out;
  }
  const cur = new Date(s);
  while (cur < re && guard++ < 4000) {
    if (!emit(cur)) break;
    if (r.FREQ === 'DAILY') cur.setDate(cur.getDate() + step);
    else if (r.FREQ === 'WEEKLY') cur.setDate(cur.getDate() + 7 * step);
    else if (r.FREQ === 'MONTHLY') cur.setMonth(cur.getMonth() + step);
    else if (r.FREQ === 'YEARLY') cur.setFullYear(cur.getFullYear() + step);
    else break;
  }
  return out;
}
async function fetchText(url) {
  url = url.trim().replace(/^webcal:/i, 'https:');
  if (NATIVE && NATIVE.fetch_text) { const r = await NATIVE.fetch_text(url); if (r && r.ok) return r.text; throw new Error((r && r.error) || 'Laden fehlgeschlagen'); }
  const res = await fetch(url, { cache: 'no-store' }); if (!res.ok) throw new Error('HTTP ' + res.status); return res.text();
}
function feedErrorText(msg, url) {
  if (/^HTTP 40[13]/.test(msg)) return 'Der Server verlangt eine Anmeldung oder der Link ist abgelaufen (' + msg + '). Kopiere den Abo-Link neu.';
  if (/^HTTP 404/.test(msg)) return 'Unter diesem Link gibt es keinen Kalender (404). Kopiere den Abo-Link neu.';
  if (/nicht erreichbar|timed out|Name or service|nodename/i.test(msg)) return 'Der Server ist nicht erreichbar. Internet prüfen oder später erneut versuchen.';
  if (/kein Kalender/i.test(msg)) return msg;
  return msg + (url && !/^(https?|webcal):/i.test(url) ? ' Der Link muss mit https:// oder webcal:// beginnen.' : '');
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-feederr]'); if (!b) return;
  const f = getFeeds().find(x => x.id === b.dataset.feederr), c = f && feedCache[f.id]; if (!f) return;
  if (!NATIVE) { macAppOnly('Kalender-Abos', 'kalender'); return; }
  modal(`<div class="glass modal"><div class="mh"><h3>${esc(f.name)}</h3><button class="orb sm" data-close aria-label="Schließen">${ic('x', 'i xs')}</button></div><p class="lead">${esc((c && c.error) || '')}</p><p class="lead" style="overflow-wrap:anywhere"><small>${esc(f.url)}</small></p>
    <div class="row"><button class="btn" data-open-setup="calendar">Abos verwalten</button><button class="btn pri" id="feRetry">${ic('refresh', 'i sm')} Erneut laden</button></div></div>`);
  $('#feRetry').onclick = async () => { const r = await loadFeed(f, true); invalidateCal(); close(); toast(r.error ? 'Weiterhin: ' + r.error : `${f.name}: ${r.items.length} Einträge`, r.error ? 'x' : 'cal'); if (currentView === 'kalender') renderCalendar(); };
});
async function loadFeed(f, force) {
  const c = feedCache[f.id];
  if (!force && c && Date.now() - c.ts < 30 * 60 * 1000) return c;
  try { const text = await fetchText(f.url); if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error(/<html/i.test(text) ? 'Unter dem Link liegt eine Webseite, kein Kalender. Nimm den Abo-Link (iCal/ICS), nicht die Seitenadresse.' : 'Unter dem Link liegt kein Kalender (kein iCal-Format).'); const items = parseICS(text); feedCache[f.id] = { ts: Date.now(), items }; }
  catch (e) { feedCache[f.id] = { ts: Date.now(), items: [], error: NATIVE ? feedErrorText(String(e.message || e), f.url) : 'Im Browser blockiert der Kalender-Server das Laden. In der Mac-App funktioniert das Abo.' }; }
  return feedCache[f.id];
}
async function eventsFor(day) {
  if (calCache.has(day)) return calCache.get(day);
  const p = (async () => {
    const d0 = parseDay(day), d1 = addDays(d0, 1), events = []; let macState = null;
    const push = (e, src) => { e.src = src; e.key = e.key || `${src}:${e.title}:${e.start}`; evIndex[e.key] = e; events.push(e); };
    if (NATIVE) {
      try { const r = NATIVE.events ? await NATIVE.events(day) : (day === isoDay(new Date()) ? await NATIVE.today_events() : { state: 'ok', events: [] }); macState = r.state; (r.events || []).forEach(e => push({ title: e.title, start: e.start, end: e.end, allDay: e.allDay, location: e.location, calendar: e.calendar, color: e.color }, 'mac')); }
      catch (e) { macState = 'error'; }
    }
    for (const f of getFeeds().filter(f => f.on !== false)) {
      const c = await loadFeed(f);
      c.items.forEach(ev => expandICS(ev, d0, d1).forEach(st => { const s = st.getTime() / 1000, en = s + (ev.end - ev.start) / 1000; push({ title: ev.title || '(ohne Titel)', start: ev.allDay ? d0.getTime() / 1000 : s, end: ev.allDay ? d1.getTime() / 1000 : en, allDay: ev.allDay, location: ev.location, calendar: f.name, color: f.color, key: `ics:${f.id}:${ev.uid}:${s}` }, 'ics'); }));
    }
    ownEvents.filter(o => o.date === day).forEach(o => {
      const s = o.allDay ? d0.getTime() / 1000 : new Date(`${o.date}T${o.start || '08:00'}`).getTime() / 1000;
      const en = o.allDay ? d1.getTime() / 1000 : new Date(`${o.date}T${o.end || o.start || '09:00'}`).getTime() / 1000;
      push({ title: o.title, start: s, end: Math.max(en, s + 900), allDay: !!o.allDay, location: o.location, calendar: 'Eigene Termine', color: o.color, ownId: o.id, key: 'own:' + o.id }, 'own');
    });
    events.sort((a, b) => (b.allDay - a.allDay) || a.start - b.start);
    return { events, macState };
  })();
  calCache.set(day, p);
  return p;
}
function invalidateCal() { calCache.clear(); renderToday(); if (currentView === 'kalender') renderCalendar(); updateBadge(); }

/* ---- Kalenderansicht ---- */
let selDay = isoDay(new Date());
async function renderCalendar() {
  const d = parseDay(selDay), today = isoDay(new Date());
  $('#calSub').textContent = (selDay === today ? 'Heute · ' : '') + FMT_DAY.format(d);
  const mon = addDays(d, -((d.getDay() + 6) % 7));
  const week = [...Array(7)].map((_, i) => addDays(mon, i));
  $('#calWeek').innerHTML = week.map(w => { const k = isoDay(w); return `<button data-day="${k}" class="${k === today ? 'today' : ''}" aria-pressed="${k === selDay}"><small>${new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(w)}</small><b class="num">${w.getDate()}</b><span class="dots" data-dots="${k}"></span></button>`; }).join('');
  week.forEach(async w => { const k = isoDay(w), r = await eventsFor(k), el = $(`[data-dots="${k}"]`); if (el) el.innerHTML = '<i></i>'.repeat(Math.min(4, r.events.length)); });
  const r = await eventsFor(selDay);
  if (isoDay(parseDay(selDay)) !== selDay) return;
  const all = r.events.filter(e => e.allDay), timed = r.events.filter(e => !e.allDay);
  const dayStart = d.getTime() / 1000;
  let h0 = 7, h1 = 19;
  timed.forEach(e => { h0 = Math.min(h0, Math.floor((e.start - dayStart) / 3600)); h1 = Math.max(h1, Math.ceil((e.end - dayStart) / 3600)); });
  h0 = Math.max(0, h0); h1 = Math.min(24, h1);
  const HR = 48, px = t => ((t - dayStart) / 3600 - h0) * HR;
  /* Spalten für überlappende Termine */
  const lanes = []; timed.forEach(e => { let l = lanes.findIndex(end => end <= e.start); if (l < 0) { l = lanes.length; lanes.push(0); } lanes[l] = e.end; e._lane = l; });
  timed.forEach(e => { e._cols = Math.max(1, timed.filter(o => o.start < e.end && o.end > e.start).reduce((m, o) => Math.max(m, o._lane + 1), 1)); });
  const now = Date.now() / 1000;
  $('#calDay').innerHTML = `${all.length ? `<div class="allday">${all.map(e => `<button data-evid="${esc(e.key)}" style="--c:${esc(e.color)}"><span style="--c:${esc(e.color)}">${esc(e.title)}</span></button>`).join('')}</div>` : ''}
    <div class="tl"><div class="hrs">${[...Array(h1 - h0)].map((_, i) => `<span class="num">${pad(h0 + i)}:00</span>`).join('')}</div>
    <div class="lane" style="height:${(h1 - h0) * HR}px">${timed.map(e => { const top = px(e.start), hgt = Math.max(14, px(e.end) - top - 2), w = 100 / e._cols;
      return `<button class="blk${hgt < 30 ? ' mini' : ''}" data-evid="${esc(e.key)}" style="--c:${esc(e.color)};top:${top + 1}px;height:${hgt}px;left:calc(${w * e._lane}% + 6px);right:auto;width:calc(${w}% - 12px)">${hgt < 46 ? `<b>${esc(e.title)} <small class="num">${hm(e.start)}${e.location ? ' · ' + esc(e.location) : ''}</small></b>` : `<b>${esc(e.title)}</b><small class="num">${hm(e.start)} – ${hm(e.end)}${e.location ? ' · ' + esc(e.location) : ''}</small>`}</button>`; }).join('')}
    ${selDay === today && now > dayStart + h0 * 3600 && now < dayStart + h1 * 3600 ? `<span class="nowline" style="top:${px(now)}px"></span>` : ''}</div></div>
    ${!r.events.length ? '<p class="empty dayempty">Keine Termine an diesem Tag.</p>' : ''}`;
  /* Nächste Termine (7 Tage) */
  const upcoming = [];
  for (let i = 0; i < 7 && upcoming.length < 8; i++) { const k = isoDay(addDays(new Date(), i)), rr = await eventsFor(k); rr.events.filter(e => e.end > now).forEach(e => upcoming.push(e)); }
  $('#calNextList').innerHTML = upcoming.length ? upcoming.slice(0, 8).map(e => { const dd = new Date(e.start * 1000), lbl = isoDay(dd) === today ? 'Heute' : isoDay(dd) === isoDay(addDays(new Date(), 1)) ? 'Morgen' : new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' }).format(dd);
    return `<div class="ev"><time class="num" style="font-size:11px">${lbl}<br>${e.allDay ? '' : hm(e.start)}</time><button class="box" data-evid="${esc(e.key)}" style="--c:${esc(e.color)}"><b>${esc(e.title)}</b><span>${esc(e.calendar || '')}</span></button></div>`; }).join('')
    : '<p class="empty">In den nächsten 7 Tagen steht nichts an.</p>';
  /* Quellen */
  const src = [];
  if (NATIVE) src.push(`<div class="src" style="--c:#64748B"><i></i><span style="flex:1">Mac-Kalender</span>${r.macState === 'ok' ? '<span class="ok">verbunden</span>' : r.macState === 'ask' ? '<button class="btn sm" data-cal-connect>Verbinden</button>' : '<button class="btn sm" data-cal-prefs>Freigeben</button>'}</div>`);
  getFeeds().forEach(f => { const c = feedCache[f.id]; src.push(`<div class="src" style="--c:${esc(f.color)}"><i></i><span style="flex:1">${esc(f.name)}</span>${c && c.error ? `<button class="bad srcerr" data-feederr="${esc(f.id)}" title="${esc(c.error)}">${NATIVE ? 'Fehler' : 'nur Mac-App'} ${ic('right', 'i xs')}</button>` : c ? `<span class="ok">${c.items.length} Einträge</span>` : ''}</div>`); });
  src.push(`<div class="src" style="--c:#4F7BFF"><i></i><span style="flex:1">Eigene Termine</span><span>${ownEvents.length}</span></div>`);
  if (!NATIVE && !getFeeds().length) src.push('<p class="empty" style="padding:4px 0 0">Kalender-Abos von IServ oder WebUntis lädt die Mac-App. Im Browser blockieren die Server das meist.</p>');
  $('#calSrcs').innerHTML = src.join('');
}
$('#calWeek').addEventListener('click', e => { const b = e.target.closest('[data-day]'); if (b) { selDay = b.dataset.day; renderCalendar(); } });
$('#calPrev').addEventListener('click', () => { selDay = isoDay(addDays(parseDay(selDay), -1)); renderCalendar(); });
$('#calNext').addEventListener('click', () => { selDay = isoDay(addDays(parseDay(selDay), 1)); renderCalendar(); });
$('#calToday').addEventListener('click', () => { selDay = isoDay(new Date()); renderCalendar(); });
$('#evAdd').addEventListener('click', () => editEvent(null));
function showEvent(key) {
  const e = evIndex[key]; if (!e) return;
  const d = new Date(e.start * 1000);
  modal(`<div class="glass modal"><div class="mh"><h3 style="border-left:4px solid ${esc(e.color)};padding-left:10px">${esc(e.title)}</h3><button class="orb sm" data-close aria-label="Schließen">${ic('x', 'i xs')}</button></div>
    <p class="lead">${FMT_DAY.format(d)} · ${e.allDay ? 'ganztägig' : hm(e.start) + ' – ' + hm(e.end) + ' Uhr'}</p>
    ${e.location ? `<p class="lead">${ic('pin', 'i xs')} ${esc(e.location)}</p>` : ''}
    <p class="lead">${ic('cal', 'i xs')} ${esc(e.calendar || '')}</p>
    <div class="row">${e.ownId ? '<button class="btn danger" id="evDel">Löschen</button><button class="btn" id="evEdit">Bearbeiten</button>' : ''}<button class="btn pri" id="evTask">Als Aufgabe</button></div></div>`);
  $('#evTask').onclick = () => { addTask({ title: e.title, due: isoDay(d) }); close(); toast('Als Aufgabe angelegt', 'kanban'); };
  $('#evDel')?.addEventListener('click', () => { ownEvents = ownEvents.filter(o => o.id !== e.ownId); store.set('events', ownEvents); close(); invalidateCal(); toast('Termin gelöscht'); });
  $('#evEdit')?.addEventListener('click', () => editEvent(ownEvents.find(o => o.id === e.ownId)));
}
function editEvent(o) {
  const isNew = !o; const d = o ? { ...o } : { id: uid(), title: '', date: selDay, start: '08:00', end: '09:00', allDay: false, color: EV_COLORS[0], location: '' };
  modal(`<form class="glass modal" id="evf"><h3>${isNew ? 'Neuer Termin' : 'Termin bearbeiten'}</h3><p class="lead">Eigene Termine siehst du auf allen Geräten, auf die du deine Einstellungen überträgst.</p>
    <label class="field">Titel<input id="evT" required value="${esc(d.title)}" placeholder="z. B. Fachkonferenz Mathe"></label>
    <div class="three"><label class="field">Datum<input type="date" id="evD" required value="${esc(d.date)}"></label><label class="field">Beginn<input type="time" id="evS" value="${esc(d.start)}"></label><label class="field">Ende<input type="time" id="evE" value="${esc(d.end)}"></label></div>
    <div class="two"><label class="field">Ort<input id="evL" value="${esc(d.location || '')}"></label><div class="field">Ganztägig<button type="button" class="sw" id="evA" role="switch" aria-checked="${!!d.allDay}"></button></div></div>
    <div class="field">Farbe<div class="swatches" id="evC">${EV_COLORS.map(c => `<button type="button" style="background:${c}" data-c="${c}" aria-pressed="${c === d.color}" aria-label="Farbe"></button>`).join('')}</div></div>
    <div class="row"><button type="button" class="btn" data-close>Abbrechen</button><button class="btn pri">Speichern</button></div></form>`);
  $('#evA').onclick = () => { d.allDay = !d.allDay; $('#evA').setAttribute('aria-checked', d.allDay); };
  $('#evC').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; d.color = b.dataset.c; $$('#evC button').forEach(x => x.setAttribute('aria-pressed', x === b)); };
  $('#evf').onsubmit = e => {
    e.preventDefault();
    Object.assign(d, { title: $('#evT').value.trim(), date: $('#evD').value, start: $('#evS').value, end: $('#evE').value || $('#evS').value, location: $('#evL').value.trim() });
    if (isNew) ownEvents.push(d); else ownEvents[ownEvents.findIndex(x => x.id === d.id)] = d;
    store.set('events', ownEvents); selDay = d.date; close(); invalidateCal(); toast('Termin gespeichert', 'cal');
  };
  setTimeout(() => $('#evT').focus(), 50);
}

/* =====================================================================
   PROJEKTE (Kanban)
   ===================================================================== */
const KCOLS = [{ id: 'plan', name: 'In Planung', c: '#A46BFF' }, { id: 'doing', name: 'In Bearbeitung', c: '#4F7BFF' }, { id: 'done', name: 'Fertig', c: '#4ADE80' }];
const AREAS = { schule: { name: 'Schule', c: '#4F7BFF' }, handball: { name: 'Handball', c: '#EF4444' }, buildspace: { name: 'buildspace', c: '#A46BFF' }, privat: { name: 'Privat', c: '#2FA36B' }, sonst: { name: 'Sonstiges', c: '#64748B' } };
let tasks = store.get('tasks', []);
let kFilterArea = 'all';
const saveTasks = () => { store.set('tasks', tasks); renderProjMini(); updateBadge(); };
function addTask(p) { tasks.unshift(Object.assign({ id: uid(), title: '', note: '', due: '', area: 'schule', col: 'plan', created: Date.now() }, p)); saveTasks(); if (currentView === 'projekte') renderKanban(); }
function dueChip(due, col) {
  if (!due) return '';
  const n = daysUntil(due), lbl = n === 0 ? 'heute' : n === 1 ? 'morgen' : n === -1 ? 'gestern' : n < 0 ? `seit ${-n} Tagen` : new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' }).format(parseDay(due));
  return `<span class="due${col !== 'done' && n < 0 ? ' late' : col !== 'done' && n === 0 ? ' today' : ''}">${ic('clock', 'i xs')} ${lbl}</span>`;
}
function renderKanban() {
  $('#kFilter').innerHTML = [['all', 'Alle']].concat(Object.entries(AREAS).map(([k, v]) => [k, v.name])).map(([k, n]) => `<button class="chipbtn" data-ka="${k}" aria-pressed="${kFilterArea === k}">${n}</button>`).join('');
  const vis = tasks.filter(t => kFilterArea === 'all' || t.area === kFilterArea);
  $('#kanban').innerHTML = KCOLS.map((c, ci) => { const list = vis.filter(t => t.col === c.id);
    return `<section class="glass kcol" data-col="${c.id}" style="--c:${c.c}"><div class="kcol-h"><i class="dot"></i><b>${c.name}</b><small class="num">${list.length}</small></div>
      ${list.map(t => { const a = AREAS[t.area] || AREAS.sonst; return `<article class="kcard" data-task="${t.id}" tabindex="0"><b>${esc(t.title)}</b>${t.note ? `<p>${esc(t.note)}</p>` : ''}<div class="kmeta"><span class="tag" style="--c:${a.c}">${a.name}</span>${dueChip(t.due, t.col)}</div>
        <div class="kmove">${ci > 0 ? `<button data-kmv="-1" aria-label="Nach links">${ic('left', 'i xs')}</button>` : ''}${ci < 2 ? `<button data-kmv="1" aria-label="Nach rechts">${ic('right', 'i xs')}</button>` : ''}</div></article>`; }).join('')}
      <button class="kadd" data-kadd="${c.id}">${ic('plus', 'i xs')} Aufgabe</button></section>`; }).join('');
}
$('#kFilter').addEventListener('click', e => { const b = e.target.closest('[data-ka]'); if (b) { kFilterArea = b.dataset.ka; renderKanban(); } });
$('#kNew').addEventListener('click', () => editTask(null, 'plan'));
$('#kanban').addEventListener('click', e => {
  if (kDragged) return;
  const add = e.target.closest('[data-kadd]'); if (add) { editTask(null, add.dataset.kadd); return; }
  const card = e.target.closest('[data-task]'); if (!card) return; const t = tasks.find(x => x.id === card.dataset.task); if (!t) return;
  const mv = e.target.closest('[data-kmv]');
  if (mv) { const i = KCOLS.findIndex(c => c.id === t.col) + +mv.dataset.kmv; if (KCOLS[i]) { t.col = KCOLS[i].id; saveTasks(); renderKanban(); if (t.col === 'done') toast('Erledigt – stark!', 'check'); } return; }
  editTask(t);
});
$('#kanban').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-task]')) editTask(tasks.find(x => x.id === e.target.dataset.task)); });
/* Ziehen mit Maus, Finger oder Stift */
let kDrag = null, kDragged = false;
$('#kanban').addEventListener('pointerdown', e => {
  const card = e.target.closest('.kcard'); if (!card || e.target.closest('button') || e.button > 0) return;
  kDrag = { card, id: card.dataset.task, x: e.clientX, y: e.clientY, started: false, pid: e.pointerId }; kDragged = false;
});
window.addEventListener('pointermove', e => {
  if (!kDrag) return;
  if (!kDrag.started) {
    if (Math.hypot(e.clientX - kDrag.x, e.clientY - kDrag.y) < 7) return;
    kDrag.started = true; kDragged = true;
    const g = kDrag.card.cloneNode(true); g.classList.add('kghost'); g.style.width = kDrag.card.offsetWidth + 'px'; document.body.appendChild(g); kDrag.ghost = g;
    kDrag.card.classList.add('drag');
  }
  e.preventDefault();
  kDrag.ghost.style.left = (e.clientX - 30) + 'px'; kDrag.ghost.style.top = (e.clientY - 20) + 'px';
  const el = document.elementFromPoint(e.clientX, e.clientY), col = el && el.closest('.kcol');
  $$('.kcol').forEach(c => c.classList.toggle('over', c === col)); kDrag.col = col; kDrag.py = e.clientY;
}, { passive: false });
window.addEventListener('pointerup', () => {
  if (!kDrag) return; const d = kDrag; kDrag = null;
  if (!d.started) return;
  d.ghost.remove(); $$('.kcol').forEach(c => c.classList.remove('over'));
  const t = tasks.find(x => x.id === d.id);
  if (t && d.col) {
    const newCol = d.col.dataset.col, before = [...d.col.querySelectorAll('.kcard:not(.drag)')].find(c => { const r = c.getBoundingClientRect(); return d.py < r.top + r.height / 2; });
    tasks.splice(tasks.indexOf(t), 1);
    const bi = before ? tasks.findIndex(x => x.id === before.dataset.task) : -1;
    if (bi >= 0) tasks.splice(bi, 0, t); else { const last = tasks.map(x => x.col).lastIndexOf(newCol); tasks.splice(last + 1, 0, t); }
    const was = t.col; t.col = newCol; saveTasks(); if (newCol === 'done' && was !== 'done') toast('Erledigt – stark!', 'check');
  }
  renderKanban(); setTimeout(() => { kDragged = false; }, 50);
});
function editTask(t, col) {
  const isNew = !t; const d = t ? { ...t } : { id: uid(), title: '', note: '', due: '', area: kFilterArea !== 'all' ? kFilterArea : 'schule', col: col || 'plan', created: Date.now() };
  modal(`<form class="glass modal" id="tf"><h3>${isNew ? 'Neue Aufgabe' : 'Aufgabe bearbeiten'}</h3>
    <label class="field">Titel<input id="tT" required value="${esc(d.title)}" placeholder="z. B. Klassenarbeit 7b korrigieren"></label>
    <label class="field">Notiz<textarea id="tN" placeholder="Details, Schritte, Links …">${esc(d.note)}</textarea></label>
    <div class="two"><label class="field">Fällig am<input type="date" id="tD" value="${esc(d.due)}"></label><label class="field">Bereich<select id="tA">${Object.entries(AREAS).map(([k, v]) => `<option value="${k}"${k === d.area ? ' selected' : ''}>${v.name}</option>`).join('')}</select></label></div>
    <div class="field">Status<div class="seg" id="tC">${KCOLS.map(c => `<button type="button" data-c="${c.id}" aria-pressed="${c.id === d.col}">${c.name}</button>`).join('')}</div></div>
    <div class="row">${isNew ? '' : '<button type="button" class="btn danger" id="tDel">Löschen</button>'}<span class="spacer"></span><button type="button" class="btn" data-close>Abbrechen</button><button class="btn pri">Speichern</button></div></form>`);
  $('#tC').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; d.col = b.dataset.c; $$('#tC button').forEach(x => x.setAttribute('aria-pressed', x === b)); };
  $('#tDel')?.addEventListener('click', () => { tasks = tasks.filter(x => x.id !== d.id); saveTasks(); close(); renderKanban(); toast('Aufgabe gelöscht'); });
  $('#tf').onsubmit = e => { e.preventDefault(); Object.assign(d, { title: $('#tT').value.trim(), note: $('#tN').value.trim(), due: $('#tD').value, area: $('#tA').value });
    if (isNew) tasks.unshift(d); else tasks[tasks.findIndex(x => x.id === d.id)] = d; saveTasks(); close(); if (currentView === 'projekte') renderKanban(); toast('Gespeichert'); };
  setTimeout(() => $('#tT').focus(), 50);
}

/* =====================================================================
   GESPEICHERT
   ===================================================================== */
const SV_CATS = { unterricht: { name: 'Unterricht', c: '#4F7BFF', icon: 'school' }, artikel: { name: 'Artikel', c: '#A46BFF', icon: 'file' }, designs: { name: 'Designs', c: '#C9A13B', icon: 'sparkle' }, links: { name: 'Links', c: '#2DA597', icon: 'link' } };
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };
let saved = store.get('saved', null) || [
  { id: uid(), url: 'https://buildspaceos.de/#/promptlabor', title: 'Promptlabor', note: 'Prompts für eigene Lernspiele und Tools.', cat: 'unterricht', added: Date.now() - 3000, fav: true },
  { id: uid(), url: 'https://buildspaceos.de/ki-guide-lehrkraefte.html', title: 'KI-Guide für Lehrkräfte', note: 'KI sinnvoll im Unterricht einsetzen.', cat: 'artikel', added: Date.now() - 2000, fav: false },
  { id: uid(), url: 'https://buildspaceos.de/kerncurriculum-mathematik.html', title: 'Kerncurriculum Mathematik', note: 'Kompetenzen und Inhalte nach Jahrgang.', cat: 'unterricht', added: Date.now() - 1000, fav: false }
];
let svFilter = 'all';
const saveSaved = () => { store.set('saved', saved); renderSavedMini(); };
function renderSaved() {
  $('#svFilter').innerHTML = [['all', 'Alle'], ['fav', '★']].concat(Object.entries(SV_CATS).map(([k, v]) => [k, v.name])).map(([k, n]) => `<button data-svf="${k}" aria-pressed="${svFilter === k}">${n}</button>`).join('');
  const list = saved.filter(s => svFilter === 'all' || (svFilter === 'fav' ? s.fav : s.cat === svFilter)).sort((a, b) => (b.fav - a.fav) || b.added - a.added);
  $('#savedGrid').innerHTML = list.length ? list.map(s => { const c = SV_CATS[s.cat] || SV_CATS.links;
    return `<article class="glass sv" style="--c:${c.c}"><button class="cover" data-svopen="${s.id}" aria-label="${esc(s.title)} öffnen">${ic(c.icon)}${s.fav ? `<span class="fav">${ic('star', 'i sm')}</span>` : ''}<span class="ctag">${c.name}</span></button>
      <div class="body"><h4>${esc(s.title)}</h4><p>${esc(s.note || '')}</p><div class="sm"><span>${esc(hostOf(s.url))} · ${new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'short' }).format(s.added)}</span>
      <button data-svfav="${s.id}" aria-label="Favorit">${ic('star', 'i xs')}</button><button data-svedit="${s.id}" aria-label="Bearbeiten">${ic('edit', 'i xs')}</button><button data-svopen="${s.id}" aria-label="Öffnen">${ic('ext', 'i xs')}</button></div></div></article>`; }).join('')
    : `<p class="empty">Hier ist noch nichts. Mit „Link hinzufügen“ speicherst du Webseiten, Materialien und Ideen.</p>`;
}
$('#svFilter').addEventListener('click', e => { const b = e.target.closest('[data-svf]'); if (b) { svFilter = b.dataset.svf; renderSaved(); } });
$('#svAdd').addEventListener('click', () => editSaved(null));
document.addEventListener('click', e => {
  const o = e.target.closest('[data-svopen]'); if (o) { const s = saved.find(x => x.id === o.dataset.svopen); if (s) openUrl(s.url, s.title); return; }
  const f = e.target.closest('[data-svfav]'); if (f) { const s = saved.find(x => x.id === f.dataset.svfav); if (s) { s.fav = !s.fav; saveSaved(); renderSaved(); } return; }
  const ed = e.target.closest('[data-svedit]'); if (ed) editSaved(saved.find(x => x.id === ed.dataset.svedit));
});
function editSaved(s, preset) {
  const isNew = !s; const d = s ? { ...s } : Object.assign({ id: uid(), url: '', title: '', note: '', cat: 'links', added: Date.now(), fav: false }, preset || {});
  modal(`<form class="glass modal" id="svf"><h3>${isNew ? 'Link speichern' : 'Lesezeichen bearbeiten'}</h3>
    <label class="field">Adresse<input id="sU" required value="${esc(d.url)}" placeholder="https://…" autocapitalize="off" spellcheck="false"></label>
    <div class="two"><label class="field">Titel<input id="sT" value="${esc(d.title)}" placeholder="wird sonst aus der Adresse übernommen"></label><label class="field">Kategorie<select id="sC">${Object.entries(SV_CATS).map(([k, v]) => `<option value="${k}"${k === d.cat ? ' selected' : ''}>${v.name}</option>`).join('')}</select></label></div>
    <label class="field">Notiz<textarea id="sN" placeholder="Wofür ist das?">${esc(d.note)}</textarea></label>
    <div class="row">${isNew ? '' : '<button type="button" class="btn danger" id="sDel">Löschen</button>'}<span class="spacer"></span><button type="button" class="btn" data-close>Abbrechen</button><button class="btn pri">Speichern</button></div></form>`);
  $('#sDel')?.addEventListener('click', () => { saved = saved.filter(x => x.id !== d.id); saveSaved(); close(); renderSaved(); toast('Lesezeichen gelöscht'); });
  $('#svf').onsubmit = e => { e.preventDefault(); let u = $('#sU').value.trim(); if (!/^[a-z]+:/i.test(u)) u = 'https://' + u;
    Object.assign(d, { url: u, title: $('#sT').value.trim() || hostOf(u), note: $('#sN').value.trim(), cat: $('#sC').value });
    if (isNew) saved.unshift(d); else saved[saved.findIndex(x => x.id === d.id)] = d; saveSaved(); close(); if (currentView === 'gespeichert') renderSaved(); toast('Gespeichert', 'bookmark'); };
  setTimeout(() => (d.url ? $('#sT') : $('#sU')).focus(), 50);
}

/* =====================================================================
   ZEICHNEN: gemeinsame Werkzeugleiste
   ===================================================================== */
const INK_COLORS = ['#111111', '#ffffff', '#2563eb', '#dc2626', '#16a34a', '#ea580c', '#9333ea', '#eab308'];
const INK_TOOLS = [['pen', 'pen', 'Stift'], ['marker', 'marker', 'Marker'], ['eraser', 'eraser', 'Radierer'], ['text', 'type', 'Text']];
function inkBar(st, extra) {
  return `<div class="grp">${INK_TOOLS.map(([k, i, n]) => `<button class="tool" data-tool="${k}" aria-pressed="${st.tool === k}" aria-label="${n}" title="${n}">${ic(i)}</button>`).join('')}</div>
    <div class="grp">${INK_COLORS.map(c => `<button class="colr" data-col="${c}" style="background:${c}" aria-pressed="${st.color === c}" aria-label="Farbe ${c}"></button>`).join('')}</div>
    <div class="grp">${[1, 2, 3].map(s => `<button class="szb" data-size="${s}" aria-pressed="${st.size === s}" aria-label="Stärke ${s}"><i style="width:${s * 4 + 2}px;height:${s * 4 + 2}px"></i></button>`).join('')}</div>
    <div class="grp"><button class="tool" data-act="undo" aria-label="Rückgängig" title="Rückgängig (⌘Z)">${ic('undo')}</button><button class="tool" data-act="redo" aria-label="Wiederholen" title="Wiederholen">${ic('redo')}</button><button class="tool" data-act="clear" aria-label="Alles löschen" title="Alles löschen">${ic('trash')}</button></div>
    ${extra || ''}`;
}
function bindInkBar(bar, st, apply, acts) {
  bar.onclick = e => {
    const t = e.target.closest('[data-tool]'), c = e.target.closest('[data-col]'), s = e.target.closest('[data-size]'), a = e.target.closest('[data-act]');
    if (t) st.tool = t.dataset.tool; if (c) st.color = c.dataset.col; if (s) st.size = +s.dataset.size;
    if (t || c || s) { $$('[data-tool]', bar).forEach(x => x.setAttribute('aria-pressed', x.dataset.tool === st.tool)); $$('[data-col]', bar).forEach(x => x.setAttribute('aria-pressed', x.dataset.col === st.color)); $$('[data-size]', bar).forEach(x => x.setAttribute('aria-pressed', +x.dataset.size === st.size)); store.set('inkPrefs', { tool: st.tool, color: st.color, size: st.size }); apply(); }
    if (a && acts[a.dataset.act]) acts[a.dataset.act](a);
  };
}

/* =====================================================================
   WHITEBOARD
   ===================================================================== */
const WB_W = 1600, WB_H = 1000;
const WB_BGS = [['white', 'Weiß'], ['grid', 'Kästchen'], ['lines', 'Linien'], ['dark', 'Dunkel'], ['green', 'Tafel']];
let boards = store.get('boards', null) || [{ id: uid(), name: 'Tafel 1', bg: 'white', data: { strokes: [], texts: [] } }];
let wbActive = store.get('board', boards[0].id); if (typeof wbActive !== 'string' || !boards.some(b => b.id === wbActive)) wbActive = boards[0].id;
let wb = null, wbSaveT = null, wbRO = null;
const wbState = Object.assign({ tool: 'pen', color: '#111111', size: 2 }, store.get('inkPrefs', {}));
const wbBoard = () => boards.find(b => b.id === wbActive) || boards[0];
function wbSave() { clearTimeout(wbSaveT); wbSaveT = setTimeout(() => store.set('boards', boards), 400); }
function wbLeave() { if (wbSaveT) { clearTimeout(wbSaveT); store.set('boards', boards); } if (wbRO) { wbRO.disconnect(); wbRO = null; } wbExitFull(); }
function renderWhiteboard() {
  const b = wbBoard(); wbActive = b.id; store.set('board', b.id);
  $('#wbTabs').innerHTML = boards.map(x => `<button class="chipbtn" data-wb="${x.id}" aria-pressed="${x.id === b.id}">${esc(x.name)}</button>`).join('') +
    `<button class="orb sm" id="wbAddB" aria-label="Neue Tafel">${ic('plus', 'i xs')}</button><button class="orb sm" id="wbRen" aria-label="Tafel umbenennen">${ic('edit', 'i xs')}</button>${boards.length > 1 ? `<button class="orb sm" id="wbDelB" aria-label="Tafel löschen">${ic('trash', 'i xs')}</button>` : ''}`;
  $('#wbBar').innerHTML = inkBar(wbState, `<div class="grp"><select id="wbBg" class="chipbtn" aria-label="Hintergrund" style="height:36px">${WB_BGS.map(([k, n]) => `<option value="${k}"${k === b.bg ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="grp"><button class="tool" data-act="png" aria-label="Als Bild sichern" title="Als Bild sichern">${ic('download')}</button><button class="tool" data-act="full" aria-label="Vollbild" title="Vollbild für den Beamer">${ic('expand')}</button></div>`);
  const box = $('#wbBox');
  box.innerHTML = '<canvas class="bgc"></canvas><canvas class="ink"></canvas>';
  wbFit();
  wb = new Ink.InkLayer($('.ink', box), { w: WB_W, h: WB_H, data: b.data, host: box, onChange: () => { wbSave(); wbUndoState(); } });
  wbApply(); wbPaintBg(); wbUndoState();
  if (wbRO) wbRO.disconnect();
  wbRO = new ResizeObserver(() => { wbFit(); wb.resize(); wbPaintBg(); }); wbRO.observe($('#main'));
  bindInkBar($('#wbBar'), wbState, wbApply, {
    undo: () => wb.undo(), redo: () => wb.redo(),
    clear: btn => { if (btn.dataset.sure) { wb.clear(); delete btn.dataset.sure; toast('Tafel geleert – Rückgängig holt alles zurück', 'undo'); } else { btn.dataset.sure = 1; toast('Zum Leeren noch einmal tippen', 'trash'); setTimeout(() => delete btn.dataset.sure, 2500); } },
    png: async () => { const cv = document.createElement('canvas'), k = 1.5; cv.width = WB_W * k; cv.height = WB_H * k; const g = cv.getContext('2d'); Ink.paintBg(g, b.bg, WB_W, WB_H, k); Ink.InkLayer.paint(g, b.data, k); deliverFile(`${b.name.replace(/[^\wäöüÄÖÜß -]/g, '')}.png`, cv.toDataURL('image/png')); },
    full: () => wbToggleFull()
  });
  $('#wbBg').onchange = e => { b.bg = e.target.value; if ((b.bg === 'dark' || b.bg === 'green') && wbState.color === '#111111') wbState.color = '#ffffff'; if (!(b.bg === 'dark' || b.bg === 'green') && wbState.color === '#ffffff') wbState.color = '#111111'; wbSave(); renderWhiteboard(); };
}
function wbApply() { if (!wb) return; wb.tool = wbState.tool; wb.color = wbState.color; wb.size = wbState.size; wb.textSize = [0, 28, 40, 60][wbState.size]; $('#wbBox').style.cursor = wbState.tool === 'text' ? 'text' : 'crosshair'; }
function wbUndoState() { const u = $('#wbBar [data-act="undo"]'), r = $('#wbBar [data-act="redo"]'); if (u) u.disabled = !wb.canUndo(); if (r) r.disabled = !wb.canRedo(); }
function wbFit() {
  const box = $('#wbBox'); if (!box) return;
  if (box.classList.contains('full')) { const w = Math.min(innerWidth, innerHeight * WB_W / WB_H); Object.assign(box.style, { width: w + 'px', height: w * WB_H / WB_W + 'px', left: (innerWidth - w) / 2 + 'px', top: (innerHeight - w * WB_H / WB_W) / 2 + 'px' }); return; }
  const avail = $('#main').clientWidth - parseFloat(getComputedStyle($('#main')).paddingLeft) - parseFloat(getComputedStyle($('#main')).paddingRight);
  const maxH = Math.max(320, innerHeight - box.getBoundingClientRect().top - 30 + window.scrollY);
  const w = Math.min(avail, maxH * WB_W / WB_H);
  Object.assign(box.style, { width: w + 'px', height: w * WB_H / WB_W + 'px', margin: '0 auto', left: '', top: '' });
}
function wbPaintBg() { const cv = $('#wbBox .bgc'); if (!cv) return; const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2); cv.width = r.width * dpr; cv.height = r.height * dpr; Ink.paintBg(cv.getContext('2d'), wbBoard().bg, WB_W, WB_H, cv.width / WB_W); }
function wbToggleFull() {
  const box = $('#wbBox'), on = !box.classList.contains('full');
  box.classList.toggle('full', on);
  if (on) { const x = document.createElement('div'); x.className = 'board-exit'; x.innerHTML = `<button class="orb" id="wbExit">${ic('shrink', 'i sm')} Vollbild beenden</button>`; document.body.appendChild(x); $('#wbExit').onclick = wbExitFull; const bar = $('#wbBar'); bar.dataset.full = 1; bar.style.cssText = 'position:fixed;z-index:76;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom,0px));margin:0;background:var(--panel)'; }
  wbFit(); wb.resize(); wbPaintBg();
}
function wbExitFull() { const box = $('#wbBox'); if (!box || !box.classList.contains('full')) return; box.classList.remove('full'); $('.board-exit')?.remove(); const bar = $('#wbBar'); bar.style.cssText = ''; delete bar.dataset.full; wbFit(); wb && (wb.resize(), wbPaintBg()); }
document.addEventListener('click', e => {
  const t = e.target.closest('[data-wb]'); if (t) { wbLeave(); wbActive = t.dataset.wb; renderWhiteboard(); return; }
  if (e.target.closest('#wbAddB')) { const b = { id: uid(), name: 'Tafel ' + (boards.length + 1), bg: 'white', data: { strokes: [], texts: [] } }; boards.push(b); wbActive = b.id; store.set('boards', boards); renderWhiteboard(); return; }
  if (e.target.closest('#wbRen')) { const b = wbBoard(); modal(`<form class="glass modal" id="rnf"><h3>Tafel umbenennen</h3><label class="field">Name<input id="rnN" value="${esc(b.name)}" maxlength="30"></label><div class="row"><button type="button" class="btn" data-close>Abbrechen</button><button class="btn pri">Speichern</button></div></form>`); $('#rnN').select(); $('#rnf').onsubmit = ev => { ev.preventDefault(); b.name = $('#rnN').value.trim() || b.name; store.set('boards', boards); close(); renderWhiteboard(); }; return; }
  if (e.target.closest('#wbDelB')) { const btn = e.target.closest('#wbDelB'); if (!btn.dataset.sure) { btn.dataset.sure = 1; toast('Zum Löschen der Tafel noch einmal tippen', 'trash'); setTimeout(() => delete btn.dataset.sure, 2500); return; } boards = boards.filter(b => b.id !== wbActive); wbActive = boards[0].id; store.set('boards', boards); renderWhiteboard(); toast('Tafel gelöscht'); }
});

/* =====================================================================
   DATEIEN (PDF & Bilder mit Stift/Text bearbeiten)
   Browser: Dateien in IndexedDB · Mac-App: Dateien im Ordner
   ~/Library/Application Support/Cockpit/dateien (über NATIVE).
   ===================================================================== */
const idb = (() => {
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((res, rej) => { const r = indexedDB.open('cockpit-files', 1); r.onupgradeneeded = () => r.result.createObjectStore('files'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('files', mode), st = t.objectStore('files'), out = fn(st); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); }); };
  return { put: (id, blob) => tx('readwrite', st => st.put(blob, id)), get: id => tx('readonly', st => st.get(id)), del: id => tx('readwrite', st => st.delete(id)) };
})();
const FS = {
  async put(id, name, blob) { if (NATIVE) { const r = await NATIVE.file_save(id, name, await blobToDataUrl(blob)); if (!r || !r.ok) throw new Error((r && r.error) || 'Speichern fehlgeschlagen'); return; } await idb.put(id, blob); },
  async get(id) { if (NATIVE) { const r = await NATIVE.file_load(id); if (!r || !r.ok) throw new Error((r && r.error) || 'Datei nicht gefunden'); return dataUrlToBlob(r.data); } const b = await idb.get(id); if (!b) throw new Error('Datei nicht gefunden'); return b; },
  async del(id) { if (NATIVE) return NATIVE.file_delete(id); return idb.del(id); }
};
let files = store.get('files', []);
let openFileId = null, fv = null;
const fState = Object.assign({ tool: 'pen', color: '#dc2626', size: 1 }, {});
async function ensurePdf() { if (window.pdfjsLib) return; await loadScript('lib/pdf.worker.min.js'); await loadScript('lib/pdf.min.js'); window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js'; }
const fmtSize = n => n > 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB';
async function addFiles(list) {
  for (const f of list) {
    if (!/pdf$|^image\//.test(f.type) && !/\.pdf$/i.test(f.name)) { toast(`${f.name}: Nur PDFs und Bilder`, 'x'); continue; }
    if (f.size > 40e6) { toast(`${f.name} ist größer als 40 MB`, 'x'); continue; }
    const id = uid(), isPdf = /pdf/.test(f.type) || /\.pdf$/i.test(f.name);
    try {
      toast(`${f.name} wird hinzugefügt …`, 'upload');
      let thumb = '', pages = 1;
      if (isPdf) { await ensurePdf(); const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise; pages = pdf.numPages; const pg = await pdf.getPage(1), vp = pg.getViewport({ scale: 1 }), k = 360 / vp.width, cv = document.createElement('canvas'); cv.width = 360; cv.height = vp.height * k; await pg.render({ canvasContext: cv.getContext('2d'), viewport: pg.getViewport({ scale: k }) }).promise; thumb = cv.toDataURL('image/jpeg', .7); }
      else thumb = await shrink(f, 360, false);
      await FS.put(id, f.name, f);
      files.unshift({ id, name: f.name, type: isPdf ? 'pdf' : 'image', size: f.size, added: Date.now(), thumb, pages });
      store.set('files', files);
    } catch (e) { console.error(e); toast(`${f.name}: ${e.message || 'Fehler beim Hinzufügen'}`, 'x'); }
  }
  renderFiles(); toast('Datei hinzugefügt', 'file');
}
function renderFiles() {
  if (openFileId) return renderViewer();
  $('#fTitle').textContent = 'Dateien'; $('#fSub').textContent = 'PDFs und Bilder öffnen und mit Stift oder Text bearbeiten';
  $('#fActs').innerHTML = `<button class="btn pri" id="fAdd">${ic('upload', 'i sm')} Datei hinzufügen</button>`;
  $('#fAdd').onclick = async () => { const l = await pickFiles('application/pdf,image/*', true); if (l.length) addFiles(l); };
  $('#fBody').innerHTML = `<div class="drop" id="fDrop" style="margin-bottom:16px">${ic('upload', 'i lg')}<p style="margin:8px 0 0">PDF oder Bild hierher ziehen oder <button class="lnk" id="fPick" style="text-decoration:underline">auswählen</button></p><small style="color:var(--ink-3)">Arbeitsblätter, Klausuren, Fotos von Tafelbildern … Word-Dateien vorher als PDF sichern.</small></div>
    <div class="files">${files.map(f => `<article class="glass fcard"><button class="thumb" data-fopen="${f.id}" aria-label="${esc(f.name)} öffnen">${f.thumb ? `<img src="${f.thumb}" alt="">` : ic('file', 'i lg')}</button><b title="${esc(f.name)}">${esc(f.name)}</b><small>${f.type === 'pdf' ? `PDF · ${f.pages} Seite${f.pages > 1 ? 'n' : ''}` : 'Bild'} · ${fmtSize(f.size)}${store.get('annot:' + f.id, null) ? ' · bearbeitet' : ''}</small><div class="fa"><button class="btn sm pri" data-fopen="${f.id}">${ic('pen', 'i xs')} Öffnen</button><button class="btn sm" data-fdel="${f.id}" aria-label="Löschen">${ic('trash', 'i xs')}</button></div></article>`).join('')}</div>`;
  $('#fPick').onclick = async () => { const l = await pickFiles('application/pdf,image/*', true); if (l.length) addFiles(l); };
  const dz = $('#fDrop');
  dz.ondragover = e => { e.preventDefault(); dz.classList.add('over'); }; dz.ondragleave = () => dz.classList.remove('over');
  dz.ondrop = e => { e.preventDefault(); dz.classList.remove('over'); addFiles([...e.dataTransfer.files]); };
}
document.addEventListener('click', async e => {
  const o = e.target.closest('[data-fopen]'); if (o) { openFileId = o.dataset.fopen; if (currentView !== 'dateien') go('dateien'); else renderFiles(); return; }
  const d = e.target.closest('[data-fdel]');
  if (d) { if (!d.dataset.sure) { d.dataset.sure = 1; toast('Zum Löschen noch einmal tippen', 'trash'); setTimeout(() => delete d.dataset.sure, 2500); return; }
    const id = d.dataset.fdel; try { await FS.del(id); } catch (er) {} files = files.filter(f => f.id !== id); store.set('files', files); store.set('annot:' + id, null); renderFiles(); toast('Datei gelöscht'); }
});
async function renderViewer() {
  const meta = files.find(f => f.id === openFileId); if (!meta) { openFileId = null; return renderFiles(); }
  $('#fTitle').textContent = meta.name; $('#fSub').textContent = 'Schreib mit Stift, Marker oder Textfeldern. Alles wird automatisch gespeichert.';
  $('#fActs').innerHTML = `<button class="orb" id="fBack">${ic('left', 'i sm')} Alle Dateien</button><button class="orb icon" id="fZo" aria-label="Verkleinern">${ic('zoomout', 'i sm')}</button><button class="orb icon" id="fZi" aria-label="Vergrößern">${ic('zoomin', 'i sm')}</button><button class="btn pri" id="fExp">${ic('download', 'i sm')} Als PDF sichern</button>`;
  $('#fBody').innerHTML = `<div class="glass inkbar" id="fBar" style="position:sticky;top:calc(10px + env(safe-area-inset-top,0px));z-index:5">${inkBar(fState)}</div><div class="pages" id="fPages"><p class="empty">Wird geladen …</p></div>`;
  $('#fBack').onclick = () => { openFileId = null; fv = null; renderFiles(); };
  const annot = store.get('annot:' + meta.id, null) || { pages: {} };
  let saveT = null; const saveAnnot = () => { clearTimeout(saveT); saveT = setTimeout(() => store.set('annot:' + meta.id, annot), 500); };
  fv = { meta, annot, layers: [], last: null, zoom: store.get('fZoom', 1) };
  const apply = () => fv.layers.forEach(l => { l.tool = fState.tool; l.color = fState.color; l.size = fState.size; l.textSize = [0, 16, 22, 32][fState.size]; l.cv.style.cursor = fState.tool === 'text' ? 'text' : 'crosshair'; });
  bindInkBar($('#fBar'), fState, apply, {
    undo: () => fv.last && fv.last.undo(), redo: () => fv.last && fv.last.redo(),
    clear: btn => { if (!fv.last) return toast('Erst auf einer Seite schreiben', 'edit'); if (btn.dataset.sure) { fv.last.clear(); delete btn.dataset.sure; toast('Seite geleert – Rückgängig holt alles zurück', 'undo'); } else { btn.dataset.sure = 1; toast('Zum Leeren dieser Seite noch einmal tippen', 'trash'); setTimeout(() => delete btn.dataset.sure, 2500); } }
  });
  let blob; try { blob = await FS.get(meta.id); } catch (e) { $('#fPages').innerHTML = `<p class="empty">${esc(e.message)}</p>`; return; }
  const host = $('#fPages'); host.innerHTML = '';
  const maxW = () => Math.min($('#fBody').clientWidth, 1000 * fv.zoom);
  const mkPage = (i, w1, h1, paint) => {
    const k = maxW() / w1, div = document.createElement('div'); div.className = 'page'; div.style.width = w1 * k + 'px'; div.style.height = h1 * k + 'px';
    div.innerHTML = `<canvas class="bg"></canvas><canvas class="ink"></canvas><span class="pn">${i + 1}</span>`; host.appendChild(div);
    const data = annot.pages[i] || (annot.pages[i] = { strokes: [], texts: [] });
    const layer = new Ink.InkLayer($('.ink', div), { w: w1, h: h1, data, host: div, onChange: () => { fv.last = layer; saveAnnot(); } });
    layer.cv.addEventListener('pointerdown', () => { fv.last = layer; });
    fv.layers.push(layer);
    const bg = $('.bg', div), dpr = Math.min(devicePixelRatio || 1, 2);
    const io = new IntersectionObserver(async en => { if (!en[0].isIntersecting) return; io.disconnect(); bg.width = w1 * k * dpr; bg.height = h1 * k * dpr; await paint(bg.getContext('2d'), k * dpr); }, { rootMargin: '600px' });
    io.observe(div);
  };
  if (meta.type === 'pdf') {
    try {
      await ensurePdf(); const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise; fv.pdf = pdf;
      for (let i = 0; i < pdf.numPages; i++) { const pg = await pdf.getPage(i + 1), vp = pg.getViewport({ scale: 1 }); mkPage(i, vp.width, vp.height, (ctx, s) => pg.render({ canvasContext: ctx, viewport: pg.getViewport({ scale: s }) }).promise); }
    } catch (e) { console.error(e); host.innerHTML = `<p class="empty">Die PDF ließ sich nicht öffnen (${esc(e.message || e)}).</p>`; return; }
  } else {
    const url = URL.createObjectURL(blob), im = await loadImg(url); fv.img = im;
    const s = Math.min(1, 1600 / im.naturalWidth); mkPage(0, im.naturalWidth * s, im.naturalHeight * s, (ctx, k) => { ctx.drawImage(im, 0, 0, im.naturalWidth * s * k, im.naturalHeight * s * k); });
  }
  apply();
  const zoom = f => { fv.zoom = Math.max(.5, Math.min(2.5, fv.zoom * f)); store.set('fZoom', fv.zoom); renderViewer(); };
  $('#fZo').onclick = () => zoom(1 / 1.25); $('#fZi').onclick = () => zoom(1.25);
  $('#fExp').onclick = () => exportPdf(meta, annot);
}
async function exportPdf(meta, annot) {
  try {
    toast('PDF wird erstellt …', 'download');
    await loadScript('lib/jspdf.umd.min.js');
    const { jsPDF } = window.jspdf; let doc = null;
    const addPage = (w, h, cv) => { const o = w > h ? 'l' : 'p'; if (!doc) doc = new jsPDF({ unit: 'pt', format: [w, h], orientation: o }); else doc.addPage([w, h], o); doc.addImage(cv.toDataURL('image/jpeg', .9), 'JPEG', 0, 0, w, h); };
    if (meta.type === 'pdf') {
      const pdf = fv && fv.pdf; if (!pdf) throw new Error('PDF nicht geladen');
      for (let i = 0; i < pdf.numPages; i++) { const pg = await pdf.getPage(i + 1), vp = pg.getViewport({ scale: 1 }), k = Math.min(2.5, 2200 / vp.width), cv = document.createElement('canvas'); cv.width = vp.width * k; cv.height = vp.height * k; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); await pg.render({ canvasContext: g, viewport: pg.getViewport({ scale: k }) }).promise; Ink.InkLayer.paint(g, annot.pages[i] || {}, k); addPage(vp.width, vp.height, cv); }
    } else {
      const im = fv.img, s = Math.min(1, 1600 / im.naturalWidth), w = im.naturalWidth * s, h = im.naturalHeight * s, k = Math.min(2, 2400 / w), cv = document.createElement('canvas'); cv.width = w * k; cv.height = h * k; const g = cv.getContext('2d'); g.drawImage(im, 0, 0, cv.width, cv.height); Ink.InkLayer.paint(g, annot.pages[0] || {}, k); addPage(w * .75, h * .75, cv);
    }
    const name = meta.name.replace(/\.(pdf|png|jpe?g|heic|gif|webp)$/i, '') + ' (bearbeitet).pdf';
    await deliverFile(name, doc.output('datauristring'));
  } catch (e) { console.error(e); toast('Export fehlgeschlagen: ' + (e.message || e), 'x'); }
}

/* =====================================================================
   BUILDSPACE: Tools für die Suche & Aufrufzahlen
   ===================================================================== */
const SITE = 'https://buildspaceos.de/';
let postsP = null;
function loadPosts() {
  if (postsP) return postsP;
  postsP = (async () => {
    let text = '';
    try { text = location.protocol.startsWith('http') && /buildspaceos\.de|localhost|127\.0\.0\.1/.test(location.host) ? await (await fetch('../posts-data.js', { cache: 'no-cache' })).text() : await fetchText(SITE + 'posts-data.js'); }
    catch (e) { try { text = await fetchText(SITE + 'posts-data.js'); } catch (e2) { return []; } }
    /* Nur Daten herauslesen – fremder Code wird nicht ausgeführt */
    const get = (chunk, k) => { const m = new RegExp(k + ':\\s*"((?:[^"\\\\]|\\\\.)*)"').exec(chunk); return m ? m[1].replace(/\\"/g, '"') : ''; };
    return text.split(/\n\s*\{\s*\n/).slice(1).map(c => ({ title: get(c, 'title'), excerpt: get(c, 'excerpt'), url: get(c, 'url'), emoji: get(c, 'emoji'), category: get(c, 'category'), sub: get(c, 'subcategory') })).filter(p => p.title && p.url);
  })();
  return postsP;
}
const postUrl = u => /^https?:/i.test(u) ? u : SITE + u.replace(/^\.?\//, '');
const pageKey = file => 'p_' + (file.replace(/\.html?$/i, '').replace(/^.*\//, '') || 'start').replace(/[^a-zA-Z0-9_]/g, '_');
const FB = { project: 'kanban-board-281da', key: 'AIzaSyAt35KpU63iGk8UAX5X4T5Vj18zPf_JUus' };
const RULE = `match /page_views/{day} {
  allow read: if true;
  allow create: if day.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
    && request.resource.data.keys().hasOnly(['total', 'pages'])
    && request.resource.data.total == 1;
  allow update: if request.resource.data.keys().hasOnly(['total', 'pages'])
    && request.resource.data.total == resource.data.total + 1;
}`;
async function fetchJson(url) {
  try { const r = await fetch(url, { cache: 'no-store' }); const j = await r.json(); return j; }
  catch (e) { if (NATIVE && NATIVE.fetch_text) { const t = await fetchText(url); return JSON.parse(t); } throw e; }
}
async function loadStats() {
  if (!widgetOn('stats')) return;
  const box = $('#statsBox');
  try {
    const j = await fetchJson(`https://firestore.googleapis.com/v1/projects/${FB.project}/databases/(default)/documents/page_views?pageSize=400&key=${FB.key}`);
    if (j.error) { box.innerHTML = `<p class="empty">${j.error.status === 'PERMISSION_DENIED' ? 'Der Zähler ist noch nicht eingerichtet.' : 'Aufrufe konnten nicht geladen werden.'}</p><button class="btn sm" data-stats-setup>${ic('chart', 'i xs')} Einrichten</button>`; return; }
    const days = {}; (j.documents || []).forEach(d => { const k = d.name.split('/').pop(), f = d.fields || {}; days[k] = { total: +(f.total && f.total.integerValue || 0), pages: Object.fromEntries(Object.entries((f.pages && f.pages.mapValue && f.pages.mapValue.fields) || {}).map(([p, v]) => [p, +(v.integerValue || 0)])) }; });
    const today = new Date(), sum = n => { let s = 0; for (let i = 0; i < n; i++) s += (days[isoDay(addDays(today, -i))] || {}).total || 0; return s; };
    if (!Object.keys(days).length) { box.innerHTML = '<p class="empty">Noch keine Aufrufe gezählt. Sobald jemand buildspace öffnet, erscheinen hier die Zahlen.</p><button class="btn sm" data-stats-setup>Hilfe</button>'; return; }
    const series = [...Array(14)].map((_, i) => (days[isoDay(addDays(today, i - 13))] || {}).total || 0), mx = Math.max(1, ...series);
    const pts = series.map((v, i) => `${(i / 13) * 300},${56 - (v / mx) * 50}`).join(' ');
    const top = {}; for (let i = 0; i < 7; i++) Object.entries((days[isoDay(addDays(today, -i))] || {}).pages || {}).forEach(([p, v]) => top[p] = (top[p] || 0) + v);
    const posts = await loadPosts(), title = k => { if (k === 'p_start' || k === 'p_index') return 'Startseite'; const p = posts.find(x => pageKey(x.url) === k); return p ? p.title : k.slice(2).replace(/_/g, '-'); };
    const tops = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5), tmax = tops.length ? tops[0][1] : 1;
    box.innerHTML = `<div class="stat-row"><div class="stat"><b class="num">${sum(1)}</b><span>heute</span></div><div class="stat"><b class="num">${sum(7)}</b><span>7 Tage</span></div><div class="stat"><b class="num">${sum(30)}</b><span>30 Tage</span></div></div>
      <svg class="spark" viewBox="0 0 300 60" preserveAspectRatio="none" aria-label="Aufrufe der letzten 14 Tage"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".4"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs><polygon points="0,60 ${pts} 300,60" fill="url(#sg)"/><polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>
      ${tops.length ? `<div class="toplist">${tops.map(([k, v]) => `<div style="display:block"><div style="display:flex;justify-content:space-between;gap:10px"><span>${esc(title(k))}</span><b class="num">${v}</b></div><div class="pbar"><i style="width:${100 * v / tmax}%"></i></div></div>`).join('')}</div>` : ''}`;
  } catch (e) { box.innerHTML = '<p class="empty">Aufrufe konnten nicht geladen werden (offline?).</p>'; }
}
$('#statsRefresh').addEventListener('click', () => { $('#statsBox').innerHTML = '<p class="empty">Wird geladen …</p>'; loadStats(); });
document.addEventListener('click', e => { if (e.target.closest('[data-stats-setup]')) statsSetup(); });
function statsSetup() {
  modal(`<div class="glass modal wide"><div class="mh"><h3>Aufrufzähler einrichten</h3><button class="orb sm" data-close aria-label="Schließen">${ic('x', 'i xs')}</button></div>
    <p class="lead">buildspace zählt anonym, wie oft jede Seite pro Tag geöffnet wird: ohne Cookies, ohne IP-Adresse, ohne Kennung. Wer im Browser „Do Not Track“ eingeschaltet hat, wird nicht gezählt. Gespeichert wird in deinem Firebase-Projekt, das buildspace schon für Feedback und Bestenlisten nutzt. Damit das Speichern erlaubt ist, braucht Firestore einmalig eine zusätzliche Regel:</p>
    <ol class="steps"><li><b>Firebase-Konsole</b> öffnen: Projekt <code>${FB.project}</code> › Firestore Database › <b>Regeln</b>.</li>
      <li>Diesen Block <b>innerhalb</b> von <code>match /databases/{database}/documents { … }</code> einfügen und <b>Veröffentlichen</b>.<div class="field" style="margin:10px 0 0"><textarea class="code" readonly id="ruleTxt">${esc(RULE)}</textarea></div><button class="btn sm" id="ruleCopy">${ic('copy', 'i xs')} Regel kopieren</button></li>
      <li>Fertig. Ab dem nächsten Besuch erscheinen die Zahlen im Widget.</li></ol>
    <div class="row"><button class="btn" id="fbOpen">${ic('ext', 'i sm')} Firebase-Konsole öffnen</button><button class="btn pri" data-close>Fertig</button></div></div>`);
  $('#ruleCopy').onclick = async () => toast((await copy(RULE)) ? 'Regel kopiert' : 'Bitte markieren und kopieren', 'copy');
  $('#fbOpen').onclick = () => openUrl(`https://console.firebase.google.com/project/${FB.project}/firestore/rules`, 'Firebase-Konsole');
}

/* =====================================================================
   MITTEILUNGEN
   ===================================================================== */
let transient = [];
const seen = new Set(store.get('seenN', []));
const notified = new Set(store.get('notifiedN', []));
const pushTransient = it => { transient.unshift(it); transient = transient.slice(0, 5); updateBadge(); };
const notifyPrefs = () => Object.assign({ system: true }, store.get('notify', {}));
async function computeNotifs() {
  const items = [], now = Date.now() / 1000, today = isoDay(new Date()), tomorrow = isoDay(addDays(new Date(), 1));
  transient.forEach(t => items.push(t));
  try {
    const r = await eventsFor(today);
    r.events.filter(e => e.end > now && !e.allDay).forEach(e => { const min = Math.round((e.start - now) / 60);
      items.push({ id: 'ev:' + e.key, icon: 'cal', color: e.color, title: e.title, sub: e.start <= now ? `läuft gerade · bis ${hm(e.end)}` : min <= 90 ? `in ${min} Min. · ${hm(e.start)} Uhr${e.location ? ' · ' + e.location : ''}` : `heute ${hm(e.start)} Uhr${e.location ? ' · ' + e.location : ''}`, go: 'kalender', soon: e.start > now && min <= 15 }); });
    r.events.filter(e => e.allDay).forEach(e => items.push({ id: 'ev:' + e.key, icon: 'cal', color: e.color, title: e.title, sub: 'heute, ganztägig', go: 'kalender' }));
    const r2 = await eventsFor(tomorrow);
    r2.events.slice(0, 3).forEach(e => items.push({ id: 'ev:' + e.key, icon: 'cal', color: e.color, title: e.title, sub: `morgen${e.allDay ? ', ganztägig' : ' ' + hm(e.start) + ' Uhr'}`, go: 'kalender' }));
  } catch (e) {}
  tasks.filter(t => t.col !== 'done' && t.due).forEach(t => { const n = daysUntil(t.due); if (n <= 1) items.push({ id: `task:${t.id}:${t.due}`, icon: 'kanban', color: n < 0 ? '#F87171' : n === 0 ? '#FACC15' : '#4F7BFF', title: t.title, sub: n < 0 ? `überfällig seit ${-n} Tag${n < -1 ? 'en' : ''}` : n === 0 ? 'heute fällig' : 'morgen fällig', go: 'projekte' }); });
  const wn = waCount(); if (NATIVE && wn) items.push({ id: 'wa:' + wn, icon: 'phonechat', color: '#25D366', title: 'WhatsApp', sub: `${wn} ${wn === 1 ? 'ungelesener Chat' : 'ungelesene Chats'}`, go: 'whatsapp' });
  cds.forEach(c => { const n = daysUntil(c.date); if (n >= 0 && n <= 7) items.push({ id: `cd:${c.id}:${n}`, icon: 'flag', color: '#F25FB0', title: c.label, sub: n === 0 ? 'heute!' : `noch ${n} Tag${n > 1 ? 'e' : ''}`, go: 'start' }); });
  return items;
}
async function updateBadge() {
  const items = await computeNotifs(), n = items.filter(i => !seen.has(i.id)).length, b = $('#bellBadge');
  if (b) { b.textContent = n > 9 ? '9+' : n; b.hidden = !n; }
  return items;
}
function closeNotif() { $('#notifP')?.remove(); }
async function toggleNotif() {
  if ($('#notifP')) return closeNotif();
  const items = await updateBadge();
  const p = document.createElement('section'); p.className = 'glass notif'; p.id = 'notifP'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Mitteilungen');
  const perm = !NATIVE && 'Notification' in window && Notification.permission === 'default';
  p.innerHTML = `<div class="mh"><h3 style="margin:0;font-size:16px">Was ansteht</h3><button class="orb sm" id="nClose" aria-label="Schließen">${ic('x', 'i xs')}</button></div>
    <div class="nlist">${items.length ? items.map(i => `<button class="nitem${seen.has(i.id) ? '' : ' unseen'}" data-ngo="${i.go || ''}"><span class="tile sm" style="--c:${i.color}">${ic(i.icon, 'i sm')}</span><span class="t"><b>${esc(i.title)}</b><small>${esc(i.sub)}</small></span></button>`).join('') : '<p class="empty">Gerade steht nichts an. Termine, fällige Aufgaben und Countdowns erscheinen hier.</p>'}</div>
    <div class="row" style="justify-content:space-between">${perm ? `<button class="btn sm" id="nPerm">${ic('bell', 'i xs')} Browser-Mitteilungen erlauben</button>` : '<span></span>'}${items.length ? '<button class="btn sm" id="nRead">Alle gelesen</button>' : ''}</div>`;
  document.body.appendChild(p);
  $('#nClose').onclick = closeNotif;
  $('#nRead')?.addEventListener('click', () => { items.forEach(i => seen.add(i.id)); store.set('seenN', [...seen].slice(-300)); updateBadge(); closeNotif(); });
  $('#nPerm')?.addEventListener('click', async () => { const r = await Notification.requestPermission(); toast(r === 'granted' ? 'Mitteilungen erlaubt' : 'Mitteilungen nicht erlaubt', 'bell'); closeNotif(); });
  p.addEventListener('click', e => { const b = e.target.closest('[data-ngo]'); if (b && b.dataset.ngo) { go(b.dataset.ngo); closeNotif(); } });
  items.forEach(i => seen.add(i.id)); store.set('seenN', [...seen].slice(-300)); setTimeout(updateBadge, 300);
}
function systemNotify(title, body, view) {
  if (!notifyPrefs().system) return;
  if (NATIVE && NATIVE.notify) { NATIVE.notify(title, body || '', view || ''); return; }
  try { if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body, icon: iconCache && !iconCache.startsWith('data:') ? iconCache : 'icon-192.png' }); } catch (e) {}
}
async function notifyTick() {
  const items = await updateBadge();
  items.filter(i => i.soon && !notified.has(i.id)).forEach(i => { notified.add(i.id); systemNotify(i.title, i.sub, i.go); });
  const dayKey = 'due:' + isoDay(new Date()), due = tasks.filter(t => t.col !== 'done' && t.due && daysUntil(t.due) <= 0);
  if (due.length && !notified.has(dayKey) && new Date().getHours() >= 7) { notified.add(dayKey); systemNotify(`${due.length} Aufgabe${due.length > 1 ? 'n' : ''} fällig`, due.slice(0, 3).map(t => t.title).join(' · '), 'projekte'); }
  store.set('notifiedN', [...notified].slice(-300));
}


/* =====================================================================
   WHATSAPP (nur Mac-App): WhatsApp Web als eigene Ansicht im Fenster
   ===================================================================== */
let waShown = false, waRect = '', waLoop = null, waState = { web: null, desktop: { running: false, count: null } };
const waCount = () => { const w = waState.web, d = waState.desktop || {}; return w != null ? w : (d.running && d.count != null ? d.count : 0); };
const waBlocked = () => !!($('#ov').innerHTML.trim() || $('#notifP'));
function waTick() {
  if (currentView !== 'whatsapp' || !NATIVE) return;
  const r = $('#waFrame').getBoundingClientRect(), k = 6;
  const rect = { x: Math.round(r.left + k), y: Math.round(r.top + k), w: Math.round(r.width - 2 * k), h: Math.round(r.height - 2 * k) }, key = JSON.stringify(rect);
  if (waBlocked() || document.hidden) { if (waShown) { waShown = false; NATIVE.wa_hide(); } return; }
  if (!waShown) {
    waShown = true; waRect = key;
    NATIVE.wa_show(rect).then(res => { if (!res || !res.ok) { waShown = false; clearInterval(waLoop); $('#waPh').classList.add('err'); $('#waPh').innerHTML = `${ic('phonechat', 'i')}<b>WhatsApp ließ sich nicht einbetten</b><span>Nutze oben <b>Eigenes Fenster</b> – dort läuft WhatsApp mit derselben Anmeldung und denselben Mitteilungen.</span><small class="wa-diag" id="waDiag">${esc((res && res.error) || '')}</small>`; } }).catch(() => {});
  } else if (key !== waRect) { waRect = key; NATIVE.wa_move(rect); }
}
function renderWhatsApp() {
  if (!NATIVE) return go('start');
  store.set('waUsed', true);
  clearInterval(waLoop); waShown = false; waRect = '';
  /* erst einsetzen, wenn die Ansicht eingeblendet ist – sonst springt WhatsApp kurz */
  const start = () => { if (currentView === 'whatsapp' && !waLoop) { waLoop = setInterval(waTick, 120); waTick(); } };
  waLoop = null; setTimeout(start, 360);
  clearInterval(waDiagT); waDiagT = setInterval(waDiag, 2000); setTimeout(waDiag, 1200);
  setTimeout(waPoll, 5000);
}
let waDiagT = null;
async function waDiag() {
  if (currentView !== 'whatsapp' || !NATIVE || !NATIVE.wa_debug) { clearInterval(waDiagT); waDiagT = null; return; }
  try {
    const d = await NATIVE.wa_debug(); if (!d) return;
    const parts = [];
    if (d.error) parts.push('Fehler: ' + d.error);
    parts.push(d.embedded ? 'eingebettet' : 'nicht eingebettet');
    if (d.step) parts.push('Schritt: ' + d.step);
    if (d.url) parts.push(d.url.replace(/^https?:\/\//, '').slice(0, 40));
    if (d.progress != null) parts.push('geladen ' + Math.round(d.progress * 100) + ' %');
    if (d.frame) parts.push('Rahmen ' + d.frame.join('·') + (d.host ? ' in ' + d.host.join('×') : '') + (d.hidden ? ' (versteckt)' : ''));
    $('#waDiag').textContent = parts.join(' · ');
    if (d.error && !$('#waPh').classList.contains('err')) { $('#waPh').classList.add('err'); }
  } catch (e) { $('#waDiag').textContent = 'Diagnose nicht verfügbar'; }
}
function waLeave() { clearInterval(waDiagT); waDiagT = null; clearInterval(waLoop); waLoop = null; if (waShown && NATIVE) NATIVE.wa_hide(); waShown = false; }
if (NATIVE) {
  $('#waReload').onclick = () => { NATIVE.wa_reload(); toast('WhatsApp wird neu geladen', 'refresh'); };
  $('#waDesk').onclick = async () => { const r = await NATIVE.open_app({ bundle: 'net.whatsapp.WhatsApp', name: 'WhatsApp' }).catch(() => null); toast(r && r.ok ? 'WhatsApp-App wird geöffnet' : 'Die WhatsApp-App ist auf diesem Mac nicht installiert', r && r.ok ? 'phonechat' : 'x'); };
  $('#waExt').onclick = () => openUrl('https://web.whatsapp.com/', 'WhatsApp Web');
  $('#waWin').onclick = async () => { const r = NATIVE.wa_window ? await NATIVE.wa_window().catch(() => null) : null; toast(r && r.ok ? 'WhatsApp öffnet in einem eigenen Fenster' : 'Eigenes Fenster ging nicht' + (r && r.error ? ': ' + r.error : ''), r && r.ok ? 'phonechat' : 'x'); };
}
function renderWaWidget() {
  const box = $('#waBox'); if (!box || !NATIVE) return;
  const w = waState.web, d = waState.desktop || {}, used = store.get('waUsed', false);
  const n = w != null ? w : (d.running && d.count != null ? d.count : null);
  if (n == null) {
    box.innerHTML = `<p class="empty">${used ? 'WhatsApp wird geladen …' : 'Öffne WhatsApp einmal hier im Cockpit und melde dich mit dem QR-Code an. Danach zeigt das Widget deine ungelesenen Chats.'}</p><button class="btn sm pri" data-wa-open>${ic('phonechat', 'i xs')} WhatsApp öffnen</button>`;
  } else {
    box.innerHTML = `<div class="wa-count${n ? ' has' : ''}"><b class="num">${n}</b><span>${n === 1 ? 'ungelesener Chat' : 'ungelesene Chats'}${w == null ? '<small>laut WhatsApp-App</small>' : ''}</span></div>
      ${w != null && d.running && d.count ? `<p class="lead" style="margin:8px 0 0">WhatsApp-App: ${d.count} ungelesen</p>` : ''}
      <div class="row" style="justify-content:flex-start;margin-top:10px"><button class="btn sm pri" data-wa-open>${ic('phonechat', 'i xs')} Chats öffnen</button></div>`;
  }
  const b = $('#waBadge'); if (b) { const c = waCount(); b.textContent = c > 99 ? '99+' : c; b.hidden = !c; }
}
document.addEventListener('click', e => { if (e.target.closest('[data-wa-open]')) go('whatsapp'); });
let waPrev = null;
async function waPoll() {
  if (!NATIVE || !NATIVE.wa_status) return;
  try {
    const st = await NATIVE.wa_status(); if (!st) return;
    waState = { web: st.web, desktop: st.desktop || { running: false, count: null } };
    const c = waState.web;
    if (c != null) waPrev = c;
    renderWaWidget(); updateBadge();
  } catch (e) {}
}
window.__cockpitOpen = id => { if (VIEWS.some(v => v.id === id)) go(id); };
function macBanner() {
  const el = $('#macBanner'); if (!el) return;
  let until = 0; try { until = +localStorage.getItem('cockpit:macBannerOff') || 0; } catch (e) {}
  el.hidden = !IS_MAC_BROWSER || Date.now() < until;
  if (el.hidden) return;
  el.innerHTML = `${ic('bolt', 'i sm')}<div class="t"><b>Du nutzt die Browser-Version</b><span>WhatsApp im Cockpit, Kalender-Abos, deine Mac-Kalender und Mac-Apps gibt es nur in der Mac-App.</span></div>
    <button class="btn sm" id="mbLoad">Mac-App laden</button><button class="btn sm pri" id="mbOpen">In der Mac-App öffnen</button><button class="orb sm" id="mbX" aria-label="Hinweis für eine Woche ausblenden">${ic('x', 'i xs')}</button>`;
  $('#mbLoad').onclick = () => openUrl(MAC_APP_URL, 'buildspace');
  $('#mbOpen').onclick = () => { location.href = 'cockpit://' + currentView; setTimeout(() => toast('Öffnet sich nichts? Dann ist die Mac-App noch nicht installiert (ab Version 2.5).', 'x'), 2500); };
  $('#mbX').onclick = () => { try { localStorage.setItem('cockpit:macBannerOff', Date.now() + 7 * 864e5); } catch (e) {} el.hidden = true; };
}
macBanner();
if (NATIVE && NATIVE.safe_status) setTimeout(() => NATIVE.safe_status().then(st => { const off = [st && st.whatsapp && 'WhatsApp einbetten', st && st.mitteilungen && 'macOS-Mitteilungen'].filter(Boolean); if (off.length) toast(`Sicherheitshalber aus: ${off.join(' und ')} (beim letzten Start abgestürzt) – Details unter Einstellungen › Diagnose`, 'x'); }).catch(() => {}), 1800);
if (NATIVE && NATIVE.wa_set_notify) NATIVE.wa_set_notify(notifyPrefs().whatsapp !== false);
if (NATIVE && NATIVE.wa_status) {
  /* Wer WhatsApp im Cockpit schon einmal geöffnet hat: im Hintergrund laden, damit Widget und Zähler stimmen */
  if (store.get('waUsed', false) && NATIVE.wa_preload) setTimeout(() => NATIVE.wa_preload().then(() => setTimeout(waPoll, 6000)).catch(() => {}), 2500);
  setInterval(waPoll, 20000); setTimeout(waPoll, 3000);
}

/* =====================================================================
   SYNCHRONISIEREN (Google-Konto, Firebase/Firestore)
   Jeder Speicher-Schlüssel ist ein eigenes Dokument unter
   cockpit/{uid}/keys/{schlüssel}; ein Inhaltsverzeichnis
   cockpit/{uid}/meta/index hält pro Schlüssel den Zeitpunkt der letzten
   Änderung. Neuere Änderung gewinnt – pro Schlüssel, nicht fürs Ganze.
   Dateien (PDFs, Bilder) liegen in Teilen unter cockpit/{uid}/files/{id}.
   Browser: Anmeldung per Firebase (Popup bzw. Weiterleitung).
   Mac-App: Anmeldung im Browser, die Mac-App hält das Konto (NATIVE.cloud).
   ===================================================================== */
const FBC = { apiKey: 'AIzaSyAt35KpU63iGk8UAX5X4T5Vj18zPf_JUus', authDomain: 'kanban-board-281da.firebaseapp.com', projectId: 'kanban-board-281da', appId: '1:210909884248:web:10ffacb3a74f7b3c887f2d' };
const FS_ROOT = `projects/${FBC.projectId}/databases/(default)/documents`;
const FS_URL = `https://firestore.googleapis.com/v1/${FS_ROOT}`;
const SYNC_RULE = `match /cockpit/{uid}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}`;
/* bleiben auf dem Gerät */
const SYNC_LOCAL = new Set(['board', 'syncMeta', 'syncInfo', 'syncFiles', 'notifiedN', 'seenN', 'waUsed', 'waWebOk', 'railOpen', 'fZoom', 'appsKnown', 'macBannerOff']);
const PART = 700000;          // Zeichen pro Teil (Firestore erlaubt 1 MB je Dokument)
const FILE_MAX = 40e6;
const encKey = k => 'k_' + k.replace(/[^A-Za-z0-9]/g, c => '_' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const syncMeta = () => Object.assign({ ts: {}, last: 0 }, store.get('syncMeta', {}) || {});
let SY = { on: false, uid: '', email: '', name: '', busy: false, error: '', lastPull: 0, lastPush: 0, timer: null, poll: null, dirty: new Set(), applying: false, needsChoice: false };

/* Jede lokale Änderung bekommt einen Zeitstempel und wird (angemeldet) hochgeladen */
/* Nur was du selbst änderst, zählt: automatische Schreibvorgänge beim Start (Standardwerte,
   Aufräumen) bekommen keinen Zeitstempel – sonst würden sie Daten aus dem Konto überstimmen. */
let userActed = false;
['pointerdown', 'keydown', 'drop', 'paste'].forEach(ev => addEventListener(ev, () => { userActed = true; }, { capture: true, passive: true }));
onStoreSet = k => {
  if (SY.applying || SYNC_LOCAL.has(k) || !userActed) return;
  const m = syncMeta(); m.ts[k] = Date.now(); rawSet('syncMeta', m);
  if (SY.on) { SY.dirty.add(k); clearTimeout(SY.timer); SY.timer = setTimeout(syncPush, 2500); }
};

/* ---------- Anmeldung ---------- */
let fbAuth = null;
async function fbLoad() {
  if (fbAuth) return fbAuth;
  await loadScript('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
  await loadScript('https://www.gstatic.com/firebasejs/10.13.2/firebase-auth-compat.js');
  const app = firebase.apps.find(a => a.name === 'cockpit') || firebase.initializeApp(FBC, 'cockpit');
  fbAuth = app.auth();
  fbAuth.getRedirectResult().catch(e => { SY.error = 'Google-Anmeldung fehlgeschlagen' + (e && e.code ? ' (' + e.code + ')' : ''); });
  return fbAuth;
}
async function syncToken() {
  if (NATIVE) { const r = await NATIVE.cloud_token(); return r && r.ok ? r : null; }
  const a = await fbLoad(), u = a.currentUser; if (!u) return null;
  return { ok: true, uid: u.uid, email: u.email, name: u.displayName, token: await u.getIdToken() };
}
async function syncSignIn() {
  if (NATIVE) {
    const r = await NATIVE.cloud_login().catch(() => null);
    if (!r || !r.ok) { toast((r && r.error) || 'Anmeldung konnte nicht gestartet werden', 'x'); return; }
    toast('Melde dich im Browser mit Google an – Cockpit verbindet sich danach von selbst', 'user');
    const t0 = Date.now(), iv = setInterval(async () => {
      const st = await NATIVE.cloud_status().catch(() => null);
      if (st && st.signed_in) { clearInterval(iv); await syncBegin(true); if ($('#ov [data-tab="sync"][aria-pressed="true"]')) setup('sync'); }
      else if (Date.now() - t0 > 5 * 60e3) clearInterval(iv);
    }, 1500);
    return;
  }
  let a; try { a = await fbLoad(); } catch (e) { toast('Anmeldedienst nicht erreichbar (offline?)', 'x'); return; }
  const provider = new firebase.auth.GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' });
  const standalone = !!(navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches));
  try { if (standalone) { await a.signInWithRedirect(provider); return; } await a.signInWithPopup(provider); }
  catch (err) {
    const c = err && err.code;
    if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return;
    if (c === 'auth/popup-blocked' || c === 'auth/operation-not-supported-in-this-environment') { await a.signInWithRedirect(provider); return; }
    if (c === 'auth/unauthorized-domain') { toast('Diese Adresse ist für die Google-Anmeldung nicht freigegeben – nutze buildspaceos.de/cockpit', 'x'); return; }
    toast('Google-Anmeldung fehlgeschlagen' + (c ? ' (' + c + ')' : ''), 'x'); return;
  }
  await syncBegin(true);
}
async function syncSignOut() {
  syncStop();
  if (NATIVE) await NATIVE.cloud_logout().catch(() => {}); else { try { (await fbLoad()).signOut(); } catch (e) {} }
  store.set('syncInfo', null); SY.uid = SY.email = SY.name = ''; toast('Abgemeldet – die Daten bleiben auf diesem Gerät', 'user');
}
function syncStop() { SY.on = false; clearInterval(SY.poll); clearTimeout(SY.timer); }

/* ---------- Firestore (REST) ---------- */
async function cloud(method, path, body) {
  if (NATIVE) {
    const r = await NATIVE.cloud(method, path, body == null ? '' : JSON.stringify(body));
    if (!r) throw new Error('Keine Antwort');
    if (!r.ok) { const e = new Error(cloudErr(r.status, r.text)); e.status = r.status; throw e; }
    return r.text ? JSON.parse(r.text) : {};
  }
  const t = await syncToken(); if (!t) throw new Error('Nicht angemeldet');
  const res = await fetch(FS_URL + path, { method, headers: { Authorization: 'Bearer ' + t.token, 'Content-Type': 'application/json' }, body: body == null ? undefined : JSON.stringify(body), keepalive: method !== 'GET' && JSON.stringify(body || '').length < 60000 });
  const txt = await res.text();
  if (!res.ok) { const e = new Error(cloudErr(res.status, txt)); e.status = res.status; throw e; }
  return txt ? JSON.parse(txt) : {};
}
function cloudErr(status, txt) {
  if (status === 403 || /PERMISSION_DENIED/.test(txt || '')) return 'Firebase verweigert den Zugriff – die Regel für Cockpit fehlt noch (Einstellungen › Synchronisieren).';
  if (status === 401) return 'Anmeldung abgelaufen – bitte neu anmelden.';
  if (!status) return 'Keine Verbindung (offline?)';
  try { const j = JSON.parse(txt); if (j.error && j.error.message) return j.error.message; } catch (e) {}
  return 'Fehler ' + status;
}
const docName = p => `${FS_ROOT}/cockpit/${SY.uid}/${p}`;
const sv = s => ({ stringValue: s }), iv = n => ({ integerValue: String(Math.round(n)) });
const fget = (d, k) => { const f = d && d.fields && d.fields[k]; if (!f) return undefined; return f.stringValue !== undefined ? f.stringValue : f.integerValue !== undefined ? +f.integerValue : f.mapValue ? f.mapValue.fields || {} : undefined; };
async function commit(writes) {
  /* in Pakete teilen: höchstens ~8 MB bzw. 400 Schreibvorgänge je Anfrage */
  let batch = [], size = 0;
  const send = async () => { if (batch.length) await cloud('POST', ':commit', { writes: batch }); batch = []; size = 0; };
  for (const w of writes) { const s = JSON.stringify(w).length; if (batch.length && (size + s > 8e6 || batch.length >= 400)) await send(); batch.push(w); size += s; }
  await send();
}
async function batchGet(names) {
  const out = [];
  for (let i = 0; i < names.length; i += 20) {
    const r = await cloud('POST', ':batchGet', { documents: names.slice(i, i + 20) });
    (Array.isArray(r) ? r : [r]).forEach(x => { if (x.found) out.push(x.found); });
  }
  return out;
}

/* ---------- Hochladen ---------- */
async function syncPush(keys) {
  if (!SY.on || SY.busy && !keys) { if (SY.on) { clearTimeout(SY.timer); SY.timer = setTimeout(syncPush, 3000); } return; }
  const list = keys || [...SY.dirty]; if (!list.length) return;
  SY.dirty.clear(); SY.busy = true;
  try {
    const m = syncMeta(), writes = [], idx = { fields: {} }, mask = [];
    for (const k of list) {
      const raw = JSON.stringify(rawGet(k) === undefined ? null : rawGet(k)), t = m.ts[k] || Date.now(), id = encKey(k);
      const parts = raw.length > PART ? Math.ceil(raw.length / PART) : 0;
      for (let i = 0; i < parts; i++) writes.push({ update: { name: docName(`keys/${id}__p${i}`), fields: { v: sv(raw.slice(i * PART, (i + 1) * PART)) } } });
      writes.push({ update: { name: docName(`keys/${id}`), fields: { k: sv(k), v: sv(parts ? '' : raw), n: iv(parts), t: iv(t) } } });
      idx.fields[id] = iv(t); mask.push('keys.' + id);
    }
    writes.push({ update: { name: docName('meta/index'), fields: { keys: { mapValue: idx } } }, updateMask: { fieldPaths: mask } });
    await commit(writes);
    SY.lastPush = Date.now(); SY.error = ''; syncBadge();
  } catch (e) { list.forEach(k => SY.dirty.add(k)); SY.error = e.message; syncBadge(); clearTimeout(SY.timer); SY.timer = setTimeout(syncPush, 20000); }
  finally { SY.busy = false; }
}

/* ---------- Abholen ---------- */
const REFRESH = {
  apps: () => { apps = store.get('apps', apps); renderApps(); },
  usage: () => { usage = store.get('usage', {}); renderApps(); },
  notes: () => { notes = store.get('notes', notes) || []; renderNotes(); },
  countdowns: () => { cds = store.get('countdowns', []); renderCds(); },
  tasks: () => { tasks = store.get('tasks', []); renderProjMini(); if (currentView === 'projekte') renderKanban(); },
  saved: () => { saved = store.get('saved', saved) || []; renderSavedMini(); if (currentView === 'gespeichert') renderSaved(); },
  events: () => { ownEvents = store.get('events', []); invalidateCal(); },
  icsFeeds: () => invalidateCal(),
  boards: () => { if (document.querySelector('#wbBox canvas') && currentView === 'whiteboard') { boards = store.get('boards', boards); renderWhiteboard(); } else boards = store.get('boards', boards); },
  files: () => { files = store.get('files', []); if (currentView === 'dateien' && !openFileId) renderFiles(); },
  profile: () => applyProfile().then(renderRail), iconImage: () => applyProfile(),
  look: () => applyLook(), bgImage: () => applyLook(),
  widgets: () => renderBoard(), homeBoard: () => renderBoard(), boardOff: () => renderBoard(), hotkeys: () => renderApps()
};
async function syncPull(force) {
  if (!SY.on || SY.busy) return;
  SY.busy = true;
  try {
    let index;
    try { index = await cloud('GET', `/cockpit/${SY.uid}/meta/index`); } catch (e) { if (e.status === 404) index = null; else throw e; }
    const remote = index ? (fget(index, 'keys') || {}) : {};
    const m = syncMeta(), want = [];
    Object.entries(remote).forEach(([id, v]) => { const t = +(v.integerValue || 0); const k = Object.keys(m.ts).find(x => encKey(x) === id); if (!k || t > (m.ts[k] || 0)) want.push(id); });
    let changed = new Set();
    if (want.length) {
      const docs = await batchGet(want.map(id => docName(`keys/${id}`)));
      for (const d of docs) {
        const k = fget(d, 'k'), t = fget(d, 't') || 0, n = fget(d, 'n') || 0; if (!k || SYNC_LOCAL.has(k)) continue;
        if (t <= (m.ts[k] || 0) || SY.dirty.has(k)) continue;
        let raw = fget(d, 'v') || '';
        if (n) { const parts = await batchGet([...Array(n)].map((_, i) => docName(`keys/${encKey(k)}__p${i}`))); parts.sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true })); raw = parts.map(p => fget(p, 'v') || '').join(''); }
        let val; try { val = JSON.parse(raw); } catch (e) { continue; }
        SY.applying = true; try { if (val === null) rawSet(k, null); else rawSet(k, val); } finally { SY.applying = false; }
        m.ts[k] = t; changed.add(k);
      }
      rawSet('syncMeta', m);
    }
    /* lokal neuer oder noch nie hochgeladen → hoch */
    const up = Object.keys(m.ts).filter(k => !SYNC_LOCAL.has(k) && (!remote[encKey(k)] || +(remote[encKey(k)].integerValue || 0) < m.ts[k]));
    SY.lastPull = Date.now(); SY.error = '';
    SY.busy = false;
    if (up.length) await syncPush(up);
    changed.forEach(k => { const f = REFRESH[k] || (k.startsWith('annot:') ? null : null); try { f && f(); } catch (e) { console.warn('Aktualisieren', k, e); } });
    if (changed.size) { renderBoard(); updateBadge(); if (!force) toast(`Von deinem anderen Gerät übernommen (${changed.size})`, 'refresh'); }
    syncFiles();
    syncBadge();
  } catch (e) { SY.error = e.message; syncBadge(); }
  finally { SY.busy = false; }
}

/* ---------- Dateien ---------- */
const FSlocal = { put: FS.put.bind(FS), get: FS.get.bind(FS), del: FS.del.bind(FS) };
FS.put = async (id, name, blob) => { await FSlocal.put(id, name, blob); if (SY.on) fileUp(id, name, blob).catch(e => { SY.error = e.message; syncBadge(); }); };
FS.get = async id => { try { return await FSlocal.get(id); } catch (e) { if (!SY.on) throw e; const b = await fileDown(id); if (!b) throw e; return b; } };
FS.del = async id => { await FSlocal.del(id).catch(() => {}); if (SY.on) fileDel(id).catch(() => {}); };
const sf = () => store.get('syncFiles', {}) || {};
function b64ToBlob(b64, type) { const bin = atob(b64), n = bin.length, u8 = new Uint8Array(n); for (let i = 0; i < n; i++) u8[i] = bin.charCodeAt(i); return new Blob([u8], { type }); }
async function fileUp(id, name, blob) {
  if (blob.size > FILE_MAX) return;
  const b64 = (await blobToDataUrl(blob)).split(',')[1], n = Math.ceil(b64.length / PART), writes = [];
  for (let i = 0; i < n; i++) writes.push({ update: { name: docName(`files/${id}/p/p${String(i).padStart(4, '0')}`), fields: { d: sv(b64.slice(i * PART, (i + 1) * PART)) } } });
  writes.push({ update: { name: docName(`files/${id}`), fields: { name: sv(name || ''), type: sv(blob.type || ''), size: iv(blob.size), n: iv(n), t: iv(Date.now()) } } });
  await commit(writes);
  const m = sf(); m[id] = Date.now(); rawSet('syncFiles', m);
}
async function fileDown(id) {
  const meta = await cloud('GET', `/cockpit/${SY.uid}/files/${id}`).catch(() => null); if (!meta) return null;
  const n = fget(meta, 'n') || 0, type = fget(meta, 'type') || 'application/octet-stream';
  const parts = await batchGet([...Array(n)].map((_, i) => docName(`files/${id}/p/p${String(i).padStart(4, '0')}`)));
  if (parts.length !== n) return null;
  parts.sort((a, b) => a.name.localeCompare(b.name));
  const blob = b64ToBlob(parts.map(p => fget(p, 'd') || '').join(''), type);
  await FSlocal.put(id, fget(meta, 'name') || 'Datei', blob);
  const m = sf(); m[id] = Date.now(); rawSet('syncFiles', m);
  return blob;
}
async function fileDel(id) {
  const meta = await cloud('GET', `/cockpit/${SY.uid}/files/${id}`).catch(() => null);
  const n = meta ? fget(meta, 'n') || 0 : 0;
  await commit([...[...Array(n)].map((_, i) => ({ delete: docName(`files/${id}/p/p${String(i).padStart(4, '0')}`) })), { delete: docName(`files/${id}`) }]);
  const m = sf(); delete m[id]; rawSet('syncFiles', m);
}
let filesRunning = false;
async function syncFiles() {
  if (!SY.on || filesRunning) return; filesRunning = true;
  try {
    const r = await cloud('GET', `/cockpit/${SY.uid}/files?pageSize=300&mask.fieldPaths=t`).catch(() => ({}));
    const remote = new Set((r.documents || []).map(d => d.name.split('/').pop()));
    const m = sf();
    for (const f of files) {
      if (remote.has(f.id)) { if (!m[f.id]) { /* nur in der Cloud bekannt: vorladen, wenn klein */ if ((f.size || 0) < 8e6) { try { await FSlocal.get(f.id); m[f.id] = Date.now(); rawSet('syncFiles', m); } catch (e) { await fileDown(f.id).catch(() => {}); } } } continue; }
      try { const b = await FSlocal.get(f.id); await fileUp(f.id, f.name, b); } catch (e) { /* liegt nur auf einem anderen Gerät und dort noch nicht hochgeladen */ }
    }
  } finally { filesRunning = false; syncBadge(); }
}

/* ---------- Start, erste Anmeldung, Abfragen ---------- */
async function syncBegin(fresh) {
  const t = await syncToken().catch(() => null); if (!t) return false;
  SY.uid = t.uid; SY.email = t.email || ''; SY.name = t.name || '';
  store.set('syncInfo', { uid: SY.uid, email: SY.email, name: SY.name });
  SY.on = true;
  if (fresh) {
    /* erste Anmeldung auf diesem Gerät: gibt es schon Daten in der Cloud? */
    let index = null; try { index = await cloud('GET', `/cockpit/${SY.uid}/meta/index`); } catch (e) { if (e.status !== 404) { SY.error = e.message; syncBadge(); toast(e.message, 'x'); return true; } }
    const remoteN = index ? Object.keys(fget(index, 'keys') || {}).length : 0;
    const localKeys = Object.keys(NATIVE ? MEM : allLocalKeys()).filter(k => !SYNC_LOCAL.has(k) && rawGet(k) != null);
    if (!remoteN) { const m = syncMeta(); const now = Date.now(); localKeys.forEach(k => { if (!m.ts[k]) m.ts[k] = now; }); rawSet('syncMeta', m); await syncPull(true); toast('Synchronisierung eingerichtet – deine Daten sind jetzt in deinem Konto', 'check'); }
    else if (localKeys.length) { syncChoice(remoteN); return true; }
    else { await syncPull(true); toast('Daten aus deinem Konto übernommen', 'check'); }
  } else await syncPull(true);
  clearInterval(SY.poll); SY.poll = setInterval(() => { if (!document.hidden) syncPull(); }, NATIVE ? 30000 : 20000);
  return true;
}
function allLocalKeys() { const o = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('cockpit:')) o[k.slice(8)] = 1; } } catch (e) {} return o; }
function syncChoice(remoteN) {
  modal(`<div class="glass modal" role="dialog" aria-label="Daten zusammenführen"><h3>In deinem Konto liegen schon Cockpit-Daten</h3>
    <p class="lead">Auf diesem Gerät gibt es ebenfalls Daten. Was soll gelten?</p>
    <div class="wlist"><button class="wrow choice" id="chCloud"><span class="tile sm" style="--c:#4F7BFF">${ic('download', 'i sm')}</span><span class="t"><b>Daten aus dem Konto übernehmen</b><span>Empfohlen für ein weiteres Gerät. Was nur hier liegt und neuer ist, bleibt erhalten.</span></span></button>
    <button class="wrow choice" id="chLocal"><span class="tile sm" style="--c:#F25FB0">${ic('upload', 'i sm')}</span><span class="t"><b>Dieses Gerät hochladen</b><span>Überschreibt die Daten im Konto mit dem Stand dieses Geräts.</span></span></button></div>
    <div class="row"><button class="btn" id="chLater">Später</button></div></div>`);
  const go2 = async local => { close(); const m = syncMeta(), now = Date.now();
    Object.keys(NATIVE ? MEM : allLocalKeys()).forEach(k => { if (!SYNC_LOCAL.has(k) && rawGet(k) != null && (local || !m.ts[k])) m.ts[k] = local ? now : 0; });
    rawSet('syncMeta', m); await syncPull(true); clearInterval(SY.poll); SY.poll = setInterval(() => { if (!document.hidden) syncPull(); }, NATIVE ? 30000 : 20000);
    toast(local ? 'Dieses Gerät wurde hochgeladen' : 'Daten aus deinem Konto übernommen', 'check'); };
  $('#chCloud').onclick = () => go2(false); $('#chLocal').onclick = () => go2(true);
  $('#chLater').onclick = () => { close(); syncStop(); };
}
function syncBadge() {
  const el = $('#syncState'); if (el) el.innerHTML = syncStateHtml();
  const r = $('#railSet'); if (r) r.classList.toggle('sync-err', !!(SY.on && SY.error));
}
function syncStateHtml() {
  if (!SY.on) return '<span>Nicht angemeldet – alles bleibt auf diesem Gerät.</span>';
  const when = t => t ? new Date(t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '–';
  return SY.error ? `<span class="bad">${esc(SY.error)}</span>` : `<span class="ok">Verbunden</span> · zuletzt abgeglichen ${when(Math.max(SY.lastPull, SY.lastPush))}`;
}
async function syncDeleteCloud() {
  if (!SY.on) return;
  toast('Daten im Konto werden gelöscht …', 'trash');
  try {
    const idx = await cloud('GET', `/cockpit/${SY.uid}/meta/index`).catch(() => null);
    const ids = idx ? Object.keys(fget(idx, 'keys') || {}) : [];
    const keyDocs = await batchGet(ids.map(id => docName(`keys/${id}`)));
    const writes = [];
    keyDocs.forEach(d => { const n = fget(d, 'n') || 0, id = d.name.split('/').pop(); for (let i = 0; i < n; i++) writes.push({ delete: docName(`keys/${id}__p${i}`) }); writes.push({ delete: d.name }); });
    writes.push({ delete: docName('meta/index') });
    await commit(writes);
    const fl = await cloud('GET', `/cockpit/${SY.uid}/files?pageSize=300&mask.fieldPaths=n`).catch(() => ({}));
    for (const d of fl.documents || []) await fileDel(d.name.split('/').pop()).catch(() => {});
    rawSet('syncFiles', {});
    toast('Deine Cockpit-Daten im Konto sind gelöscht', 'trash');
  } catch (e) { toast('Löschen fehlgeschlagen: ' + e.message, 'x'); }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && SY.on) syncPull(); });
window.addEventListener('pagehide', () => { if (SY.on && SY.dirty.size) syncPush(); });
/* angemeldet geblieben? dann still weitermachen */
if ((store.get('syncInfo', null) || {}).uid) setTimeout(() => syncBegin(false).then(ok => { if (!ok) syncBadge(); }), 1200);

/* =====================================================================
   SUCHE (⌘K)
   ===================================================================== */
async function palette() {
  modal(`<div class="glass pal" role="dialog" aria-label="Suche"><label class="s">${ic('search')}<input id="pq" placeholder="Apps, Projekte, Notizen, Dateien, buildspace-Tools …" autocomplete="off" spellcheck="false"><span class="kbd">Esc</span></label><div class="res" id="pr" role="listbox"></div></div>`);
  let sel = 0, items = [], posts = [];
  loadPosts().then(p => { posts = p; run(); });
  const has = (s, q) => String(s || '').toLowerCase().includes(q);
  function run() {
    const v = $('#pq') ? $('#pq').value.trim() : ''; if (!$('#pr')) return; const lv = v.toLowerCase(); items = [];
    const add = (group, list) => list.forEach(x => items.push(Object.assign({ group }, x)));
    add('Ansichten', VIEWS.filter(w => !lv || has(w.name, lv)).map(w => ({ label: w.name, icon: w.icon, color: '#64748B', run: () => go(w.id), hint: 'Ansicht' })));
    add('Apps', apps.filter(a => !lv || has(a.name, lv) || has(a.sub, lv)).map(a => ({ label: a.name, sub: a.sub, app: a, run: () => openApp(a), hint: 'Öffnen' })));
    if (lv) {
      add('Projekte', tasks.filter(t => has(t.title, lv) || has(t.note, lv)).slice(0, 5).map(t => ({ label: t.title, sub: KCOLS.find(c => c.id === t.col).name, icon: 'kanban', color: (AREAS[t.area] || AREAS.sonst).c, run: () => { go('projekte'); setTimeout(() => editTask(t), 80); } })));
      add('Notizen', notes.filter(n => has(n.t, lv)).slice(0, 4).map(n => ({ label: n.t, icon: 'note', color: '#2FA36B', run: () => go('start') })));
      add('Gespeichert', saved.filter(s => has(s.title, lv) || has(s.note, lv) || has(s.url, lv)).slice(0, 5).map(s => ({ label: s.title, sub: hostOf(s.url), icon: 'bookmark', color: (SV_CATS[s.cat] || SV_CATS.links).c, run: () => openUrl(s.url, s.title) })));
      add('Dateien', files.filter(f => has(f.name, lv)).slice(0, 4).map(f => ({ label: f.name, icon: 'file', color: '#F25FB0', run: () => { openFileId = f.id; go('dateien'); } })));
      add('Whiteboard', boards.filter(b => has(b.name, lv)).map(b => ({ label: b.name, icon: 'whiteboard', color: '#2DD4BF', run: () => { wbActive = b.id; go('whiteboard'); } })));
      add('buildspace', posts.filter(p => has(p.title, lv) || has(p.excerpt, lv)).slice(0, 8).map(p => ({ label: `${p.emoji ? p.emoji + ' ' : ''}${p.title}`, sub: p.excerpt, icon: 'rocket', color: '#A46BFF', run: () => openUrl(postUrl(p.url), p.title), hint: 'buildspace' })));
      add('Aktionen', [
        { label: `Auf buildspace suchen: „${v}“`, icon: 'globe', color: '#A46BFF', run: () => openUrl(SITE + '?q=' + encodeURIComponent(v), 'buildspace') },
        { label: `Claude fragen: „${v}“`, icon: 'sparkle', color: '#D97757', run: () => sendQ('claude', v) },
        { label: `ChatGPT fragen: „${v}“`, icon: 'bubble', color: '#10a37f', run: () => sendQ('chatgpt', v) },
        { label: `Als Projekt anlegen: „${v}“`, icon: 'kanban', color: '#4F7BFF', run: () => sendQ('task', v) },
        { label: `Als Notiz speichern: „${v}“`, icon: 'note', color: '#64748B', run: () => sendQ('note', v) },
        { label: `Erinnerung anlegen: „${v}“`, icon: 'bell', color: '#E0B24A', run: () => sendQ('reminder', v) }
      ]);
    }
    sel = Math.min(sel, Math.max(items.length - 1, 0));
    let last = '';
    $('#pr').innerHTML = items.map((x, i) => { const h = x.group !== last ? `<h6>${x.group}</h6>` : ''; last = x.group;
      return h + `<button class="r" role="option" data-i="${i}" aria-selected="${i === sel}">${x.app ? tileHtml(x.app, true) : `<span class="tile sm" style="--c:${x.color}">${ic(x.icon, 'i sm')}</span>`}<span class="t"><b>${esc(x.label)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</span>${x.hint ? `<small>${x.hint}</small>` : ''}</button>`; }).join('') || '<p class="empty" style="padding:12px">Nichts gefunden.</p>';
    $('#pr [aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }
  const pick = i => { const x = items[i]; if (!x) return; close(); x.run(); };
  run(); $('#pq').focus();
  $('#pq').addEventListener('input', () => { sel = 0; run(); });
  $('#pq').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, items.length - 1); run(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); run(); e.preventDefault(); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(sel); }
  });
  $('#pr').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) pick(+b.dataset.i); });
}
document.addEventListener('keydown', e => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette(); return; }
  if (e.key === 'Escape') { if ($('#tmBigView')) $('#tmBigView').remove(); else if ($('#ov').innerHTML) close(); else if ($('#notifP')) closeNotif(); else if (document.body.classList.contains('edit-on')) setEdit(false); else wbExitFull(); return; }
  if ($('#tmBigView') && e.key === ' ') { e.preventDefault(); tmToggle(); return; }
  if (typing || $('#ov').innerHTML) return;
  if (currentView === 'whiteboard' && wb && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? wb.redo() : wb.undo(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '/') { e.preventDefault(); palette(); }
  if (currentView === 'start' && hotkeysOn() && /^[1-6]$/.test(e.key)) { const a = dockApps()[+e.key - 1]; if (a) openApp(a); }
});

/* =====================================================================
   EINSTELLUNGEN
   ===================================================================== */
const SHORTCUTS = [
  { n: 'Cockpit Kalender', a: 'Aktion „App öffnen“ → Kalender' },
  { n: 'Cockpit Erinnerungen', a: 'Aktion „App öffnen“ → Erinnerungen' },
  { n: 'Cockpit Mail', a: 'Aktion „App öffnen“ → Mail' },
  { n: 'Cockpit iDoceo', a: 'Aktion „App öffnen“ → iDoceo' },
  { n: 'Cockpit Erinnerung neu', a: 'Aktion „Erinnerung hinzufügen“, als Titel die „Kurzbefehleingabe“ wählen. In den Details „Eingabe empfangen: Text“ einschalten.' }
];
const TABS = [['personal', 'Persönlich'], ['sync', 'Synchronisieren'], ['look', 'Aussehen'], ['widgets', 'Widgets'], ['calendar', 'Kalender'], ['notify', 'Mitteilungen'], ['install', 'Installieren'], ['shortcuts', 'Kurzbefehle'], ['transfer', 'Übertragen'], ['diag', 'Diagnose']];
function bgTiles(cur, withUpload) {
  const custom = store.get('bgImage', '');
  return BG_PRESETS.map(b => `<button type="button" data-bg="${b.id}" aria-pressed="${cur === b.id}" style="background-image:${b.css.replace(/"/g, "'")}"><span>${b.name}</span></button>`).join('')
    + (custom ? `<button type="button" data-bg="custom" aria-pressed="${cur === 'custom'}" style="background-image:url('${custom}')"><span>Eigenes Bild</span></button>` : '')
    + (withUpload ? `<button type="button" class="up" data-bgup>${ic('image', 'i')}<span style="background:none;color:var(--ink-2);position:static;padding:4px 0 0">Bild wählen</span></button>` : '');
}
function setup(tab = 'personal') {
  closeNotif();
  const isMac = !!NATIVE || (/Macintosh/.test(navigator.userAgent) && !('ontouchend' in document));
  const P = getProfile(), L = getLook();
  const body = {
    personal: `<div class="two"><label class="field">Dein Name<input id="pName" value="${esc(P.name)}" placeholder="z. B. Marc" autocomplete="given-name"><small>Erscheint in der Begrüßung.</small></label>
      <label class="field">Name der App<input id="pTitle" value="${esc(P.title)}" placeholder="Cockpit" maxlength="24"><small>${NATIVE ? 'Fenstertitel und Name im Seitenreiter.' : 'Name im Seitenreiter und auf dem Home-Bildschirm.'}</small></label></div>
      <div class="field">App-Symbol<div class="ic-row"><img class="ic-prev" id="pIcPrev" src="${esc(iconCache || 'icon-192.png')}" alt=""><div class="seg" id="pIcKind">${[['logo', 'buildspace'], ['gen', 'Gestalten'], ['custom', 'Eigenes Bild']].map(([k, l]) => `<button type="button" data-k="${k}" aria-pressed="${P.icon.kind === k}">${l}</button>`).join('')}</div></div></div>
      <div id="pIcGen" ${P.icon.kind === 'gen' ? '' : 'hidden'}><div class="field">Farbe<div class="swatches" id="pIcCol">${ICON_COLORS.map((c, i) => `<button type="button" data-ic="${i}" aria-pressed="${P.icon.color === i}" style="background:linear-gradient(135deg,${c[0]},${c[1]})" aria-label="Farbe ${i + 1}"></button>`).join('')}</div></div>
        <div class="field">Symbol<div class="syms" id="pIcSym">${ICON_SYMS.map(s => `<button type="button" data-sym="${s}" aria-pressed="${!P.icon.text && P.icon.sym === s}" aria-label="${s}">${ic(s, 'i sm')}</button>`).join('')}</div></div>
        <label class="field">… oder Buchstaben (max. 2)<input id="pIcTxt" maxlength="2" value="${esc(P.icon.text)}" placeholder="z. B. MS"></label></div>
      <div id="pIcCustom" ${P.icon.kind === 'custom' ? '' : 'hidden'}><button type="button" class="btn" id="pIcUp">${ic('image', 'i sm')} Bild auswählen</button></div>
      <p class="lead" style="margin-top:12px">${NATIVE ? 'Das Symbol erscheint im Dock, solange Cockpit läuft.' : 'Auf dem iPad gilt ein neues Symbol, wenn du Cockpit neu zum Home-Bildschirm hinzufügst.'}</p>`,
    look: `<div class="field">Hintergrund<div class="bgs" id="lBg">${bgTiles(L.bg, true)}</div></div>
      <div class="lrange"><label for="lBlur">Glas-Unschärfe <output id="oBlur" class="num">${L.blur} px</output></label><input type="range" id="lBlur" min="0" max="60" value="${L.blur}"></div>
      <div class="lrange"><label for="lGlass">Glas-Deckkraft <output id="oGlass" class="num">${L.glass} %</output></label><input type="range" id="lGlass" min="0" max="30" step=".5" value="${L.glass}"></div>
      <div class="lrange"><label for="lDim">Hintergrund abdunkeln <output id="oDim" class="num">${L.dim} %</output></label><input type="range" id="lDim" min="0" max="90" value="${L.dim}"></div>
      <div class="field">Akzentfarbe<div class="swatches" id="lAcc">${Object.keys(ACCENTS).map(k => `<button type="button" data-acc="${k}" aria-pressed="${L.accent === k}" style="background:linear-gradient(135deg,${ACCENTS[k][0]},${ACCENTS[k][1]})" aria-label="${ACCENT_NAMES[k]}" title="${ACCENT_NAMES[k]}"></button>`).join('')}</div></div>
      <div class="row" style="justify-content:flex-start"><button type="button" class="btn" id="lReset">Aussehen zurücksetzen</button></div>`,
    widgets: widgetsTab(),
    calendar: `<p class="lead">${NATIVE ? 'Termine aus der Mac-Kalender-App erscheinen automatisch, sobald du den Zugriff erlaubst. Zusätzlich kannst du Kalender-Abos (iCal-Links) eintragen.' : 'Im Browser kann Cockpit nur eigene Termine und Abos von Servern laden, die das erlauben. IServ- und WebUntis-Abos funktionieren zuverlässig in der Mac-App.'}</p>
      <h4 style="margin:0 0 8px;font-size:13px">Kalender-Abos</h4>
      <div class="wlist" id="feedList">${getFeeds().map(f => `<div class="wrow"><span class="tile sm" style="--c:${esc(f.color)}">${ic('cal', 'i sm')}</span><span class="t"><b>${esc(f.name)}</b><span>${esc(f.url)}</span></span><button class="sw" role="switch" data-feedon="${f.id}" aria-checked="${f.on !== false}" aria-label="Anzeigen"></button><button class="x" data-feeddel="${f.id}" aria-label="Entfernen">${ic('trash', 'i sm')}</button></div>`).join('') || '<p class="empty">Noch kein Abo.</p>'}</div>
      <form id="feedForm" style="margin-top:14px"><div class="two"><label class="field">Name<input id="fdN" placeholder="z. B. WebUntis" required></label><label class="field">iCal-Link<input id="fdU" placeholder="https://… oder webcal://…" required autocapitalize="off" spellcheck="false"></label></div>
        <div class="field">Farbe<div class="swatches" id="fdC">${EV_COLORS.map((c, i) => `<button type="button" style="background:${c}" data-c="${c}" aria-pressed="${i === 4}" aria-label="Farbe"></button>`).join('')}</div></div>
        <div class="row" style="justify-content:flex-start"><button class="btn pri">${ic('plus', 'i sm')} Abo hinzufügen</button></div></form>
      <ol class="steps" style="margin-top:14px"><li><b>WebUntis:</b> In der App unter Kalender › Menü › Kalender › „abo (alle)“ den Link kopieren.</li><li><b>IServ:</b> Kalender › Kalender abonnieren (oder Exportieren) › iCal-Adresse kopieren.</li></ol>`,
    notify: `<div class="wlist"><div class="wrow"><span class="tile sm" style="--c:#E0B24A">${ic('bell', 'i sm')}</span><span class="t"><b>System-Mitteilungen</b><span>${NATIVE ? 'macOS meldet sich 15 Minuten vor Terminen, bei fälligen Aufgaben und wenn der Timer abläuft.' : 'Der Browser meldet sich 15 Minuten vor Terminen und bei fälligen Aufgaben, solange Cockpit geöffnet ist.'}</span></span><button class="sw" role="switch" id="nSys" aria-checked="${notifyPrefs().system}" aria-label="System-Mitteilungen"></button></div>
      ${NATIVE ? `<div class="wrow"><span class="tile sm" style="--c:#25D366">${ic('phonechat', 'i sm')}</span><span class="t"><b>WhatsApp-Mitteilungen</b><span>Neue Nachrichten aus WhatsApp im Cockpit als macOS-Mitteilung, mit Absender und Text. Ein Klick öffnet den Chat. Läuft die WhatsApp-App, meldet sie sich selbst.</span></span><button class="sw" role="switch" id="nWa" aria-checked="${notifyPrefs().whatsapp !== false}" aria-label="WhatsApp-Mitteilungen"></button></div>
      <div class="wrow" id="nSysState"><span class="t"><b>macOS-Erlaubnis</b><span>Wird geprüft …</span></span><button class="btn sm" id="nSysPrefs">${ic('gear', 'i xs')} Systemeinstellungen</button></div>` : ''}
      ${!NATIVE && 'Notification' in window ? `<div class="wrow"><span class="t"><b>Browser-Erlaubnis</b><span>Status: ${Notification.permission === 'granted' ? 'erlaubt' : Notification.permission === 'denied' ? 'blockiert (in den Browser-Einstellungen ändern)' : 'noch nicht gefragt'}</span></span>${Notification.permission === 'default' ? '<button class="btn sm" id="nAsk">Erlauben</button>' : ''}</div>` : ''}</div>
      <h4 style="margin:18px 0 8px;font-size:13px">buildspace-Aufrufe</h4>
      <div class="wlist"><div class="wrow"><span class="t"><b>Eigene Aufrufe nicht zählen</b><span>${location.host === 'buildspaceos.de' ? 'Gilt für diesen Browser.' : 'Öffne dafür Cockpit unter buildspaceos.de/cockpit in dem Browser, mit dem du buildspace nutzt.'}</span></span>${location.host === 'buildspaceos.de' ? `<button class="sw" role="switch" id="nNoCount" aria-checked="${(() => { try { return localStorage.getItem('bs_nocount') === '1'; } catch (e) { return false; } })()}" aria-label="Eigene Aufrufe nicht zählen"></button>` : ''}</div></div>
      <div class="row" style="justify-content:flex-start"><button class="btn sm" data-stats-setup>${ic('chart', 'i xs')} Zähler einrichten</button></div>`,
    install: NATIVE ? `<ol class="steps"><li><b>Mac-App läuft.</b> Zieh Cockpit aus dem Ordner „Programme“ ins Dock.</li><li><b>Termine:</b> Kalender › Quellen › „Verbinden“. Später änderbar unter Systemeinstellungen › Datenschutz & Sicherheit › Kalender.</li><li><b>Erinnerungen:</b> Beim ersten Mal fragt macOS, ob Cockpit „Erinnerungen“ steuern darf. Mit „OK“ bestätigen.</li><li><b>iPad:</b> Safari öffnen, buildspaceos.de/cockpit aufrufen, <b>Teilen › Zum Home-Bildschirm</b>. Einstellungen holst du mit „Übertragen“ rüber.</li></ol>`
      : `<ol class="steps"><li><b>${isMac ? 'Mac' : 'iPad'} (dieses Gerät):</b> ${isMac ? 'In Safari oben auf <b>Ablage › Zum Dock hinzufügen</b>. Oder besser: die <b>Mac-App</b> von buildspace › Programme laden – sie kann zusätzlich deinen Kalender, Mac-Programme und Mitteilungen.' : 'In Safari auf <b>Teilen › Zum Home-Bildschirm</b>. Cockpit öffnet sich danach im Vollbild wie eine App.'}</li><li><b>Einstellungen übertragen:</b> Im Reiter „Übertragen“ den Code kopieren und auf dem anderen Gerät einfügen.</li></ol>`,
    shortcuts: `<p class="lead">${NATIVE ? 'In der Mac-App brauchst du keine Kurzbefehle: Kalender, Erinnerungen, Mail, iDoceo und WhatsApp öffnen direkt. Die Kurzbefehle brauchst du nur auf dem iPad:' : 'Kalender, Erinnerungen, Mail und iDoceo sind Apps auf dem Gerät. Eine Webseite darf sie nicht direkt starten, ein Kurzbefehl schon. Leg diese fünf Kurzbefehle in der App „Kurzbefehle“ an. Antippen kopiert den Namen.'}</p>
      <ol class="steps">${SHORTCUTS.map(s => `<li><code data-cp="${esc(s.n)}">${esc(s.n)}</code><br><span style="color:var(--ink-2);font-size:12px">${s.a}</span></li>`).join('')}</ol>`,
    sync: SY.on ? `<div class="wrow"><span class="tile sm" style="--c:#4F7BFF">${ic('user', 'i sm')}</span><span class="t"><b>${esc(SY.name || SY.email || 'Google-Konto')}</b><span>${esc(SY.email)}</span></span><button class="btn sm" id="syOut">Abmelden</button></div>
      <p class="lead" id="syncState" style="margin:12px 0">${syncStateHtml()}</p>
      ${/Regel/.test(SY.error) ? `<div class="box-warn"><b>Firestore-Regel fehlt</b><p class="lead" style="margin:4px 0 8px">In der Firebase-Konsole (Projekt <code>${FBC.projectId}</code> › Firestore › Regeln) diesen Block innerhalb von <code>match /databases/{database}/documents { … }</code> einfügen und veröffentlichen:</p><textarea class="code" readonly id="syRule">${esc(SYNC_RULE)}</textarea><div class="row" style="justify-content:flex-start"><button class="btn sm" id="syRuleCp">${ic('copy', 'i xs')} Regel kopieren</button><button class="btn sm" id="syFb">${ic('ext', 'i xs')} Firebase-Konsole</button></div></div>` : ''}
      <p class="lead">Abgeglichen werden Apps, Startseite, Notizen, Projekte, Lesezeichen, Termine, Abos, Countdowns, Whiteboards, Name und Aussehen – und deine <b>Dateien</b> (PDFs und Bilder bis 40 MB) samt Eintragungen. Mac-Kalender und WhatsApp-Anmeldung bleiben pro Gerät.</p>
      <div class="row" style="justify-content:flex-start"><button class="btn pri" id="syNow">${ic('refresh', 'i sm')} Jetzt abgleichen</button><span class="spacer"></span><button class="btn danger" id="syDel">Daten im Konto löschen</button></div>`
      : `<p class="lead">Melde dich mit deinem Google-Konto an, dann hast du auf Mac, iPad und im Browser überall dasselbe Cockpit: Apps, Startseite, Notizen, Projekte, Lesezeichen, Termine, Whiteboards, Aussehen – und deine <b>Dateien</b> (PDFs und Bilder) samt Eintragungen.</p>
      <div class="row" style="justify-content:flex-start;margin:4px 0 14px"><button class="btn pri" id="syIn">${ic('user', 'i sm')} Mit Google anmelden</button></div>
      <ol class="steps"><li>${NATIVE ? 'Dein Browser öffnet sich, du meldest dich dort an. Cockpit verbindet sich danach von selbst.' : 'Ein Google-Fenster öffnet sich, du meldest dich an.'}</li><li>Auf dem nächsten Gerät genauso anmelden – dort fragt Cockpit, ob es die Daten aus deinem Konto übernehmen soll.</li></ol>
      <p class="lead"><small>Die Daten liegen in deinem buildspace-Firebase-Projekt (Google), nur dein Konto kann sie lesen. Bitte für Schüler:innen weiterhin nur Pseudonyme verwenden. Ohne Anmeldung bleibt alles nur auf diesem Gerät.</small></p>`,
    transfer: `<p class="lead">Apps, Notizen, Projekte, Lesezeichen, Termine, Abos, Countdowns, Name, Aussehen und die Anordnung der Startseite liegen nur auf diesem Gerät. Kopier den Code und füg ihn auf dem anderen Gerät ein. Whiteboards, Dateien und eigene Bilder werden nicht mit übertragen.</p>
      <label class="field">Code dieses Geräts<textarea class="code" id="exp" readonly>${esc(btoa(unescape(encodeURIComponent(JSON.stringify({ v: 3, apps, notes, countdowns: cds, tasks, saved, events: ownEvents, icsFeeds: getFeeds(), profile: getProfile(), look: getLook(), widgets: getWidgets(), board: getBoard(), boardOff: store.get('boardOff', []), hotkeys: store.get('hotkeys', true) })))))}</textarea></label>
      <div class="row" style="justify-content:flex-start;margin:-4px 0 14px"><button class="btn" id="cpExp">${ic('copy', 'i sm')} Code kopieren</button></div>
      <label class="field">Code vom anderen Gerät einfügen<textarea class="code" id="imp" placeholder="Code hier einfügen …"></textarea></label>
      <div class="row" style="justify-content:flex-start"><button class="btn pri" id="doImp">Übernehmen</button><span class="spacer"></span><button class="btn danger" id="reset">Apps auf Standard zurücksetzen</button></div>`,
    diag: `<dl class="diag"><dt>Version</dt><dd>Cockpit ${APP_VERSION}${NATIVE ? ' · Mac-App' : ' · Web-App'}</dd>
      <dt>Verbindung</dt><dd>${NATIVE ? '<span class="ok">Mac-App verbunden</span>' : location.protocol === 'file:' ? '<span class="bad">Keine Verbindung zur Mac-App</span>' : 'Browser'}</dd>
      <dt>Speicher</dt><dd>${NATIVE ? '~/Library/Application Support/Cockpit/state.json' : 'Browser-Speicher dieses Geräts'}</dd>
      <dt>Mac-Funktionen</dt><dd>${NATIVE ? ['open_url', 'open_app', 'events', 'fetch_text', 'notify', 'file_save', 'save_download', 'wa_show', 'wa_status', 'wa_debug', 'notify_status'].map(f => `${f} ${typeof NATIVE[f] === 'function' ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>'}`).join(' · ') : '–'}</dd></dl>
      <div class="row" style="justify-content:flex-start"><button class="btn" id="dgUrl">${ic('ext', 'i sm')} Test: buildspace öffnen</button>${NATIVE ? `<button class="btn" id="dgApp">${ic('cal', 'i sm')} Test: Kalender-App öffnen</button><button class="btn" id="dgNote">${ic('bell', 'i sm')} Test: Mitteilung</button>` : ''}</div>`
  };
  modal(`<div class="glass modal wide" role="dialog" aria-label="Einstellungen"><div class="mh"><h3>Einstellungen</h3><button class="orb sm" data-close aria-label="Schließen">${ic('x', 'i xs')}</button></div>
    <div class="tabs">${TABS.map(([k, l]) => `<button class="chipbtn" data-tab="${k}" aria-pressed="${k === tab}">${l}</button>`).join('')}</div>${body[tab]}</div>`);
  $$('[data-tab]').forEach(b => b.onclick = () => setup(b.dataset.tab));
  bindSettings(tab);
}

function moveOnBoard(key, dir) {
  const b = getBoard(), i = b.findIndex(it => itemKey(it) === key), j = i + dir;
  if (i < 0 || j < 0 || j >= b.length) return;
  [b[i], b[j]] = [b[j], b[i]]; setBoard(b);
}
function widgetRow(w, it) {
  const on = w.id === 'clock' ? widgetOn('clock') : !!it;
  return `<div class="wrow" data-wrow="${w.id}"><span class="tile sm" style="--c:${w.color}">${ic(w.icon, 'i sm')}</span><span class="t"><b>${w.name}</b><span>${w.desc}</span></span>
    ${it ? `<span class="wpos"><button type="button" class="orb sm" data-smv="-1" aria-label="${w.name} weiter nach vorne">${ic('up', 'i xs')}</button><button type="button" class="orb sm" data-smv="1" aria-label="${w.name} weiter nach hinten">${ic('down', 'i xs')}</button>
    <select data-ssize aria-label="Größe von ${w.name}">${WSIZES[w.id].map(s => `<option value="${s}"${s === it.s ? ' selected' : ''}>${SIZE_NAMES[s]}</option>`).join('')}</select></span>` : ''}
    <button type="button" class="sw" role="switch" data-wsw="${w.id}" aria-checked="${on}" aria-label="${w.name} anzeigen"></button></div>`;
}
function widgetsTab() {
  const b = getBoard(), dockOn = widgetOn('dock'), hk = store.get('hotkeys', true) !== false;
  const placed = b.filter(it => it.k === 'w' && showable(it)), off = WIDGETS.filter(w => w.id !== 'clock' && !(w.nativeOnly && !NATIVE) && !placed.some(it => it.id === w.id));
  const nApps = b.filter(it => it.k === 'a' && showable(it)).length;
  return `<p class="lead">Ein- und ausblenden, Größe und Reihenfolge festlegen. Am schnellsten geht es direkt auf der Startseite: <b>Anpassen</b> (oder lange auf einen Baustein drücken), dann ziehen und an der Ecke die Größe ändern.</p>
    <div class="wlist" style="margin-bottom:14px">${widgetRow(wDef('clock'))}
      <div class="wrow${dockOn ? '' : ' dis'}"><span class="tile sm" style="--c:#64748B">${ic('keyboard', 'i sm')}</span><span class="t"><b>Kurzwahltasten 1–6</b><span>${dockOn ? 'Die Tasten 1 bis 6 öffnen die Apps im Schnellstart.' : 'Nur mit eingeblendetem Schnellstart verfügbar.'}</span></span><button type="button" class="sw" role="switch" id="hkSw" aria-checked="${dockOn && hk}" aria-label="Kurzwahltasten 1 bis 6" ${dockOn ? '' : 'aria-disabled="true" disabled'}></button></div></div>
    <h4 class="zh">Auf der Startseite</h4><div class="wlist">${placed.map(it => widgetRow(wDef(it.id), it)).join('') || '<p class="empty" style="margin:0">Noch keine Widgets.</p>'}</div>
    ${off.length ? `<h4 class="zh">Ausgeblendet</h4><div class="wlist">${off.map(w => widgetRow(w, null)).join('')}</div>` : ''}
    <p class="lead" style="margin-top:12px">Außerdem ${nApps} App${nApps === 1 ? '' : 's'} und Links als eigene Bausteine – verschieben, vergrößern oder entfernen im <b>Anpassen</b>-Modus.</p>
    <div class="row" style="justify-content:flex-start;margin-top:6px"><button type="button" class="btn" id="lyReset">Startseite zurücksetzen</button><button type="button" class="btn" id="lyArrange">${ic('layout', 'i sm')} Auf der Startseite anpassen</button></div>`;
}
function bindWidgetsTab() {
  const re = () => { const y = $('#ov .modal')?.scrollTop || 0, f = document.activeElement?.closest('[data-wrow]')?.dataset.wrow, fa = document.activeElement?.dataset?.smv; setup('widgets'); const m = $('#ov .modal'); if (m) m.scrollTop = y; if (f && fa) $(`[data-wrow="${f}"] [data-smv="${fa}"]`)?.focus(); };
  $$('[data-wsw]').forEach(b => b.addEventListener('click', () => { const on = b.getAttribute('aria-checked') !== 'true'; setWidget(b.dataset.wsw, on); re(); }));
  $('#hkSw')?.addEventListener('click', () => { if (!widgetOn('dock')) return; const on = store.get('hotkeys', true) === false; store.set('hotkeys', on); renderApps(); re(); toast(on ? 'Kurzwahltasten 1–6 an' : 'Kurzwahltasten 1–6 aus', 'keyboard'); });
  $$('[data-smv]').forEach(b => b.addEventListener('click', () => { moveOnBoard('w:' + b.closest('[data-wrow]').dataset.wrow, +b.dataset.smv); re(); }));
  $$('[data-ssize]').forEach(sl => sl.addEventListener('change', () => { const id = sl.closest('[data-wrow]').dataset.wrow, bd = getBoard(), it = bd.find(x => x.k === 'w' && x.id === id); if (it) { it.s = sl.value; setBoard(bd); refreshWidget(id); } }));
  $('#lyReset').onclick = function () { if (!this.dataset.sure) { this.dataset.sure = 1; this.textContent = 'Wirklich zurücksetzen?'; return; } store.set('layout', null); store.set('boardOff', []); store.set('homeBoard', null); renderBoard(); re(); toast('Startseite zurückgesetzt', 'layout'); };
  $('#lyArrange').onclick = () => { close(); go('start'); setTimeout(() => setEdit(true), 60); };
}
function bindSettings(tab) {
  $$('[data-cp]').forEach(c => c.onclick = async () => toast((await copy(c.dataset.cp)) ? `„${c.dataset.cp}“ kopiert` : c.dataset.cp, 'copy'));
  if (tab === 'personal') {
    const refresh = async () => { await applyProfile(); const pv = $('#pIcPrev'); if (pv) pv.src = iconCache; renderRail(); };
    let tmr; const live = () => { clearTimeout(tmr); tmr = setTimeout(() => { setProfile({ name: $('#pName').value.trim(), title: $('#pTitle').value.trim() || 'Cockpit' }); renderRail(); }, 250); };
    $('#pName').addEventListener('input', live); $('#pTitle').addEventListener('input', live);
    $('#pIcKind').addEventListener('click', async e => {
      const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k;
      if (k === 'custom' && !store.get('iconImage', '')) { const [f] = await pickFiles('image/*'); if (!f) return; try { store.set('iconImage', await shrink(f, 512, true)); } catch (er) { toast('Das Bild ließ sich nicht laden', 'x'); return; } }
      $$('#pIcKind button').forEach(x => x.setAttribute('aria-pressed', x === b)); $('#pIcGen').hidden = k !== 'gen'; $('#pIcCustom').hidden = k !== 'custom';
      setProfile({ icon: { kind: k } }); refresh();
    });
    $('#pIcCol').addEventListener('click', e => { const b = e.target.closest('[data-ic]'); if (!b) return; $$('#pIcCol button').forEach(x => x.setAttribute('aria-pressed', x === b)); setProfile({ icon: { color: +b.dataset.ic } }); refresh(); });
    $('#pIcSym').addEventListener('click', e => { const b = e.target.closest('[data-sym]'); if (!b) return; $$('#pIcSym button').forEach(x => x.setAttribute('aria-pressed', x === b)); $('#pIcTxt').value = ''; setProfile({ icon: { sym: b.dataset.sym, text: '' } }); refresh(); });
    let t2; $('#pIcTxt').addEventListener('input', () => { clearTimeout(t2); t2 = setTimeout(() => { setProfile({ icon: { text: $('#pIcTxt').value.trim() } }); refresh(); }, 250); });
    $('#pIcUp').addEventListener('click', async () => { const [f] = await pickFiles('image/*'); if (!f) return; try { store.set('iconImage', await shrink(f, 512, true)); setProfile({ icon: { kind: 'custom' } }); refresh(); toast('Symbol gespeichert'); } catch (er) { toast('Das Bild ließ sich nicht laden', 'x'); } });
  }
  if (tab === 'look') {
    $('#lBg').addEventListener('click', async e => {
      if (e.target.closest('[data-bgup]')) { const [f] = await pickFiles('image/*'); if (!f) return; try { store.set('bgImage', await shrink(f, 1920, false)); setLook({ bg: 'custom' }); toast('Hintergrund gespeichert', 'image'); setup('look'); } catch (er) { toast('Das Bild ließ sich nicht laden', 'x'); } return; }
      const b = e.target.closest('[data-bg]'); if (!b) return; $$('#lBg [data-bg]').forEach(x => x.setAttribute('aria-pressed', x === b)); setLook({ bg: b.dataset.bg });
    });
    [['lBlur', 'blur', 'oBlur', ' px'], ['lGlass', 'glass', 'oGlass', ' %'], ['lDim', 'dim', 'oDim', ' %']].forEach(([id, k, o, u]) => $('#' + id).addEventListener('input', e => { $('#' + o).textContent = e.target.value + u; setLook({ [k]: +e.target.value }); }));
    $('#lAcc').addEventListener('click', e => { const b = e.target.closest('[data-acc]'); if (!b) return; $$('#lAcc button').forEach(x => x.setAttribute('aria-pressed', x === b)); setLook({ accent: b.dataset.acc }); });
    $('#lReset').addEventListener('click', () => { store.set('look', {}); applyLook(); setup('look'); toast('Aussehen zurückgesetzt'); });
  }
  if (tab === 'widgets') bindWidgetsTab();
  if (tab === 'calendar') {
    let col = EV_COLORS[4];
    $('#fdC').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; col = b.dataset.c; $$('#fdC button').forEach(x => x.setAttribute('aria-pressed', x === b)); };
    $('#feedForm').onsubmit = async e => { e.preventDefault(); const f = { id: uid(), name: $('#fdN').value.trim(), url: $('#fdU').value.trim(), color: col, on: true };
      const c = await loadFeed(f, true); store.set('icsFeeds', getFeeds().concat(f)); invalidateCal();
      toast(c.error ? 'Abo gespeichert, aber: ' + c.error : `Abo hinzugefügt – ${c.items.length} Einträge`, c.error ? 'x' : 'cal'); setup('calendar'); };
    $$('[data-feeddel]').forEach(b => b.onclick = () => { store.set('icsFeeds', getFeeds().filter(f => f.id !== b.dataset.feeddel)); invalidateCal(); setup('calendar'); });
    $$('[data-feedon]').forEach(b => b.onclick = () => { const fs = getFeeds(), f = fs.find(x => x.id === b.dataset.feedon); f.on = f.on === false; store.set('icsFeeds', fs); b.setAttribute('aria-checked', f.on); invalidateCal(); });
  }
  if (tab === 'notify') {
    $('#nSys').onclick = () => { const p = notifyPrefs(); p.system = !p.system; store.set('notify', p); $('#nSys').setAttribute('aria-checked', p.system); };
    $('#nWa')?.addEventListener('click', () => { const p = notifyPrefs(); p.whatsapp = p.whatsapp === false; store.set('notify', p); $('#nWa').setAttribute('aria-checked', p.whatsapp); if (NATIVE.wa_set_notify) NATIVE.wa_set_notify(p.whatsapp); });
    $('#nSysPrefs')?.addEventListener('click', () => NATIVE.open_privacy('notifications'));
    if (NATIVE && NATIVE.notify_status) NATIVE.notify_status().then(st => { const el = $('#nSysState span span') || $('#nSysState .t span'); if (!el || !st) return;
      el.textContent = st.safe ? 'Abgeschaltet, weil Cockpit beim letzten Start dabei abgestürzt ist (läuft ersatzweise über den Skripteditor). Wieder einschalten unter Diagnose.' : st.mode === 'system' ? (st.granted === false ? 'Nicht erlaubt: Systemeinstellungen › Mitteilungen › Cockpit einschalten.' : st.granted ? 'Erlaubt. Stil und Ton stellst du in den Systemeinstellungen › Mitteilungen › Cockpit ein.' : 'macOS fragt beim nächsten Start nach.') : 'Mitteilungen laufen über den Skripteditor (Systemeinstellungen › Mitteilungen › Skripteditor).'; }).catch(() => {});
    $('#nAsk')?.addEventListener('click', async () => { await Notification.requestPermission(); setup('notify'); });
    $('#nNoCount')?.addEventListener('click', () => { try { const on = localStorage.getItem('bs_nocount') !== '1'; if (on) localStorage.setItem('bs_nocount', '1'); else localStorage.removeItem('bs_nocount'); $('#nNoCount').setAttribute('aria-checked', on); toast(on ? 'Deine Aufrufe werden nicht mehr gezählt' : 'Deine Aufrufe werden wieder gezählt'); } catch (e) {} });
  }
  if (tab === 'sync') {
    $('#syIn')?.addEventListener('click', () => syncSignIn());
    $('#syOut')?.addEventListener('click', async () => { await syncSignOut(); setup('sync'); });
    $('#syNow')?.addEventListener('click', async () => { $('#syncState').innerHTML = 'Wird abgeglichen …'; await syncPull(true); if (SY.dirty.size) await syncPush(); syncBadge(); if (SY.error && /Regel/.test(SY.error)) setup('sync'); else toast(SY.error ? SY.error : 'Abgeglichen', SY.error ? 'x' : 'check'); });
    $('#syDel')?.addEventListener('click', async function () { if (!this.dataset.sure) { this.dataset.sure = 1; this.textContent = 'Wirklich alle Daten im Konto löschen?'; return; } await syncDeleteCloud(); await syncSignOut(); setup('sync'); });
    $('#syRuleCp')?.addEventListener('click', async () => toast((await copy(SYNC_RULE)) ? 'Regel kopiert' : 'Bitte markieren und kopieren', 'copy'));
    $('#syFb')?.addEventListener('click', () => openUrl(`https://console.firebase.google.com/project/${FBC.projectId}/firestore/rules`, 'Firebase-Konsole'));
  }
  if (tab === 'transfer') {
    $('#cpExp').onclick = async () => { if (await copy($('#exp').value)) toast('Code kopiert', 'copy'); else { $('#exp').select(); toast('Code markiert – jetzt kopieren'); } };
    $('#doImp').onclick = () => {
      try { const d = JSON.parse(decodeURIComponent(escape(atob($('#imp').value.trim()))));
        if (!Array.isArray(d.apps)) throw 0;
        apps = d.apps; saveApps(); if (Array.isArray(d.notes)) notes = d.notes; renderNotes();
        if (Array.isArray(d.countdowns)) { cds = d.countdowns; renderCds(); }
        if (Array.isArray(d.tasks)) { tasks = d.tasks; saveTasks(); }
        if (Array.isArray(d.saved)) { saved = d.saved; saveSaved(); }
        if (Array.isArray(d.events)) { ownEvents = d.events; store.set('events', ownEvents); }
        if (Array.isArray(d.icsFeeds)) store.set('icsFeeds', d.icsFeeds);
        if (d.profile) { const ic0 = d.profile.icon || {}; if (ic0.kind === 'custom' && !store.get('iconImage', '')) ic0.kind = 'logo'; store.set('profile', d.profile); applyProfile(); }
        if (d.look) { if (d.look.bg === 'custom' && !store.get('bgImage', '')) d.look.bg = 'horizont'; store.set('look', d.look); applyLook(); }
        if (d.widgets) store.set('widgets', d.widgets);
        if (Array.isArray(d.board)) { store.set('homeBoard', d.board); store.set('boardOff', Array.isArray(d.boardOff) ? d.boardOff : []); } else if (d.layout) { store.set('layout', d.layout); store.set('board', null); }
        if (typeof d.hotkeys === 'boolean') store.set('hotkeys', d.hotkeys);
        close(); invalidateCal(); renderRail(); showView(currentView); toast('Einstellungen übernommen');
      } catch (e) { toast('Der Code ist ungültig. Bitte vollständig kopieren.', 'x'); }
    };
    $('#reset').onclick = function () { if (this.dataset.sure) { apps = DEFAULT_APPS.map(a => ({ ...a })); usage = {}; store.set('usage', usage); saveApps(); renderApps(); close(); toast('Apps zurückgesetzt'); } else { this.dataset.sure = 1; this.textContent = 'Wirklich zurücksetzen?'; } };
  }
  if (tab === 'diag') {
    $('#dgUrl').onclick = () => openUrl(SITE, 'buildspace');
    if (NATIVE && NATIVE.safe_status) NATIVE.safe_status().then(st => { const dl = $('.diag'); if (!dl || !st) return; const off = [st.whatsapp && 'WhatsApp einbetten', st.mitteilungen && 'macOS-Mitteilungen'].filter(Boolean);
      dl.insertAdjacentHTML('beforeend', `<dt>Selbstschutz</dt><dd>${off.length ? `<span class="bad">Abgeschaltet: ${off.join(', ')}</span> – beim letzten Start abgestürzt. <button class="btn sm" id="dgSafe">Wieder einschalten</button>` : '<span class="ok">alles aktiv</span>'}</dd>`);
      $('#dgSafe')?.addEventListener('click', async () => { await NATIVE.safe_reset(); toast('Wieder eingeschaltet – gilt ab dem nächsten Start', 'check'); setup('diag'); }); }).catch(() => {});
    if (NATIVE && NATIVE.wa_debug) NATIVE.wa_debug().then(d => { const dl = $('.diag'); if (!dl || !d) return; dl.insertAdjacentHTML('beforeend', `<dt>WhatsApp</dt><dd>${esc([d.embedded ? 'eingebettet' : 'nicht geladen', d.window ? 'eigenes Fenster offen' : '', d.url || '', d.progress != null ? Math.round(d.progress * 100) + ' %' : '', d.frame ? 'Rahmen ' + d.frame.join('·') : '', d.error ? 'Fehler: ' + d.error : ''].filter(Boolean).join(' · '))}</dd>`); }).catch(() => {});
    $('#dgApp')?.addEventListener('click', () => openApp(apps.find(a => a.id === 'kalender') || DEFAULT_APPS[4]));
    $('#dgNote')?.addEventListener('click', () => { NATIVE.notify('Cockpit', 'So sehen Mitteilungen aus.'); toast('Mitteilung gesendet', 'bell'); });
  }
}
document.addEventListener('click', e => { const b = e.target.closest('[data-open-setup]'); if (b) setup(b.dataset.openSetup); });
$('#brandIc').addEventListener('click', () => setup('personal'));

/* ---------- Begrüßung beim ersten Start ---------- */
function welcome() {
  modal(`<form class="glass modal welcome" id="wf">
    <img class="ic-prev" src="${esc(iconCache || 'icon-192.png')}" alt="">
    <h3>Willkommen im Cockpit</h3>
    <p class="lead">Deine Startzentrale für Schule, Apps und KI. Wie dürfen wir dich begrüßen?</p>
    <label class="field">Dein Name<input id="wName" placeholder="z. B. Marc" autocomplete="given-name" maxlength="30"></label>
    <div class="field">Such dir einen Hintergrund aus<div class="bgs" id="wBg">${bgTiles(getLook().bg, false)}</div></div>
    <div class="row"><button type="button" class="btn" id="wSkip">Später</button><button class="btn pri">Los geht’s</button></div>
    <p class="lead" style="margin:14px 0 0;font-size:12px">Name, Symbol, Hintergrund und Widgets kannst du jederzeit in den Einstellungen ändern.</p></form>`);
  $('#wBg').addEventListener('click', e => { const b = e.target.closest('[data-bg]'); if (!b) return; $$('#wBg [data-bg]').forEach(x => x.setAttribute('aria-pressed', x === b)); setLook({ bg: b.dataset.bg }); });
  $('#wSkip').addEventListener('click', () => { setProfile({}); close(); });
  $('#wf').addEventListener('submit', e => { e.preventDefault(); const n = $('#wName').value.trim(); setProfile({ name: n }); close(); toast(n ? `Schön, dass du da bist, ${n}!` : 'Los geht’s'); });
  setTimeout(() => $('#wName').focus(), 80);
}

/* =====================================================================
   START DER APP
   ===================================================================== */
applyLook();
renderRail();
applyProfile().then(() => renderRail());
if (NATIVE) $('#tipShort').innerHTML = `${ic('bolt', 'i sm')}<div><b>Mac-Apps</b> wie Kalender, Mail oder iDoceo öffnen direkt. <b>WhatsApp</b> läuft hier im Cockpit (Seitenreiter). Weitere Apps legst du unter <b>Anpassen</b> als „Mac-App“ an.</div>`;
showView(location.hash.slice(1) || 'start');
if (store.get('profile', null) === null) setTimeout(welcome, 400);
setInterval(tick, 15000);
setInterval(() => { if (currentView === 'start') renderToday(); notifyTick(); }, 60000);
setInterval(() => { if (currentView === 'start') loadStats(); }, 10 * 60 * 1000);
setTimeout(notifyTick, 1500);
window.addEventListener('resize', () => { if (currentView === 'whiteboard' && $('#wbBox').classList.contains('full')) { wbFit(); wb.resize(); wbPaintBg(); } });
if (!NATIVE && location.protocol.startsWith('http') && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

/* Start: im Browser sofort, in der Mac-App erst, wenn die Verbindung zur App steht
   (nie ohne sie – sonst wäre nach dem Beenden alles weg). */
(function boot() {
  /* In der Mac-App läuft die Oberfläche je nach pywebview-Version als Datei (file:) oder über
     pywebviews eigenen kleinen Server (http://127.0.0.1:…). Beides ist die Mac-App – dann immer
     auf die Verbindung warten. Browser (Safari, Chrome …) tragen „Safari/“ in der Kennung. */
  const inApp = location.protocol === 'file:' || !!window.pywebview
    || (/^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname) && !/Safari\//.test(navigator.userAgent));
  if (!inApp) return cockpitMain();
  let started = false, tries = 0;
  const ready = () => window.pywebview && window.pywebview.api && typeof window.pywebview.api.load_state === 'function';
  const go = async () => {
    if (started || !ready()) return;
    started = true;
    let state = null;
    for (let i = 0; i < 3 && state === null; i++) { try { state = await window.pywebview.api.load_state(); } catch (e) { await new Promise(r => setTimeout(r, 400)); } }
    window.NATIVE = window.pywebview.api; window.NATIVE_STATE = state || {};
    document.getElementById('bootMsg')?.remove();
    cockpitMain();
  };
  window.addEventListener('pywebviewready', go);
  const poll = setInterval(() => {
    if (started) return clearInterval(poll);
    if (ready()) return go();
    if (++tries === 15 && !document.getElementById('bootMsg')) { const m = document.createElement('div'); m.id = 'bootMsg'; m.className = 'toast glass'; m.textContent = 'Cockpit startet …'; document.body.appendChild(m); }
  }, 100);
  go();
})();
