import fs from "node:fs";
fs.rmSync("out",{recursive:true,force:true}); fs.mkdirSync("out",{recursive:true});
const UA={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15","Accept-Language":"de-DE","Accept":"application/json, text/plain, */*"};
const log=[];
const B="https://www.handball.net";
async function grab(name,url,keep=200000){
  try{ const r=await fetch(url,{headers:UA}); const t=await r.text();
    log.push(`${r.status} ${(r.headers.get("content-type")||"").slice(0,30)} ${t.length} ${url}`);
    if(name) fs.writeFileSync("out/"+name,t.slice(0,keep)); return t;
  }catch(e){ log.push(`ERR ${url} ${e.message}`); return "" }
}
const page=await grab("", B+"/suche?q=Wettenberg");
const js=[...new Set([...page.matchAll(/(?:href|src)="((?:\/)?(?:chunk|main|polyfills)[^"]*\.js)"/g)].map(m=>m[1]))];
const hits=new Map();
for(const s of js){
  const t=await grab("", B+"/"+s.replace(/^\//,""));
  for(const m of t.matchAll(/[`"']([^`"']{0,30}(?:api\/new|\/new\/)[^`"']{0,160})[`"']/g)) hits.set(m[1], s);
  for(const m of t.matchAll(/[`"'](\/?(?:clubs|teams|matches|games|competitions|tournaments|live|ticker|events|organizations|federations)[a-z\/\-_{}$.?=&\[\]%]*)[`"']/gi)) hits.set(m[1], s);
}
fs.writeFileSync("out/js-paths.txt",[...hits].map(([k,v])=>k+"   <"+v+">").sort().join("\n"));
for(const [n,p] of [
 ["seasons.json","/api/new/seasons"],
 ["clubs1.json","/api/new/clubs?filter%5Bsearch%5D=Wettenberg"],
 ["teams1.json","/api/new/teams?filter%5Bsearch%5D=Wettenberg"],
 ["search1.json","/api/new/search?q=Wettenberg"],
 ["search2.json","/api/new/search?query=Wettenberg"],
 ["search3.json","/api/new/search?filter%5Bsearch%5D=Wettenberg"],
]) await grab(n,B+p);
fs.writeFileSync("out/log.txt",log.join("\n")+`\njs files: ${js.length}\n`);
