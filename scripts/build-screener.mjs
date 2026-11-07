#!/usr/bin/env node
// Builds public/data/screener.json: fundamentals for every NYSE/Nasdaq/Cboe company from
// SEC EDGAR XBRL "frames" (official, public domain). No prices (see below).
// Runs nightly from GitHub Actions. Usage: node scripts/build-screener.mjs [--limit 200]
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { sectorForSic } from "../lib/sectors.mjs";

const SEC_UA = process.env.SEC_USER_AGENT || "Arkanum (set SEC_USER_AGENT)";
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

// ---- Trailing twelve months (TTM) -------------------------------------------------
// Every SEC figure carries its own start and end dates. Companies don't file their
// fiscal Q4 separately (it's inside the annual 10-K), so it's rebuilt as
// full year − the three quarters inside it. Works for any fiscal year-end.
const Y = now.getUTCFullYear();
const QTRS = [];
for (let y = Y - 3; y <= Y; y++) for (let q = 1; q <= 4; q++) QTRS.push(`CY${y}Q${q}`);
const DAY = 86_400_000;
const days = (a, b) => (Date.parse(b) - Date.parse(a)) / DAY;

/** Per company: quarters and fiscal years with dates. Largest tag wins per period. */
async function periods(tags) {
  const co = new Map(); // cik → { q: Map(end → {start,end,val}), y: Map(end → {...}) }
  const add = (kind, row) => {
    if (!co.has(row.cik)) co.set(row.cik, { q: new Map(), y: new Map() });
    const m = co.get(row.cik)[kind], cur = m.get(row.end);
    if (!cur || row.val > cur.val) m.set(row.end, { start: row.start, end: row.end, val: row.val });
  };
  for (const [kind, list] of [["q", QTRS], ["y", [`CY${Y - 3}`, `CY${Y - 2}`, `CY${Y - 1}`, `CY${Y}`]]]) {
    for (const p of list) for (const t of tags) {
      const d = await sec(`https://data.sec.gov/api/xbrl/frames/us-gaap/${t}/USD/${p}.json`);
      await sleep(150);
      for (const row of d?.data ?? []) if (row.start) add(kind, row);
    }
  }
  for (const c of co.values()) {
    for (const yr of c.y.values()) {
      const inside = [...c.q.values()].filter((q) => days(yr.start, q.start) >= -5 && days(q.end, yr.end) >= -5);
      if (inside.length !== 3 || inside.some((q) => Math.abs(days(q.end, yr.end)) <= 5)) continue;
      const lastEnd = inside.map((q) => q.end).sort().at(-1);
      c.q.set(yr.end, { start: new Date(Date.parse(lastEnd) + DAY).toISOString().slice(0, 10), end: yr.end, val: yr.val - inside.reduce((a, q) => a + q.val, 0) });
    }
  }
  return co;
}

// 75–120 days: some retailers (Costco) use 12- and 16-week quarters.
const quarterGap = (a, b) => { const g = days(a.end, b.end); return g >= 75 && g <= 120; };
const fmtEnd = (d) => new Date(d).toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

/** Latest 4 back-to-back quarters for one company, and the 4 before them. */
function ttm(co, cik) {
  const qs = [...(co.get(cik)?.q.values() ?? [])].sort((a, b) => a.end.localeCompare(b.end));
  for (let i = qs.length - 1; i >= 3; i--) {
    const w = qs.slice(i - 3, i + 1);
    if (!w.every((q, k) => k === 0 || quarterGap(w[k - 1], q))) continue;
    if (days(w[3].end, now.toISOString()) > 550) return null; // too stale to call "trailing"
    const p = i >= 7 ? qs.slice(i - 7, i - 3) : [];
    const priorOk = p.length === 4 && p.every((q, k) => k === 0 || quarterGap(p[k - 1], q)) && quarterGap(p[3], w[0]);
    return { value: w.reduce((a, q) => a + q.val, 0), prior: priorOk ? p.reduce((a, q) => a + q.val, 0) : null, end: w[3].end };
  }
  return null;
}

/** Latest fiscal year and the one before (fallback when quarters are incomplete). */
function fiscal(co, cik) {
  const ys = [...(co.get(cik)?.y.values() ?? [])].sort((a, b) => a.end.localeCompare(b.end));
  const last = ys.at(-1), prev = ys.at(-2);
  if (!last) return null;
  return { value: last.val, prior: prev && Math.abs(days(prev.end, last.end) - 365) < 20 ? prev.val : null, end: last.end };
}

/** Annual-only version of periods(): cash-flow items are reported year-to-date, so
 *  single quarters are rarely available; the last fiscal year is used instead. */
async function annual(tags) {
  const co = new Map();
  for (const p of [`CY${Y - 2}`, `CY${Y - 1}`, `CY${Y}`]) for (const t of tags) {
    const d = await sec(`https://data.sec.gov/api/xbrl/frames/us-gaap/${t}/USD/${p}.json`);
    await sleep(150);
    for (const row of d?.data ?? []) {
      if (!row.start) continue;
      if (!co.has(row.cik)) co.set(row.cik, { q: new Map(), y: new Map() });
      const m = co.get(row.cik).y, cur = m.get(row.end);
      if (!cur || row.val > cur.val) m.set(row.end, { start: row.start, end: row.end, val: row.val });
    }
  }
  return co;
}

console.log("Quarterly fundamentals…");
const revQ = await periods(REV);
const niQ = await periods(["NetIncomeLoss"]);
console.log("Cash flow, dividends, debt…");
const ocfY = await annual(["NetCashProvidedByUsedInOperatingActivities"]);
// Companies label the same item differently (AT&T: "productive assets"; J&J: "ordinary dividends").
const capexY = await annual(["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets"]);
const divY = await annual(["PaymentsOfDividendsCommonStock", "PaymentsOfDividends", "PaymentsOfOrdinaryDividends"]);
// Debt from the newest balance sheet. Total debt labels first; otherwise long-term
// (non-current) debt plus its current portion.
const newest = async (tag) => {
  const m = new Map();
  for (let i = QTRS.length - 1; i >= 0; i--) for (const [cik, v] of await frame("us-gaap", tag, "USD", `${QTRS[i]}I`)) if (!m.has(cik)) m.set(cik, v);
  return m;
};
const debt = new Map();
for (const tag of ["LongTermDebt", "LongTermDebtAndCapitalLeaseObligationsIncludingCurrentMaturities", "DebtLongtermAndShorttermCombinedAmount"])
  for (const [cik, v] of await newest(tag)) if (!debt.has(cik)) debt.set(cik, v);
const ltNon = await newest("LongTermDebtNoncurrent"), ltCur = await newest("LongTermDebtCurrent");
const leaseNon = await newest("LongTermDebtAndCapitalLeaseObligations");
for (const [cik, v] of [...ltNon, ...leaseNon]) if (!debt.has(cik)) debt.set(cik, v + (ltCur.get(cik) ?? 0));
// Equity: newest balance sheet wins.
const equity = new Map();
for (let i = QTRS.length - 1; i >= 0; i--) {
  for (const [cik, v] of await frame("us-gaap", "StockholdersEquity", "USD", `${QTRS[i]}I`)) if (!equity.has(cik)) equity.set(cik, v);
}
// Some companies (P&G, AT&T) only report equity including minority interests.
for (let i = QTRS.length - 1; i >= 0; i--) {
  for (const [cik, v] of await frame("us-gaap", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest", "USD", `${QTRS[i]}I`)) if (!equity.has(cik)) equity.set(cik, v);
}
console.log(`equity ${equity.size}`);

const tickers = await sec("https://www.sec.gov/files/company_tickers_exchange.json");
const universe = [];
const seen = new Set();
for (const [cik, name, ticker, exchange] of tickers.data) {
  if (!["Nasdaq", "NYSE", "CBOE"].includes(exchange) || seen.has(ticker)) continue;
  seen.add(ticker);
  universe.push({ cik, name, ticker, exchange });
}
const list = universe.slice(0, LIMIT);

// ---- Industry (SIC code) ----------------------------------------------------------
// One SEC request per company, so results are cached in data/sic.json and only new
// companies are looked up each night.
const SIC_FILE = "data/sic.json";
let sicCache = {};
try { sicCache = JSON.parse(await readFile(SIC_FILE, "utf8")); } catch {}
const needSic = [...new Set(list.map((u) => u.cik))].filter((c) => !(c in sicCache));
console.log(`Industry codes: ${needSic.length} to look up…`);
async function sicWorker() {
  while (needSic.length) {
    const cik = needSic.shift();
    const d = await sec(`https://data.sec.gov/submissions/CIK${String(cik).padStart(10, "0")}.json`);
    if (d) sicCache[cik] = [d.sic || "", d.sicDescription || ""];
    await sleep(400);
    if (needSic.length % 1000 === 0 && needSic.length) {
      console.log(`  ${needSic.length} left`);
      await writeFile(SIC_FILE, JSON.stringify(sicCache)); // keep progress if interrupted
    }
  }
}
await mkdir("data", { recursive: true });
await Promise.all([sicWorker(), sicWorker(), sicWorker(), sicWorker()]);
await writeFile(SIC_FILE, JSON.stringify(sicCache));

const r = (x, d = 2) => (x == null || !Number.isFinite(x) ? null : Number(x.toFixed(d)));
// Everything here comes from SEC filings (public domain). No prices: those are shown by
// TradingView's widgets, which may be displayed publicly; price data from other free
// sources may not.
const fields = ["t", "n", "x", "rev", "ni", "margin", "growth", "roe", "de", "fcf", "fcfMargin", "div", "payout", "sector", "ind", "basis"];
const rows = [];
let ttmCount = 0;
// SEC lists a company's main stock first, then any other tickers filed under it (share
// classes, preferreds, and for banks dozens of exchange-traded notes). Fundamentals are
// per company, so one row per company under its main ticker.
const seenCik = new Set();
for (const u of list) {
  if (seenCik.has(u.cik)) continue;
  seenCik.add(u.cik);
  // Prefer the last four quarters; fall back to the last full fiscal year.
  const rT = ttm(revQ, u.cik), nT = ttm(niQ, u.cik);
  const useTtm = rT && nT && rT.end === nT.end;
  const rF = fiscal(revQ, u.cik), nF = fiscal(niQ, u.cik);
  const R = useTtm ? rT.value : rF?.value, Rp = useTtm ? rT.prior : rF?.prior;
  const N = useTtm ? nT.value : nF?.value;
  const basis = useTtm ? `Last 4 quarters to ${fmtEnd(rT.end)}` : rF || nF ? `Fiscal year to ${fmtEnd((rF ?? nF).end)}` : null;
  if (!basis) continue; // nothing to screen on
  if (useTtm) ttmCount++;
  const E = equity.get(u.cik);
  const [sic, ind] = sicCache[u.cik] ?? ["", ""];
  // Last fiscal year: dividends paid, free cash flow (operating cash flow − capital spending).
  const ocf = fiscal(ocfY, u.cik), capex = fiscal(capexY, u.cik), div = fiscal(divY, u.cik);
  // SEC lists closed-end funds and BDCs (lending funds) with no industry code.
  const sector = sic ? sectorForSic(sic) : u.cik in sicCache ? "Funds & investment companies" : null;
  // Free cash flow and debt-to-equity aren't meaningful for banks, insurers and funds,
  // whose cash flows and balance sheets are their business.
  const meaningful = sector !== "Financials" && sector !== "Funds & investment companies";
  const fcf = meaningful && ocf && capex && capex.end === ocf.end ? ocf.value - capex.value : null;
  const D = meaningful ? debt.get(u.cik) : undefined;
  const yearRev = rF?.value;
  const paid = div?.value ?? (ocf ? 0 : null); // 0 = files cash flows but paid no dividend
  const yearNi = nF?.value;
  rows.push([
    u.ticker, u.name, u.exchange,
    R ?? null, N ?? null,
    R > 0 && N != null ? r((N / R) * 100, 1) : null, // net margin %
    R > 0 && Rp > 0 ? r(((R - Rp) / Rp) * 100, 1) : null, // revenue growth %
    E > 0 && N != null ? r((N / E) * 100, 1) : null, // ROE %
    E > 0 && D != null ? r(D / E, 2) : null, // debt-to-equity
    fcf,
    fcf != null && yearRev > 0 && ocf.end === rF.end ? r((fcf / yearRev) * 100, 1) : null, // FCF margin %
    paid,
    paid != null && yearNi > 0 ? r((paid / yearNi) * 100, 0) : null, // payout ratio %
    sector, ind ? ind.replace(/\b([A-Z])([A-Z]+)\b/g, (_, a, b) => a + b.toLowerCase()) : null, basis,
  ]);
}
console.log(`TTM fundamentals for ${ttmCount} of ${rows.length}`);
await mkdir("public/data", { recursive: true });
await writeFile("public/data/screener.json", JSON.stringify({ updated: now.toISOString(), fiscalYear: FY, fields, rows }));
console.log(`Wrote ${rows.length} rows to public/data/screener.json`);
