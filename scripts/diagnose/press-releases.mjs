#!/usr/bin/env node
// How well lib/pressRelease.mjs finds press-release headlines on real 8-Ks: for each ticker,
// the latest five 8-Ks, the exhibit picked and the headline read (or why not). Read-only.
//   node scripts/diagnose/press-releases.mjs AAPL NVDA UXIN ...
import { exhibitFromIndex, headline } from "../../lib/pressRelease.mjs";

const UA = process.env.SEC_USER_AGENT || "Arkanum diagnostics";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, as = "json") {
  await sleep(150);
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return as === "json" ? r.json() : r.text();
}
// The site's path (lib/sec.ts secTextHead): the download stops after 64 KB.
let kb = 0;
async function head(url) {
  await sleep(150);
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const reader = r.body.getReader(), parts = [];
  let size = 0;
  while (size < 65536) { const { done, value } = await reader.read(); if (done) break; parts.push(value); size += value.length; }
  await reader.cancel().catch(() => {});
  kb += size / 1024;
  return new TextDecoder().decode(Buffer.concat(parts)).slice(0, 65536);
}
const tickers = await get("https://www.sec.gov/files/company_tickers.json");
const byTicker = new Map(Object.values(tickers).map((c) => [c.ticker, c.cik_str]));
let total = 0, withEx = 0, withHead = 0;
for (const sym of process.argv.slice(2)) {
  const cik = byTicker.get(sym);
  if (!cik) { console.log(`${sym}: not found`); continue; }
  const r = (await get(`https://data.sec.gov/submissions/CIK${String(cik).padStart(10, "0")}.json`)).filings.recent;
  let n = 0;
  for (let i = 0; i < r.form.length && n < 5; i++) {
    if (r.form[i] !== "8-K") continue;
    n++; total++;
    const acc = r.accessionNumber[i].replace(/-/g, "");
    const dir = `https://www.sec.gov/Archives/edgar/data/${cik}/${acc}`;
    const ex = exhibitFromIndex(await head(`${dir}/${r.accessionNumber[i]}-index.html`));
    if (!ex) { console.log(`${sym} ${r.filingDate[i]} [${r.items[i]}] no EX-99`); continue; }
    withEx++;
    const doc = await head(`${dir}/${ex}`);
    const h = headline(doc);
    if (h) withHead++;
    console.log(`${sym} ${r.filingDate[i]} [${r.items[i]}] ${ex} -> ${h ?? "NO HEADLINE"}`);
  }
}
console.log(`\n8-Ks: ${total}; with exhibit 99: ${withEx}; headline found: ${withHead}; downloaded ${Math.round(kb)} KB in all`);
