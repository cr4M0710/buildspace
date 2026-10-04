#!/usr/bin/env node
/* Erzeugt für jeden lokalen Beitrag ein eigenes Vorschaubild (1200×630) in assets/og/<slug>.jpg
   und trägt es in og:image / twitter:image der jeweiligen Seite ein (idempotent).
   Aufruf: NODE_PATH=$(npm root -g) node tools/make-og.js   (braucht Playwright + Chromium) */
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const root = path.join(__dirname, "..");
const code = fs.readFileSync(path.join(root, "posts-data.js"), "utf8");
const posts = new Function(code + ";return posts;")();
const SUB = { mathematik: "Mathematik", arbeitslehre: "Arbeitslehre", faecheruebergreifend: "Classroom Management", weiterefaecher: "Weitere Fächer", sonstiges: "Sonstiges", jugend: "Jugend", maenner1: "Männer 1", maenner2: "Männer 2", hallendienst: "Hallendienst", training: "Training" };
const CAT = { schule: "Schule", handball: "Handball", freizeit: "Freizeit" };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const html = (p) => `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;font-family:Arial,"Liberation Sans","DejaVu Sans",sans-serif;color:#f4f6fb;background:radial-gradient(1100px 420px at 50% 128%,#3a3d4a 0,#14151c 45%,transparent 70%),radial-gradient(500px 300px at 92% -5%,rgba(255,255,255,.12),transparent 70%),#03040a;position:relative;overflow:hidden}
.shade{position:absolute;inset:0;background-image:radial-gradient(1.5px 1.5px at 8% 20%,#fff,transparent),radial-gradient(1px 1px at 30% 80%,#fff,transparent),radial-gradient(1.5px 1.5px at 62% 12%,#fff,transparent),radial-gradient(1px 1px at 78% 70%,#fff,transparent),radial-gradient(1px 1px at 95% 40%,#fff,transparent),radial-gradient(1px 1px at 45% 50%,#fff,transparent);opacity:.8}
.card{position:absolute;left:64px;top:64px;right:64px;bottom:64px;border-radius:44px;border:2px solid rgba(255,255,255,.28);background:linear-gradient(160deg,rgba(255,255,255,.16),rgba(255,255,255,.04));box-shadow:inset 0 2px 0 rgba(255,255,255,.3);padding:48px 56px;display:flex;flex-direction:column}
.k{font-size:26px;letter-spacing:.14em;text-transform:uppercase;color:#c9ccd6;font-weight:700}
.e{font-size:92px;line-height:1;margin:22px 0 8px}
h1{font-size:${p.title.length > 26 ? 56 : 68}px;line-height:1.08;margin:0 0 18px;letter-spacing:-.01em}
.d{font-size:29px;line-height:1.35;color:#d8dbe4;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.f{margin-top:auto;display:flex;justify-content:space-between;font-size:27px;color:#e9ebf2;font-weight:700}
</style><div class="shade"></div><div class="card"><div class="k">${esc(CAT[p.category] || "")}${p.subcategory ? " · " + esc(SUB[p.subcategory] || "") : ""}</div>
<div class="e">${p.emoji || ""}</div><h1>${esc(p.title)}</h1><div class="d">${esc(p.excerpt)}</div>
<div class="f"><span>buildspace</span><span>buildspaceos.de</span></div></div>`;
(async () => {
  fs.mkdirSync(path.join(root, "assets/og"), { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  const seen = new Set(); let n = 0, upd = 0;
  for (const p of posts) {
    const u = p.url;
    if (/^https?:/.test(u) || u.includes("/") || seen.has(u)) continue;
    seen.add(u);
    const slug = u.replace(/\.html$/, "");
    await page.setContent(html(p));
    await page.screenshot({ path: path.join(root, "assets/og", slug + ".jpg"), type: "jpeg", quality: 82 });
    n++;
    const f = path.join(root, u);
    if (!fs.existsSync(f)) continue;
    let s = fs.readFileSync(f, "utf8");
    const img = `https://buildspaceos.de/assets/og/${slug}.jpg`;
    const t = s.replace(/(<meta (?:property="og:image"|name="twitter:image") content=")[^"]*(")/g, `$1${img}$2`);
    if (t !== s) { fs.writeFileSync(f, t); upd++; }
  }
  await browser.close();
  console.log(`${n} Vorschaubilder, ${upd} Seiten aktualisiert`);
})();
