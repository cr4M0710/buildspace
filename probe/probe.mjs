import fs from "node:fs";
fs.mkdirSync("out",{recursive:true});
const UA={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15","Accept-Language":"de-DE"};
const log=[];
async function grab(name,url,keep=300000){
  try{ const r=await fetch(url,{headers:UA,redirect:"follow"}); const t=await r.text();
    log.push(`${r.status} ${r.headers.get("content-type")} ${t.length} ${url} -> ${r.url}`);
    fs.writeFileSync("out/"+name,t.slice(0,keep)); return t;
  }catch(e){ log.push(`ERR ${url} ${e.message}`); return "" }
}
const B="https://www.handball.net";
const home=await grab("home.html",B+"/");
await grab("suche.html",B+"/suche?q=Wettenberg");
await grab("s1.json",B+"/a/sportdata/1/search?query=Wettenberg");
await grab("s2.json",B+"/a/sportdata/1/search?q=Wettenberg");
await grab("s3.json",B+"/a/search?q=Wettenberg");
const T="handball4all.wuerttemberg.874226";
await grab("t1.csv",`${B}/a/sportdata/1/teams/${T}/team-schedule.csv`);
await grab("t2.json",`${B}/a/sportdata/1/teams/${T}`);
await grab("t3.json",`${B}/a/sportdata/1/teams/${T}/schedule`);
await grab("t4.json",`${B}/a/sportdata/1/teams/${T}/team-schedule`);
await grab("t5.html",`${B}/mannschaften/${T}/spielplan`);
// discover API paths in JS bundles
const srcs=[...new Set([...home.matchAll(/src="([^"]+\.js)"/g)].map(m=>m[1]))];
const hits=new Set();
for(const s of srcs.slice(0,60)){
  const u=s.startsWith("http")?s:B+s;
  try{ const t=await (await fetch(u,{headers:UA})).text();
    for(const m of t.matchAll(/["'`]([^"'`]{0,40}\/a\/sportdata[^"'`]{0,120})["'`]/g)) hits.add(m[1]);
    for(const m of t.matchAll(/["'`](\/(?:a|api)\/[a-z0-9\-\/{}$.:]{3,120})["'`]/gi)) hits.add(m[1]);
  }catch(e){}
}
fs.writeFileSync("out/js-paths.txt",[...hits].sort().join("\n"));
fs.writeFileSync("out/log.txt",log.join("\n")+`\nbundles: ${srcs.length}\n`);
