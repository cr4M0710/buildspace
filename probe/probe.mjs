import fs from "node:fs";
fs.rmSync("out",{recursive:true,force:true}); fs.mkdirSync("out",{recursive:true});
const UA={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15","Accept-Language":"de-DE"};
const B="https://www.handball.net";
const log=[];
const dec=t=>t.replace(/&q;/g,'"').replace(/&a;/g,'&').replace(/&s;/g,"'").replace(/&l;/g,'<').replace(/&g;/g,'>');
async function keys(p,save){
  const r=await fetch(B+p,{headers:UA}); const h=await r.text();
  const m=/<script id="serverApp-state" type="application\/json">([\s\S]*?)<\/script>/.exec(h);
  let st={}; if(m){ try{ st=JSON.parse(dec(m[1])) }catch(e){} }
  const k=Object.keys(st).filter(k=>k.startsWith("http")&&!/mega-menu|press\/config|\/seasons|\/news\?|age-categories|federations$/.test(k));
  log.push(`${r.status} ${p}\n   ${k.map(x=>x.replace("http://127.0.0.1:4055","")).join("\n   ")}`);
  if(save){ const keep={}; k.forEach(x=>keep[x]=st[x]); fs.writeFileSync("out/"+save,JSON.stringify(keep)); }
  return st;
}
const main=fs.readFileSync? null:null;
const home=await (await fetch(B+"/",{headers:UA})).text();
const mainName=/(main-[A-Z0-9]+\.js)/.exec(home)[1];
const mainJs=await (await fetch(B+"/"+mainName,{headers:UA})).text();
for(const comp of ["SpielplanComponent","ClubDetailComponent","TeamDetailComponent","LigenDetailComponent","MatchDetailComponent","VereineComponent","BuscadorComponent","SearchComponent"]){
  const re=new RegExp('import\\("\\./(chunk-[A-Z0-9]+\\.js)"\\)\\.then\\(t=>t\\.'+comp);
  const m=re.exec(mainJs); log.push(comp+" -> "+(m?m[1]:"?"));
  if(m){ const t=await (await fetch(B+"/"+m[1],{headers:UA})).text(); fs.writeFileSync("out/"+comp+".js",t); }
}
const fed=await keys("/spielbetrieb/vereine","fed.json");
for(const q of ["search","q","nombre","name","buscar","term","query","searchTerm"]) await keys(`/spielbetrieb/vereine?${q}=Wettenberg`);
for(const q of ["date=2026-10-24","fecha=2026-10-24","datum=2026-10-24","date_from=2026-10-24","day=2026-10-24","is_live=1"]) await keys(`/spielbetrieb/spielkalender?${q}`);
fs.writeFileSync("out/log.txt",log.join("\n"));
