#!/usr/bin/env node
// Checks SEC IDs before they're added to build-funds.mjs: the name SEC has on file, the latest
// 13F-HR and how many positions it lists. Read-only.
//   node scripts/diagnose/fund-ciks.mjs 1649339 1079114 ...
const UA = process.env.SEC_USER_AGENT || "Arkanum diagnostics";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const cik of process.argv.slice(2)) {
  await sleep(200);
  const r = await fetch(`https://data.sec.gov/submissions/CIK${cik.padStart(10, "0")}.json`, { headers: { "User-Agent": UA } });
  if (!r.ok) { console.log(`${cik}: HTTP ${r.status}`); continue; }
  const s = await r.json(), f = s.filings.recent;
  const i = f.form.findIndex((x) => x === "13F-HR");
  if (i < 0) { console.log(`${cik}: ${s.name} — no 13F-HR`); continue; }
  const acc = f.accessionNumber[i].replace(/-/g, "");
  await sleep(200);
  const idx = await (await fetch(`https://www.sec.gov/Archives/edgar/data/${cik}/${acc}/index.json`, { headers: { "User-Agent": UA } })).json();
  const xml = idx.directory.item.find((x) => /\.xml$/i.test(x.name) && !/primary_doc/i.test(x.name));
  let n = "?";
  if (xml) { await sleep(200); const t = await (await fetch(`https://www.sec.gov/Archives/edgar/data/${cik}/${acc}/${xml.name}`, { headers: { "User-Agent": UA } })).text(); n = (t.match(/<(\w+:)?infoTable>/g) ?? []).length; }
  console.log(`${cik}: ${s.name} — latest 13F-HR ${f.filingDate[i]} (period ${f.reportDate[i]}), ${n} positions`);
}
