// Working paper no. 5: does copying well-known funds from their 13F reports work, once the
// reports are public (up to 45 days after each quarter)? For the 13 funds the site tracks
// (public/data/funds.json): every 13F-HR for periods from 2022-12-31 on, the changes between
// consecutive reports, and returns from the first close after each report was filed. Two
// tests: (1) the moves: new, added, reduced and sold positions; (2) cloning: the ten largest
// holdings, equal-weighted, held until the next report. Read-only; runs on GitHub (SEC).
// Prints JSON between RESULT_JSON_START and RESULT_JSON_END.
import { readFile } from "node:fs/promises";
import { getJson } from "../lib/sec.mjs";
import { holdings, addTickers } from "../lib/thirteenf.mjs";
import { closesFor, dailyCloses } from "../../lib/returns.mjs";
import { monthBootstrap } from "../../lib/bootstrap.mjs";

const FIRST_PERIOD = "2022-12-31";
const HORIZONS = [["1 month", 21], ["3 months", 63], ["6 months", 126]];
const { funds: tracked } = JSON.parse(await readFile(new URL("../../public/data/funds.json", import.meta.url), "utf8"));

// ---- 1. Every report, and the changes between consecutive ones ------------------------------
const reports = []; // { fund, cik, period, filed, holdings: Map }
for (const f of tracked) {
  const sub = await getJson(`https://data.sec.gov/submissions/CIK${String(f.cik).padStart(10, "0")}.json`);
  const r = sub?.filings?.recent;
  const byPeriod = new Map(); // first listed = latest filing for that period
  for (let i = 0; r && i < r.form.length; i++)
    if (r.form[i] === "13F-HR" && r.reportDate[i] >= FIRST_PERIOD && !byPeriod.has(r.reportDate[i]))
      byPeriod.set(r.reportDate[i], { accession: r.accessionNumber[i], filed: r.filingDate[i] });
  const list = [...byPeriod].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [period, { accession, filed }] of list) {
    const h = await holdings(f.cik, accession).catch(() => null);
    if (h?.size) reports.push({ fund: f.name, cik: f.cik, period, filed, holdings: h });
  }
  console.log(`${f.name}: ${list.length} reports since ${FIRST_PERIOD}`);
}
await addTickers(reports.map((r) => [...r.holdings.values()]));

const moves = [];
const byFund = new Map();
for (const r of reports) { if (!byFund.has(r.fund)) byFund.set(r.fund, []); byFund.get(r.fund).push(r); }
for (const list of byFund.values()) for (let k = 1; k < list.length; k++) {
  const now = list[k], before = list[k - 1];
  const total = [...now.holdings.values()].reduce((a, h) => a + h.value, 0);
  for (const h of now.holdings.values()) {
    const b = before.holdings.get(h.cusip);
    const change = !b ? "new" : h.shares > b.shares * 1.005 ? "added" : h.shares < b.shares * 0.995 ? "reduced" : null;
    if (change && h.t) moves.push({ fund: now.fund, filed: now.filed, t: h.t, change, pct: total ? h.value / total : 0 });
  }
  for (const b of before.holdings.values()) if (!now.holdings.has(b.cusip) && b.t) moves.push({ fund: now.fund, filed: now.filed, t: b.t, change: "sold", pct: 0 });
}
console.log(`${reports.length} reports, ${moves.length} moves with a ticker`);

// ---- 2. Prices -----------------------------------------------------------------------------
const from = reports.reduce((a, r) => (r.filed < a ? r.filed : a), reports[0].filed);
const spy = await dailyCloses("SPY", from);
if (!spy) throw new Error("No S&P 500 prices");
// The equal-weighted S&P 500, so a few giant companies can't make every stock pick look bad.
const rsp = await dailyCloses("RSP", from);
if (!rsp) throw new Error("No equal-weighted S&P 500 prices");
const tickers = new Set([...moves.map((m) => m.t), ...reports.flatMap((r) => [...r.holdings.values()].map((h) => h.t).filter(Boolean))]);
const px = await closesFor([...tickers], from, { pause: 100 });
console.log(`prices for ${px.size} of ${tickers.size} tickers, through ${spy.at(-1)[0]}`);
const index = (b) => ({ b, at: new Map(b.map(([d], i) => [d, i])) });
const SPY = index(spy), RSP = index(rsp);
const after = (s, date) => s.findIndex(([d]) => d > date);
function excess(s, i, j, bench = SPY) {
  if (i < 0 || j < 0 || j >= s.length || j <= i) return null;
  const si = bench.at.get(s[i][0]), sj = bench.at.get(s[j][0]);
  return si == null || sj == null ? null : s[j][1] / s[i][1] - 1 - (bench.b[sj][1] / bench.b[si][1] - 1);
}

// ---- 3. The moves --------------------------------------------------------------------------
for (const m of moves) {
  const s = px.get(m.t);
  const i = s ? after(s, m.filed) : -1;
  m.ret = Object.fromEntries(HORIZONS.map(([l, h]) => [l, s && i >= 0 ? excess(s, i, i + h) : null]));
  m.eq = Object.fromEntries(HORIZONS.map(([l, h]) => [l, s && i >= 0 ? excess(s, i, i + h, RSP) : null]));
}
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
function stat(list, get) {
  const kept = list.filter((x) => get(x) != null), xs = kept.map(get);
  if (xs.length < 20) return { n: xs.length, median: median(xs) };
  const out = { n: xs.length, median: median(xs), up: xs.filter((x) => x > 0).length / xs.length };
  const ci = monthBootstrap(xs, kept.map((x) => x.filed.slice(0, 7)));
  return ci ? { ...out, lo: ci.lo, hi: ci.hi, months: ci.months } : out;
}
const MOVE_GROUPS = {
  "New positions": (m) => m.change === "new", "New positions, 1%+ of the fund": (m) => m.change === "new" && m.pct >= 0.01,
  "Added to": (m) => m.change === "added", "New or added": (m) => m.change === "new" || m.change === "added",
  "Reduced": (m) => m.change === "reduced", "Sold entirely": (m) => m.change === "sold",
};
const moveTable = (list, key = "ret") => Object.entries(MOVE_GROUPS).map(([name, f]) => { const g = list.filter(f); return [name, Object.fromEntries(HORIZONS.map(([l]) => [l, stat(g, (m) => m[key][l])]))]; });
const perFund = [...byFund.keys()].map((fund) => [fund, Object.fromEntries(HORIZONS.map(([l]) => [l, stat(moves.filter((m) => m.fund === fund && (m.change === "new" || m.change === "added")), (m) => m.eq[l])]))]);

// ---- 4. Cloning: top ten holdings, equal-weighted, held until the next report --------------
const clones = [];
for (const list of byFund.values()) for (let k = 0; k < list.length; k++) {
  const r = list[k], next = list[k + 1];
  const top = [...r.holdings.values()].filter((h) => h.t && px.has(h.t)).sort((a, b) => b.value - a.value).slice(0, 10);
  const rets = top.map((h) => {
    const s = px.get(h.t), i = after(s, r.filed), j = next ? after(s, next.filed) : s.length - 1;
    return [excess(s, i, j), excess(s, i, j, RSP)];
  }).filter(([x, e]) => x != null && e != null);
  if (rets.length >= 5 && (next || Date.parse(spy.at(-1)[0]) - Date.parse(r.filed) > 60 * 86_400_000))
    clones.push({ fund: r.fund, filed: r.filed, until: next?.filed ?? spy.at(-1)[0], holdings: rets.length, excess: rets.reduce((a, [b]) => a + b, 0) / rets.length, eq: rets.reduce((a, [, b]) => a + b, 0) / rets.length });
}
const cloneByFund = [...byFund.keys()].map((fund) => {
  const q = clones.filter((c) => c.fund === fund);
  const compound = q.reduce((a, c) => a * (1 + c.excess), 1) - 1; // approximate: compounds quarterly excess returns
  const compoundEq = q.reduce((a, c) => a * (1 + c.eq), 1) - 1;
  return [fund, { quarters: q.length, beat: q.filter((c) => c.excess > 0).length, beatEq: q.filter((c) => c.eq > 0).length, medianQuarter: median(q.map((c) => c.excess)), compound, compoundEq }];
});

const out = {
  generated: new Date().toISOString(), firstPeriod: FIRST_PERIOD, pricesThrough: spy.at(-1)[0],
  funds: tracked.map((f) => f.name), reports: reports.length, moves: moves.length,
  priced: moves.filter((m) => m.ret["1 month"] != null).length,
  moveTable: moveTable(moves), moveTableEq: moveTable(moves, "eq"), perFund,
  clone: { all: stat(clones, (c) => c.excess), allEq: stat(clones, (c) => c.eq), beatEq: clones.filter((c) => c.eq > 0).length / clones.length, quarters: clones.length, beat: clones.filter((c) => c.excess > 0).length / clones.length, byFund: cloneByFund },
};
console.log("RESULT_JSON_START"); console.log(JSON.stringify(out)); console.log("RESULT_JSON_END");
