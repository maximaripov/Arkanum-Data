#!/usr/bin/env node
// Builds public/data/screener.json: every NYSE/Nasdaq/Cboe stock with price stats
// (Yahoo, unofficial) and fundamentals (SEC EDGAR XBRL "frames", official).
// Runs nightly from GitHub Actions. Usage: node scripts/build-screener.mjs [--limit 200]
import { writeFile, mkdir } from "node:fs/promises";

const SEC_UA = process.env.SEC_USER_AGENT || "Foresight personal app (set SEC_USER_AGENT)";
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, headers, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
      if (r.status === 404) return null;
      if (r.ok) return await r.json();
    } catch {}
    await sleep(1000 * (i + 1));
  }
  return null;
}
const sec = (url) => getJson(url, { "User-Agent": SEC_UA });

/** One XBRL concept across all companies → Map(cik → value). */
async function frame(taxonomy, tag, unit, period) {
  const d = await sec(`https://data.sec.gov/api/xbrl/frames/${taxonomy}/${tag}/${unit}/${period}.json`);
  await sleep(150);
  return new Map((d?.data ?? []).map((x) => [x.cik, x.val]));
}
async function maxOf(tags, unit, period) {
  const out = new Map();
  for (const t of tags) for (const [cik, v] of await frame("us-gaap", t, unit, period)) out.set(cik, Math.max(out.get(cik) ?? -Infinity, v));
  return out;
}

const now = new Date();
const FY = now.getUTCFullYear() - 1; // latest fully reported calendar year
const REV = ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "RevenueFromContractWithCustomerIncludingAssessedTax", "SalesRevenueNet"];

console.log(`Fundamentals for CY${FY} vs CY${FY - 1}…`);
const [rev, revPrev, ni, equity] = [
  await maxOf(REV, "USD", `CY${FY}`),
  await maxOf(REV, "USD", `CY${FY - 1}`),
  await frame("us-gaap", "NetIncomeLoss", "USD", `CY${FY}`),
  await frame("us-gaap", "StockholdersEquity", "USD", `CY${FY}Q4I`),
];
// Shares outstanding: newest quarter wins.
const shares = new Map();
const quarters = [];
for (let y = now.getUTCFullYear(); y >= FY; y--) for (let q = 4; q >= 1; q--) quarters.push(`CY${y}Q${q}I`);
for (const p of quarters) {
  const m = await frame("dei", "EntityCommonStockSharesOutstanding", "shares", p);
  for (const [cik, v] of m) if (!shares.has(cik)) shares.set(cik, v);
  if (shares.size > 6000) break;
}
// Fallback for multi-class companies (GOOGL, META…), whose cover-page share count is
// reported per class and dropped from frames: weighted diluted shares from recent quarters.
for (const p of [...quarters.map((q) => q.slice(0, -1)), `CY${FY}`]) {
  for (const [cik, v] of await frame("us-gaap", "WeightedAverageNumberOfDilutedSharesOutstanding", "shares", p))
    if (!shares.has(cik)) shares.set(cik, v);
}
console.log(`revenue ${rev.size}, net income ${ni.size}, shares ${shares.size}`);

const tickers = await sec("https://www.sec.gov/files/company_tickers_exchange.json");
const universe = [];
const seen = new Set();
for (const [cik, name, ticker, exchange] of tickers.data) {
  if (!["Nasdaq", "NYSE", "CBOE"].includes(exchange) || seen.has(ticker)) continue;
  seen.add(ticker);
  universe.push({ cik, name, ticker, exchange });
}
const list = universe.slice(0, LIMIT);
console.log(`Prices for ${list.length} tickers…`);

const prices = new Map();
const batches = [];
for (let i = 0; i < list.length; i += 20) batches.push(list.slice(i, i + 20).map((x) => x.ticker));
let done = 0;
async function worker() {
  while (batches.length) {
    const b = batches.shift();
    const d = await getJson(
      `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${encodeURIComponent(b.join(","))}&range=1y&interval=1d`,
      { "User-Agent": "Mozilla/5.0 (Foresight personal app)" }
    );
    for (const [sym, s] of Object.entries(d ?? {})) {
      const c = (s?.close ?? []).filter((x) => x != null);
      if (c.length < 2) continue;
      prices.set(sym, { price: c.at(-1), prev: c.at(-2), first: c[0], hi: Math.max(...c), lo: Math.min(...c) });
    }
    done += b.length;
    if (done % 1000 < 20) console.log(`  ${done}/${list.length}`);
    await sleep(250);
  }
}
await Promise.all([worker(), worker(), worker()]);

const r = (x, d = 2) => (x == null || !Number.isFinite(x) ? null : Number(x.toFixed(d)));
const fields = ["t", "n", "x", "p", "chg", "mcap", "pe", "ps", "margin", "growth", "roe", "ret1y", "offHigh", "rev", "ni"];
const rows = [];
for (const u of list) {
  const p = prices.get(u.ticker);
  if (!p) continue;
  const sh = shares.get(u.cik), R = rev.get(u.cik), N = ni.get(u.cik), E = equity.get(u.cik), Rp = revPrev.get(u.cik);
  const mcap = sh ? p.price * sh : null;
  rows.push([
    u.ticker, u.name, u.exchange, r(p.price),
    r(((p.price - p.prev) / p.prev) * 100),
    mcap ? Math.round(mcap) : null,
    mcap && N > 0 ? r(mcap / N, 1) : null,
    mcap && R > 0 ? r(mcap / R, 2) : null,
    R > 0 && N != null ? r((N / R) * 100, 1) : null,
    R > 0 && Rp > 0 ? r(((R - Rp) / Rp) * 100, 1) : null,
    E > 0 && N != null ? r((N / E) * 100, 1) : null,
    r(((p.price - p.first) / p.first) * 100, 1),
    r(((p.price - p.hi) / p.hi) * 100, 1),
    R ?? null, N ?? null,
  ]);
}
await mkdir("public/data", { recursive: true });
await writeFile("public/data/screener.json", JSON.stringify({ updated: now.toISOString(), fiscalYear: FY, fields, rows }));
console.log(`Wrote ${rows.length} rows to public/data/screener.json`);
