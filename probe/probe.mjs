import fs from "node:fs";
fs.rmSync("out",{recursive:true,force:true}); fs.mkdirSync("out",{recursive:true});
const UA={"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15","Accept-Language":"de-DE"};
const N="https://hhv-handball.liga.nu/cgi-bin/WebObjects/nuLigaHBDE.woa/wa/";
const log=[];
async function get(name,url){ try{ const r=await fetch(url,{headers:UA}); const t=await r.text(); log.push(`${r.status} ${(r.headers.get("content-type")||"").slice(0,25)} ${t.length} ${url}`); fs.writeFileSync("out/"+name,t); }catch(e){ log.push("ERR "+url+" "+e.message) } }
const M1="championship=HHV+26%2F27&group=492123", M2="championship=Gie%C3%9Fen+26%2F27&group=491948";
await get("m1-gesamt.html",N+"groupPage?displayTyp=gesamt&displayDetail=meetings&"+M1);
await get("m2-gesamt.html",N+"groupPage?displayTyp=gesamt&displayDetail=meetings&"+M2);
await get("m1-table.html",N+"groupPage?"+M1);
await get("m2-table.html",N+"groupPage?"+M2);
await get("report-kastel.html",N+"groupMeetingReport?meeting=8256673&"+M1);
await get("report-eppla.html",N+"groupMeetingReport?meeting=8256778&"+M1);
await get("goals-m1.html",N+"groupMeetingStatistics?displayType=playerGoals&"+M1);
await get("team-m1.html",N+"teamPortrait?teamtable=2208207&pageState=vorrunde&"+M1);
await get("pdf-kastel.pdf","https://hhv-handball.liga.nu/cgi-bin/WebObjects/nuLigaDokumentHBDE.woa/wa/nuDokument?dokument=meetingReportHB&meeting=8256673");
fs.writeFileSync("out/log.txt",log.join("\n"));
