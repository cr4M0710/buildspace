import fs from "node:fs";
import WebSocket from "ws";
fs.rmSync("out",{recursive:true,force:true}); fs.mkdirSync("out",{recursive:true});
const log=[]; const t0=Date.now(); const L=s=>log.push(`${((Date.now()-t0)/1000).toFixed(1)}s ${s}`);
function tryWs(origin){
  return new Promise(res=>{
    const ws=new WebSocket("wss://hbde-live-websocket.liga.nu/nuScoreLive/socket/1",{origin});
    let n=0;
    ws.on("open",()=>{ L(`[${origin}] open`); ws.send(JSON.stringify({meetingUuids:["9bdfc456-aae2-4fd6-884f-becfb265d9c4"]})); });
    ws.on("message",m=>{ n++; if(n<=5) L(`[${origin}] msg ${String(m).slice(0,400)}`) });
    ws.on("unexpected-response",(req,r)=>{ L(`[${origin}] rejected HTTP ${r.statusCode}`); res() });
    ws.on("error",e=>{ L(`[${origin}] error ${e.message}`); });
    ws.on("close",(c,r)=>{ L(`[${origin}] close ${c} ${r}`); res() });
    setTimeout(()=>{ L(`[${origin}] messages: ${n}`); try{ws.close()}catch(e){}; res() },15000);
  });
}
await tryWs("https://buildspaceos.de");
await tryWs("https://hbde-live.liga.nu");
// which meetings are live right now anywhere? check a few groups' time info not available; log done
fs.writeFileSync("out/log.txt",log.join("\n"));
