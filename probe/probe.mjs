import fs from "node:fs";
fs.rmSync("out",{recursive:true,force:true}); fs.mkdirSync("out",{recursive:true});
const UA={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15","Accept-Language":"de-DE"};
const log=[];
const N="https://hhv-handball.liga.nu";
async function get(name,url){ try{ const r=await fetch(url,{headers:UA}); const t=await r.text(); log.push(`${r.status} ${t.length} ${url}`); if(name) fs.writeFileSync("out/"+name,t); return t }catch(e){ log.push("ERR "+url+" "+e.message); return "" } }
await get("robots.txt",N+"/robots.txt");
const club=await get("club.html",N+"/cgi-bin/WebObjects/nuLigaHBDE.woa/wa/clubTeams?club=70137");
const links=[...new Set([...club.matchAll(/href="([^"]+)"/g)].map(m=>m[1].replace(/&amp;/g,"&")))].filter(l=>/teamPortrait|groupPage|team=|group=/.test(l));
fs.writeFileSync("out/club-links.txt",links.join("\n"));
let i=0;
for(const l of links.slice(0,8)){ const u=l.startsWith("http")?l:N+l; await get("p"+(i++)+".html",u); }
const w=await get("hsgw.html","https://hsg-wettenberg.de/die-naechsten-spiele/");
log.push("hsg iframes/scripts: "+[...w.matchAll(/(?:src|href)="([^"]*(?:handball|liga|nuliga|ticker|live|widget)[^"]*)"/gi)].map(m=>m[1]).join(" | "));
const all=fs.readdirSync("out").map(f=>[f,fs.readFileSync("out/"+f,"utf8")]);
for(const [f,t] of all){ const m=t.match(/.{0,120}(live|ticker|nuScore|Liveticker).{0,120}/gi); if(m) log.push(f+": "+m.slice(0,5).join(" ### ").replace(/\s+/g," ")); }
fs.writeFileSync("out/log.txt",log.join("\n"));
