import fs from "node:fs";
fs.rmSync("out",{recursive:true,force:true}); fs.mkdirSync("out",{recursive:true});
const UA={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15","Accept-Language":"de-DE"};
const B="https://www.handball.net";
const log=[];
const dec=t=>t.replace(/&q;/g,'"').replace(/&a;/g,'&').replace(/&s;/g,"'").replace(/&l;/g,'<').replace(/&g;/g,'>');
async function page(name,p){
  try{
    const r=await fetch(B+p,{headers:UA}); const h=await r.text();
    const m=/<script id="serverApp-state" type="application\/json">([\s\S]*?)<\/script>/.exec(h);
    let state={}; if(m){ try{ state=JSON.parse(dec(m[1])) }catch(e){} }
    const keys=Object.keys(state).filter(k=>k.startsWith("http")&&!/mega-menu|press\/config|\/seasons|\/news\?|age-categories|federations$/.test(k)).map(k=>k.replace("http://127.0.0.1:4055",""));
    log.push(`${r.status} ${h.length} ${p}\n   ${keys.join("\n   ")}`);
    const keep={}; for(const k of Object.keys(state)) if(k.startsWith("http")&&!/mega-menu|press\/config|\/news\?/.test(k)) keep[k]=state[k];
    fs.writeFileSync("out/"+name+".json",JSON.stringify(keep));
    const links=[...new Set([...h.matchAll(/href="(\/[^"#]+)"/g)].map(x=>x[1]))].filter(l=>!/assets|\.js|\.css|^\/(news|hn-tv|service|spielbetrieb|login|mein|impressum|nutzung|specials)/.test(l));
    fs.writeFileSync("out/"+name+".links.txt",links.join("\n"));
    return {h,state,links};
  }catch(e){ log.push(`ERR ${p} ${e.message}`); return {h:"",state:{},links:[]} }
}
const home=await (await fetch(B+"/spielbetrieb/vereine",{headers:UA})).text();
const main=[...home.matchAll(/(main-[A-Z0-9]+\.js)/g)].map(m=>m[1])[0];
if(main){ const t=await (await fetch(B+"/"+main,{headers:UA})).text(); fs.writeFileSync("out/main.js",t); log.push("main "+main+" "+t.length) }
const t=await page("team","/team/61901?phaseId=15835");
for(const p of ["/spiel/482840","/match/482840","/spielbetrieb/spiel/482840","/spiele/482840","/partido/482840"]) await page(p.replace(/\W/g,"_"),p);
fs.writeFileSync("out/log.txt",log.join("\n"));
