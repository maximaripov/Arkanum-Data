#!/usr/bin/env node
// Research (owner-only, run on GitHub): do insider SALES predict anything? Every open-market
// sale by an officer or director filed in the window, grouped by the traits the site uses
// (its "notable sale" rule, role, size, share of stake sold, pre-planned or not), and what the
// stock did after the filing became public, against other sales filed the same month, small
// caps (IWM) and the S&P 500 (SPY). For a sale, a NEGATIVE number means the stock did worse:
// the sale "worked" as a warning. Prices from Yahoo, used only to compute these statistics.
//
//   node scripts/diagnose/sales-study.mjs [2023q1] [2025q4] [2022q1] [out.json]
// With out.json the results are also written there (the monthly research refresh uses this).
import { mkdir, rm, writeFile } from "node:fs/promises";
import { quarterRange, tsv, isoDate, truthy, roleOf, getZip as getZipFor } from "../lib/form345.mjs";
import { roleKind, saleFlags } from "../../lib/conviction.mjs";
import { monthBootstrap } from "../../lib/bootstrap.mjs";
import { unsplit } from "../../lib/returns.mjs";

const [FROM = "2023q1", TO = "2025q4", HIST = "2022q1", OUT = null] = process.argv.slice(2);
const UA = process.env.SEC_USER_AGENT;
const TMP = "/tmp/sales-study";
const HORIZONS = [["1 month", 21], ["3 months", 63], ["6 months", 126]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const qStart = (q) => `${q.slice(0, 4)}-${String((+q.slice(5) - 1) * 3 + 1).padStart(2, "0")}-01`;
const testStart = qStart(FROM);
const days = (a, b) => (Date.parse(b) - Date.parse(a)) / 86_400_000;
const FUND_NAME = /\b(LLC|L\.?P\.?|FUND|TRUST|PARTNERS|CAPITAL|MANAGEMENT|ADVISORS?|HOLDINGS?|FOUNDATION|VENTURES|INVESTMENTS?)\b/i;

// ---- 1. Sales, one event per filing and insider -------------------------------------------
await mkdir(TMP, { recursive: true });
const events = new Map();
const read = []; // quarters actually published and read
for (const quarter of quarterRange(HIST, TO)) {
  const zip = await getZipFor(quarter, { tmp: TMP, ua: UA });
  if (!zip) { console.log(`${quarter}: not published`); continue; }
  read.push(quarter);
  const sub = tsv(zip, "SUBMISSION.tsv"), own = tsv(zip, "REPORTINGOWNER.tsv"), tr = tsv(zip, "NONDERIV_TRANS.tsv");
  const S = (n) => sub.col(n), O = (n) => own.col(n), T = (n) => tr.col(n);
  const subs = new Map(sub.rows.map((r) => [r[S("ACCESSION_NUMBER")], {
    filed: isoDate(r[S("FILING_DATE")]), type: r[S("DOCUMENT_TYPE")], issuerCik: r[S("ISSUERCIK")],
    symbol: (r[S("ISSUERTRADINGSYMBOL")] ?? "").trim().toUpperCase(), planned: S("AFF10B5ONE") >= 0 ? truthy(r[S("AFF10B5ONE")]) : false,
  }]));
  const owners = new Map();
  for (const r of own.rows) { const a = r[O("ACCESSION_NUMBER")]; if (!owners.has(a)) owners.set(a, []); owners.get(a).push({ cik: r[O("RPTOWNERCIK")], name: r[O("RPTOWNERNAME")], role: roleOf(r[O("RPTOWNER_RELATIONSHIP")], r[O("RPTOWNER_TITLE")]) }); }
  let n = 0;
  for (const r of tr.rows) {
    if ((r[T("TRANS_CODE")] ?? "").trim() !== "S") continue;
    const a = r[T("ACCESSION_NUMBER")], s = subs.get(a), o = owners.get(a)?.[0];
    if (!s || !o || !s.filed || (s.type ?? "4").trim() !== "4") continue;
    const shares = +r[T("TRANS_SHARES")] || 0, price = +r[T("TRANS_PRICEPERSHARE")] || 0;
    if (!shares || !price) continue;
    const key = `${a}|${o.cik}`;
    const e = events.get(key) ?? { accession: a, ownerCik: o.cik, owner: o.name, role: o.role, issuerCik: s.issuerCik, symbol: s.symbol, filed: s.filed, planned: s.planned, date: null, shares: 0, value: 0, ownedAfter: null, code: "S" };
    const d = isoDate(r[T("TRANS_DATE")]); if (d && (!e.date || d < e.date)) e.date = d;
    e.shares += shares; e.value += shares * price;
    const after = +r[T("SHRS_OWND_FOLWNG_TRANS")];
    if (Number.isFinite(after) && (e.ownedAfter == null || after < e.ownedAfter)) e.ownedAfter = after; // the last fill leaves the least
    events.set(key, e); n++;
  }
  console.log(`${quarter}: ${n} sale lines, ${events.size} events`);
  await rm(zip, { force: true });
}

// ---- 2. Officer and director sales in the window, with the site's flags ---------------------
const all = [...events.values()].filter((e) => e.date && e.symbol && /^[A-Z.]{1,6}$/.test(e.symbol));
const exec = all.filter((e) => roleKind(e.role) !== "owner");
const byIssuer = new Map();
for (const x of exec) { if (!byIssuer.has(x.issuerCik)) byIssuer.set(x.issuerCik, []); byIssuer.get(x.issuerCik).push(x); }
const tested = exec.filter((e) => e.filed >= testStart && e.filed.slice(0, 7) <= `${TO.slice(0, 4)}-12`);
for (const e of tested) {
  e.sellers = new Set(byIssuer.get(e.issuerCik).filter((x) => x.filed <= e.filed && days(x.filed, e.filed) <= 30).map((x) => x.ownerCik)).size;
  // The data sets give holdings after each line for that account only; the last fill's figure
  // stands in for the all-accounts total the site uses (so "share of stake" runs a little high).
  e.ownedTotal = e.ownedAfter;
  e.fund = FUND_NAME.test(e.owner ?? "");
  e.flag = saleFlags(e, { sellers: e.sellers });
}
console.log(`${tested.length} officer/director sales filed ${testStart} or later`);

// ---- 3. Prices and returns (same method as the buy study) -----------------------------------
async function closes(symbol) {
  const y = symbol.replace(".", "-");
  const p1 = Math.floor(Date.parse(testStart) / 1000) - 86400 * 40, p2 = Math.floor(Date.now() / 1000);
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(y)}?period1=${p1}&period2=${p2}&interval=1d&events=split,div`, { headers: { "User-Agent": "Mozilla/5.0 (research)" }, signal: AbortSignal.timeout(20_000) });
      if (r.status === 404) return null;
      if (r.status === 429) { await sleep(5000 * (i + 1)); continue; }
      if (!r.ok) return null;
      const res = (await r.json()).chart?.result?.[0];
      // raw: the price traded that day (Yahoo's close undone for later splits), for the ticker check.
      const ts = res?.timestamp ?? [], close = res?.indicators?.quote?.[0]?.close ?? [], raw = unsplit(ts, close, res?.events?.splits), adj = res?.indicators?.adjclose?.[0]?.adjclose ?? close;
      const out = []; for (let k = 0; k < ts.length; k++) if (adj[k] != null && raw[k] != null) out.push([new Date(ts[k] * 1000).toISOString().slice(0, 10), adj[k], raw[k], close[k]]);
      return out.length ? out : null;
    } catch { await sleep(2000); }
  }
  return null;
}
const symbols = [...new Set(tested.map((e) => e.symbol))];
const spy = await closes("SPY"), iwm = await closes("IWM");
if (!spy || !iwm) throw new Error("No SPY/IWM prices");
const px = new Map(); let done = 0;
for (const s of symbols) { const c = await closes(s); if (c) px.set(s, c); if (++done % 500 === 0) console.log(`prices ${done}/${symbols.length} (${px.size})`); await sleep(120); }
const ret = (series, filed, h) => { const i = series.findIndex(([d]) => d > filed); return i < 0 || i + h >= series.length ? null : series[i + h][1] / series[i][1] - 1; };
const tickerOk = (series, e) => { const paid = e.value / e.shares, i = series.findIndex(([d]) => d >= e.date), c = series[i]?.[2] ?? series.at(-1)?.[2]; const k = c / paid; return c && paid && k > 0.67 && k < 1.5; };
const rows = []; let mismatched = 0; const rescued = [];
for (const e of tested) {
  const s = px.get(e.symbol); if (!s) continue;
  if (!tickerOk(s, e)) { mismatched++; continue; }
  // Rescued by unsplit(): would have failed with Yahoo's split-adjusted close. Sampled to the log for checking.
  { const i = s.findIndex(([d]) => d >= e.date), c = s[i]?.[3], k = c / (e.value / e.shares); if (c != null && !(k > 0.67 && k < 1.5)) rescued.push({ symbol: e.symbol, date: e.date, paid: +(e.value / e.shares).toFixed(4), actual: +(+s[i]?.[2]).toFixed(4), yahooClose: +(+c).toFixed(4) }); }
  const raw = {}, spyEx = {}, iwmEx = {};
  for (const [l, h] of HORIZONS) { const a = ret(s, e.filed, h), b = ret(spy, e.filed, h), c = ret(iwm, e.filed, h); raw[l] = a; spyEx[l] = a == null || b == null ? null : a - b; iwmEx[l] = a == null || c == null ? null : a - c; }
  rows.push({ ...e, entry: s.find(([d]) => d > e.filed)?.[2], raw, spy: spyEx, iwm: iwmEx });
}
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
for (const [l] of HORIZONS) {
  const byMonth = new Map();
  for (const r of rows) if (r.raw[l] != null) { const m = r.filed.slice(0, 7); if (!byMonth.has(m)) byMonth.set(m, []); byMonth.get(m).push(r.raw[l]); }
  const med = new Map([...byMonth].map(([m, xs]) => [m, median(xs)]));
  for (const r of rows) { r.month ??= {}; r.month[l] = r.raw[l] == null ? null : r.raw[l] - med.get(r.filed.slice(0, 7)); }
}

// ---- 4. Statistics by group ------------------------------------------------------------------
const winsor = (xs) => { const s = [...xs].sort((a, b) => a - b); const lo = s[Math.floor(s.length * 0.01)], hi = s[Math.ceil(s.length * 0.99) - 1]; return xs.map((x) => Math.min(hi, Math.max(lo, x))); };
function stats(list, bench, l) {
  const xs = list.map((r) => r[bench][l]).filter((x) => x != null);
  if (xs.length < 20) return { n: xs.length };
  const w = winsor(xs), mean = w.reduce((a, b) => a + b, 0) / w.length, sd = Math.sqrt(w.reduce((a, b) => a + (b - mean) ** 2, 0) / (w.length - 1));
  const out = { n: xs.length, mean, median: median(xs), below: xs.filter((x) => x < 0).length / xs.length, t: mean / (sd / Math.sqrt(w.length)) };
  // Six months only (what the report card uses): a 90% range for the median, resampling whole filing months.
  if (l === "6 months") {
    const kept = list.filter((r) => r[bench][l] != null);
    const ci = monthBootstrap(kept.map((r) => r[bench][l]), kept.map((r) => r.filed.slice(0, 7)));
    if (ci) Object.assign(out, { lo: ci.lo, hi: ci.hi, months: ci.months });
  }
  return out;
}
const pctSold = (r) => r.flag?.pct ?? null;
const groups = {
  "All officer/director sales": () => true,
  "Notable (site rule)": (r) => r.flag?.notable, "Not notable": (r) => !r.flag?.notable,
  "Pre-planned (10b5-1)": (r) => r.planned, "Not pre-planned": (r) => !r.planned,
  "Top executive": (r) => roleKind(r.role) === "top", "Other officer": (r) => roleKind(r.role) === "officer", "Director only": (r) => roleKind(r.role) === "director",
  "Top exec, not pre-planned": (r) => roleKind(r.role) === "top" && !r.planned,
  "Value $1M+": (r) => r.value >= 1e6, "Value $100K–1M": (r) => r.value >= 1e5 && r.value < 1e6, "Value under $100K": (r) => r.value < 1e5,
  "Sold 50%+ of stake": (r) => (pctSold(r) ?? 0) >= 0.5, "Sold 20–49% of stake": (r) => (pctSold(r) ?? 0) >= 0.2 && (pctSold(r) ?? 0) < 0.5, "Sold under 20%": (r) => pctSold(r) != null && pctSold(r) < 0.2,
  "Sold entire stake": (r) => r.ownedAfter === 0,
  "3+ insiders selling": (r) => r.sellers >= 3, "Alone": (r) => r.sellers === 1,
  "Price $5+": (r) => r.entry >= 5, "Price under $5": (r) => r.entry < 5,
};
const BENCH = ["month", "iwm", "spy"];
const tables = Object.fromEntries(BENCH.map((b) => [b, Object.entries(groups).map(([name, f]) => { const g = rows.filter(f); return [name, Object.fromEntries(HORIZONS.map(([l]) => [l, stats(g, b, l)]))]; })]));
const out = { generated: new Date().toISOString(), from: testStart, to: read.at(-1) ?? TO, tested: tested.length, kept: rows.length, mismatched, noPrices: symbols.length - px.size, symbols: symbols.length, tables };
if (OUT) await writeFile(OUT, JSON.stringify(out, null, 1));
console.log("RESULT_JSON_START");
console.log(JSON.stringify(out));
console.log("RESULT_JSON_END");
// A spread-out sample of the trades unsplit() rescued (under $5 first), for checking by hand.
{ const pick = (xs, n) => xs.filter((_, i) => i % Math.max(1, Math.floor(xs.length / n)) === 0).slice(0, n);
  console.log(`RESCUED ${rescued.length} SAMPLE_JSON ${JSON.stringify([...pick(rescued.filter((r) => r.actual < 5), 12), ...pick(rescued.filter((r) => r.actual >= 5), 6)])}`); }
