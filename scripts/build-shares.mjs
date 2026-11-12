#!/usr/bin/env node
// Shares outstanding by ticker, for the market-cap rule of saved lab strategies: live strategy
// alerts (instant-alerts.mjs) multiply it by the purchase price. From SEC's XBRL frames, the
// latest of the last three quarters for each company (cover-page figure first). Foreign
// filers (20-F) aren't in the frames, so their market cap stays unknown, as in the lab.
//   node scripts/build-shares.mjs   -> public/data/shares.json { ticker: shares } (also read by stock pages for market value)
import { writeFile } from "node:fs/promises";
import { getJson } from "./lib/sec.mjs";

const now = new Date();
const quarters = [];
for (let k = 1; k <= 3; k++) { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3 * k, 1)); quarters.push(`${d.getUTCFullYear()}Q${Math.floor(d.getUTCMonth() / 3) + 1}`); }
const byCik = new Map();
for (const q of [...quarters].reverse()) { // oldest first, so the newest figure wins
  for (const c of ["us-gaap/CommonStockSharesOutstanding", "dei/EntityCommonStockSharesOutstanding"]) {
    const j = await getJson(`https://data.sec.gov/api/xbrl/frames/${c}/shares/CY${q}I.json`).catch(() => null);
    for (const d of j?.data ?? []) if (d.val > 0) byCik.set(d.cik, d.val);
  }
}
const tickers = await getJson("https://www.sec.gov/files/company_tickers.json");
const out = {};
for (const c of Object.values(tickers ?? {})) { const v = byCik.get(c.cik_str); if (v) out[c.ticker] = v; }
if (Object.keys(out).length < 1000) throw new Error(`Only ${Object.keys(out).length} tickers with shares outstanding: SEC data looks incomplete, keeping the old file`);
await writeFile("public/data/shares.json", JSON.stringify(out));
console.log(`shares.json: ${Object.keys(out).length} tickers (quarters ${quarters.join(", ")})`);
