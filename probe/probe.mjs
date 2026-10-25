import fs from "node:fs";
fs.rmSync("out",{recursive:true,force:true}); fs.mkdirSync("out",{recursive:true});
const UA={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15","Accept-Language":"de-DE"};
const B="https://www.handball.net";
const log=[];
const dec=t=>t.replace(/&q;/g,'"').replace(/&a;/g,'&').replace(/&s;/g,"'").replace(/&l;/g,'<').replace(/&g;/g,'>');
async function page(name,p){
  try{
    const r=await fetch(B+p,{headers:UA}); const h=await r.text();
    log.push(`${r.status} ${h.length} ${p}`);
    const m=/<script id="serverApp-state" type="application\/json">([\s\S]*?)<\/script>/.exec(h);
    let state={}; if(m){ try{ state=JSON.parse(dec(m[1])) }catch(e){ log.push("state parse "+e.message) } }
    const keys=Object.keys(state).filter(k=>k.startsWith("http")).map(k=>k.replace("http://127.0.0.1:4055",""));
    log.push("   keys: "+keys.join("\n         "));
    fs.writeFileSync("out/"+name+".state.json",JSON.stringify(state,null,1).slice(0,400000));
    const links=[...new Set([...h.matchAll(/href="(\/[^"#]+)"/g)].map(x=>x[1]))].filter(l=>!/assets|\.js|\.css/.test(l));
    fs.writeFileSync("out/"+name+".links.txt",links.join("\n"));
    const text=h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g,"").replace(/<[^>]+>/g," ").replace(/\s+/g," ");
    fs.writeFileSync("out/"+name+".txt",text.slice(0,120000));
    return {h,state,links};
  }catch(e){ log.push(`ERR ${p} ${e.message}`); return {h:"",state:{},links:[]} }
}
await page("tos","/nutzungsbedingungen");
const v=await page("vereine","/spielbetrieb/vereine?search=Wettenberg");
await page("vereine2","/spielbetrieb/vereine?q=Wettenberg");
await page("live","/live");
await page("kalender","/spielbetrieb/spielkalender");
await page("wettbewerbe","/spielbetrieb/wettbewerbe");
// follow first Wettenberg-ish club link
const cl=[...v.links].find(l=>/wettenberg/i.test(l));
if(cl){ const c=await page("club",cl);
  const tl=c.links.filter(l=>/mannschaft|team/i.test(l)).slice(0,6);
  let i=0; for(const t of tl) await page("team"+(i++),t);
}
fs.writeFileSync("out/log.txt",log.join("\n"));
