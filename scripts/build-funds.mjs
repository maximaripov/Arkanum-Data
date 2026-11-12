#!/usr/bin/env node
// Builds public/data/funds.json: what well-known funds hold and what they changed, from
// their quarterly SEC 13F filings (US stocks and ETFs over $100M funds must report).
// 13Fs are due 45 days after each quarter, so positions are 6–20 weeks old when published.
//
// Incremental: a fund is only re-read when it files a new 13F. CUSIP → ticker lookups
// (OpenFIGI, free) are cached in data/cusip.json. Shared 13F code: scripts/lib/thirteenf.mjs.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  // Added 2026-11-12 (round 92), IDs checked against SEC with scripts/diagnose/fund-ciks.mjs.
  // Left out: Scion (last 13F Nov 2025), Greenlight and Jana (none since 2024 and 2023 under
  // these IDs), Gotham (about 1,800 positions: quant-style breadth, slow for the fund study).
  [949509, "Oaktree Capital", "Howard Marks"],
  [1103804, "Viking Global", "Andreas Halvorsen"],
  [1061165, "Lone Pine Capital", "Stephen Mandel's firm"],
  [1791786, "Elliott Investment Management", "Paul Singer's firm"],
  [1345471, "Trian Fund Management", "Nelson Peltz"],
  [1517137, "Starboard Value", "Jeff Smith"],
  [1418814, "ValueAct", "Activist fund"],
  [1709323, "Himalaya Capital", "Li Lu"],
  [1112520, "Akre Capital Management", "Chuck Akre's firm"],
  [1549575, "Dalal Street", "Mohnish Pabrai"],
  [1035674, "Paulson & Co.", "John Paulson"],
  [1569205, "Fundsmith", "Terry Smith"],
  [934639, "Maverick Capital", "Lee Ainslie"],
  [1138995, "Glenview Capital", "Larry Robbins"],
  [1166559, "Gates Foundation Trust", "Bill & Melinda Gates Foundation endowment"],
];

let prev = { funds: [] };
try { prev = JSON.parse(await readFile("public/data/funds.json", "utf8")); } catch {}

const out = [], changed = [];
for (const [cik, name, who] of FUNDS) {
  const sub = await getJson(`https://data.sec.gov/submissions/CIK${String(cik).padStart(10, "0")}.json`);
  const s = await summarize13F({ cik, sub, old: prev.funds.find((f) => f.cik === cik) });
  if (!s) continue;
  const { unchanged, ...data } = s;
  out.push({ cik, name, who, ...data });
  // A fund already tracked that filed a new report: its followers get an alert (fund-alerts.mjs).
  if (!unchanged && prev.funds.some((f) => f.cik === cik)) changed.push(cik);
  console.log(unchanged ? `${name}: unchanged (${s.period})` : `${name}: ${s.count} holdings, $${(s.total / 1e9).toFixed(1)}B (${s.period})`);
}

await addTickers(out.flatMap((f) => [f.top, f.new, f.added, f.reduced, f.sold]));
await mkdir("public/data", { recursive: true });
await writeFile("public/data/funds.json", JSON.stringify({ updated: new Date().toISOString(), funds: out }));
console.log(`funds.json: ${out.length} funds`);
const fresh = out.filter((f) => changed.includes(f.cik)).map((f) => ({ cik: f.cik, name: f.name, period: f.period, new: (f.new ?? []).slice(0, 3).map((h) => h.t || h.name), sold: (f.sold ?? []).slice(0, 3).map((h) => h.t || h.name) }));
await writeFile(process.env.FUNDS_NEW_OUT || join(tmpdir(), "funds-new.json"), JSON.stringify(fresh));
if (fresh.length) console.log(`new reports: ${fresh.map((f) => f.name).join(", ")}`);
