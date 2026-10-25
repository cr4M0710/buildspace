import fs from "node:fs";
fs.rmSync("out",{recursive:true,force:true}); fs.mkdirSync("out",{recursive:true});
const H={"User-Agent":"Mozilla/5.0 (Macintosh) Safari/605.1.15","Accept":"application/json","Origin":"https://buildspaceos.de","Referer":"https://hbde-live.liga.nu/nuScoreLive/"};
const R="https://hbde-live.liga.nu/nuScoreLiveRestBackend/api/1/";
const log=[];
async function get(name,p){ try{ const r=await fetch(R+p,{headers:H}); const t=await r.text();
  log.push(`${r.status} ACAO=${r.headers.get("access-control-allow-origin")} ${(r.headers.get("content-type")||"").slice(0,25)} ${t.length} ${p}`); fs.writeFileSync("out/"+name,t.slice(0,300000)); return t }catch(e){ log.push("ERR "+p+" "+e.message); return "" } }
await get("test.json","test");
await get("group.json","groups/492123");
await get("meetings.json","meetings/492123");
await get("meeting.json","meeting/8256673/versions/0");
await get("meeting-t.json","meeting/8256673/time/0");
await get("events.json","events/8256673");
await get("events-v.json","events/8256673/versions/0");
await get("players.json","players/8256673/versions/0");
await get("group-m2.json","groups/491948");
// preflight check for the browser
try{ const r=await fetch(R+"events/8256673",{method:"OPTIONS",headers:{Origin:"https://buildspaceos.de","Access-Control-Request-Method":"GET","Access-Control-Request-Headers":"accept"}}); log.push(`OPTIONS ${r.status} ACAO=${r.headers.get("access-control-allow-origin")} ACAH=${r.headers.get("access-control-allow-headers")}`) }catch(e){ log.push("OPTIONS ERR "+e.message) }
fs.writeFileSync("out/log.txt",log.join("\n"));
