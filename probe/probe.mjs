import fs from "node:fs";
fs.rmSync("out",{recursive:true,force:true}); fs.mkdirSync("out",{recursive:true});
const UA={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15","Accept-Language":"de-DE"};
const B="https://www.handball.net";
const log=[];
const dec=t=>t.replace(/&q;/g,'"').replace(/&a;/g,'&').replace(/&s;/g,"'").replace(/&l;/g,'<').replace(/&g;/g,'>');
async function state(p){
  const r=await fetch(B+p,{headers:UA}); const h=await r.text();
  const m=/<script id="serverApp-state" type="application\/json">([\s\S]*?)<\/script>/.exec(h);
  let st={}; if(m){ try{ st=JSON.parse(dec(m[1])) }catch(e){ log.push("parse fail "+p) } }
  return st;
}
const pick=(st,re)=>{ const k=Object.keys(st).find(k=>re.test(k)); return k?st[k]:null };
const st0=await state("/spielbetrieb/vereine");
const feds=pick(st0,/\/api\/new\/federations$/);
const flist=(feds?.data||feds||[]);
fs.writeFileSync("out/federations.json",JSON.stringify(flist).slice(0,200000));
const hess=JSON.stringify(flist).match(/\{[^{}]*"name":"[^"]*HESS[^"]*"[^{}]*/gi)||[];
log.push("hess candidates:\n"+hess.slice(0,10).join("\n"));
// try candidate ids from list where name contains HESSISCHER
const ids=[...new Set(hess.map(s=>(/"id":(\d+)/.exec(s)||[])[1]).filter(Boolean))];
const found={};
for(const id of ids.slice(0,4)){
  for(let page=1; page<=40; page++){
    const st=await state(`/spielbetrieb/spielkalender?verband=${id}&geschlecht=male&date_from=2026-10-23&date_to=2026-10-24&page=${page}`);
    const v=pick(st,/\/api\/new\/matches\?/); const data=v?.data||[];
    if(page===1) log.push(`fed ${id}: key ${Object.keys(st).find(k=>/matches\?/.test(k))} total ${v?.pagination?.total}`);
    for(const m of data){
      for(const side of ["local","visitor"]) if(/wettenberg/i.test(m[side]?.name||"")){
        found[m.id]={match:m.id,date:m.date,status:m.status,phase:m.phase?.id,phaseName:m.phase?.name,local:m.local?.name,localId:m.local?.id,visitor:m.visitor?.name,visitorId:m.visitor?.id,result:m.result, keys:Object.keys(m)};
      }
    }
    if(!data.length || page>=(v?.pagination?.last_page||1)) break;
  }
  if(Object.keys(found).length) break;
}
fs.writeFileSync("out/found.json",JSON.stringify(found,null,1));
for(const f of Object.values(found)){
  const tid = /wettenberg/i.test(f.local)?f.localId:f.visitorId;
  const st=await state(`/team/${tid}?phaseId=${f.phase}`);
  const keep={}; Object.keys(st).filter(k=>k.startsWith("http")&&/teams|matches|standings|phases/.test(k)).forEach(k=>keep[k]=st[k]);
  fs.writeFileSync(`out/team-${tid}.json`,JSON.stringify(keep,null,1).slice(0,300000));
  log.push(`team ${tid}: ${Object.keys(keep).join(" | ")}`);
}
fs.writeFileSync("out/log.txt",log.join("\n"));
