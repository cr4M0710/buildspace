import fs from "node:fs";
fs.rmSync("out",{recursive:true,force:true}); fs.mkdirSync("out",{recursive:true});
const R="https://hbde-live.liga.nu/nuScoreLiveRestBackend/api/1/";
const log=[]; const t=Math.floor(Date.now()/1000/15)*15;
for(const g of [492123,491948,492047]){
  const r=await fetch(`${R}meetings/${g}/time/${t}`,{headers:{Accept:"application/json"}}); const x=await r.text();
  log.push(`${r.status} ${x.length} meetings/${g}`); fs.writeFileSync(`out/m-${g}.json`,x);
}
fs.writeFileSync("out/log.txt",log.join("\n"));
