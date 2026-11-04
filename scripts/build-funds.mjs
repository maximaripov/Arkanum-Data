#!/usr/bin/env node
// Builds public/data/funds.json: what well-known funds hold and what they changed, from
// their quarterly SEC 13F filings (US stocks and ETFs over $100M funds must report).
// 13Fs are due 45 days after each quarter, so positions are 6–20 weeks old when published.
//
// Incremental: a fund is only re-read when it files a new 13F. CUSIP → ticker lookups
// (OpenFIGI, free) are cached in data/cusip.json. Shared 13F code: scripts/lib/thirteenf.mjs.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { getJson } from "./lib/sec.mjs";
import { summarize13F, addTickers } from "./lib/thirteenf.mjs";

const FUNDS = [
  [1067983, "Berkshire Hathaway", "Warren Buffett / Greg Abel"],
  [1350694, "Bridgewater Associates", "Ray Dalio's firm"],
  [1336528, "Pershing Square", "Bill Ackman"],
  [1037389, "Renaissance Technologies", "Quant fund"],
  [1656456, "Appaloosa", "David Tepper"],
  [1536411, "Duquesne Family Office", "Stanley Druckenmiller"],
  [1040273, "Third Point", "Dan Loeb"],
  [1061768, "Baupost Group", "Seth Klarman"],
  [1167483, "Tiger Global", "Chase Coleman"],
  [1135730, "Coatue Management", "Philippe Laffont"],
  [1029160, "Soros Fund Management", "George Soros's family office"],
  [1697748, "ARK Investment Management", "Cathie Wood"],
  [921669, "Icahn Capital", "Carl Icahn"],
];

let prev = { funds: [] };
try { prev = JSON.parse(await readFile("public/data/funds.json", "utf8")); } catch {}

const out = [];
for (const [cik, name, who] of FUNDS) {
  const sub = await getJson(`https://data.sec.gov/submissions/CIK${String(cik).padStart(10, "0")}.json`);
  const s = await summarize13F({ cik, sub, old: prev.funds.find((f) => f.cik === cik) });
  if (!s) continue;
  const { unchanged, ...data } = s;
  out.push({ cik, name, who, ...data });
  console.log(unchanged ? `${name}: unchanged (${s.period})` : `${name}: ${s.count} holdings, $${(s.total / 1e9).toFixed(1)}B (${s.period})`);
}

await addTickers(out.flatMap((f) => [f.top, f.new, f.added, f.reduced, f.sold]));
await mkdir("public/data", { recursive: true });
await writeFile("public/data/funds.json", JSON.stringify({ updated: new Date().toISOString(), funds: out }));
console.log(`funds.json: ${out.length} funds`);
