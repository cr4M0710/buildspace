import fs from "node:fs";
fs.rmSync("out",{recursive:true,force:true}); fs.mkdirSync("out",{recursive:true});
const UA={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15","Accept-Language":"de-DE"};
const log=[];
async function get(name,url,opt={}){ try{ const r=await fetch(url,{headers:{...UA,...(opt.headers||{})}}); const t=await r.text(); log.push(`${r.status} ${(r.headers.get("content-type")||"").slice(0,30)} ${t.length} ${url}`); if(name) fs.writeFileSync("out/"+name,t.slice(0,400000)); return t }catch(e){ log.push("ERR "+url+" "+e.message); return "" } }
const B="https://hbde-live.liga.nu/nuScoreLive/";
const html=await get("index.html",B);
const assets=[...new Set([...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map(m=>m[1]))];
log.push("assets: "+assets.join(" "));
const hits=new Set();
for(const a of assets){
  const u=a.startsWith("http")?a:new URL(a,B).href;
  const t=await get("", u);
  fs.writeFileSync("out/"+a.replace(/\W/g,"_"),t);
  for(const m of t.matchAll(/["'`]((?:https?:\/\/|\/)[^"'`\s]{0,40}(?:rest|api|Rest|Api|json|live|Live)[^"'`\s]{0,120})["'`]/g)) hits.add(m[1]);
}
fs.writeFileSync("out/hits.txt",[...hits].join("\n"));
fs.writeFileSync("out/log.txt",log.join("\n"));
