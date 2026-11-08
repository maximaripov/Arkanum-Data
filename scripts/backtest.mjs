#!/usr/bin/env node
// Owner-only research: does the site's signal score predict returns? Scores every past
// open-market purchase by an officer or director with the site's own conviction() and
// measures what the stock did after the filing became public, against SPY.
//
//   node scripts/backtest.mjs [--from 2023q1] [--to 2025q1] [--history-from 2020q1] [--max-tickers N]
//
// Data: SEC's quarterly Insider Transactions Data Sets (every Form 3/4/5, as TSV in a zip)
// and daily closes from Yahoo's chart endpoint. The prices are used only to compute these
// statistics and are never published; only the summary in docs/backtest/ is written.
// Needs SEC_USER_AGENT (SEC refuses requests without contact details) and `unzip`.
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { quarterRange, tsv, isoDate, truthy, roleOf, getZip as getZipFor } from "./lib/form345.mjs";
import { conviction, roleKind } from "../lib/conviction.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const FROM = arg("from", "2023q1"), TO = arg("to", "2025q1"), HIST = arg("history-from", "2020q1");
const MAX_TICKERS = +arg("max-tickers", "100000");
const UA = process.env.SEC_USER_AGENT;
const LOCAL = arg("local", null); // directory of already-downloaded zips (tests)
const TMP = arg("tmp", "/tmp/form4-backtest");
const OUT = arg("out", "docs/backtest");
const HORIZONS = [["1 month", 21], ["3 months", 63], ["6 months", 126]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Quarters ------------------------------------------------------------------------------
const quarters = quarterRange(HIST, TO);
const getZip = (quarter) => getZipFor(quarter, { tmp: TMP, local: LOCAL, ua: UA });

// ---- 1. Every open-market purchase, one event per filing and insider -------------------------

await mkdir(TMP, { recursive: true });
const events = new Map(); // accession|owner → event
let skippedQuarters = [];
for (const quarter of quarters) {
  const zip = await getZip(quarter);
  if (!zip) { skippedQuarters.push(quarter); console.log(`${quarter}: not published yet`); continue; }
  const sub = tsv(zip, "SUBMISSION.tsv"), own = tsv(zip, "REPORTINGOWNER.tsv"), tr = tsv(zip, "NONDERIV_TRANS.tsv");
  if (quarter === quarters[0]) console.log("columns:", { SUBMISSION: sub.head.join(","), REPORTINGOWNER: own.head.join(","), NONDERIV_TRANS: tr.head.join(",") });
  const S = (n) => sub.col(n), O = (n) => own.col(n), T = (n) => tr.col(n);
  const subs = new Map(sub.rows.map((r) => [r[S("ACCESSION_NUMBER")], {
    filed: isoDate(r[S("FILING_DATE")]), type: r[S("DOCUMENT_TYPE")], issuerCik: r[S("ISSUERCIK")], issuer: r[S("ISSUERNAME")],
    symbol: (r[S("ISSUERTRADINGSYMBOL")] ?? "").trim().toUpperCase(), planned: S("AFF10B5ONE") >= 0 ? truthy(r[S("AFF10B5ONE")]) : false,
  }]));
  const owners = new Map();
  for (const r of own.rows) {
    const a = r[O("ACCESSION_NUMBER")]; if (!owners.has(a)) owners.set(a, []);
    owners.get(a).push({ cik: r[O("RPTOWNERCIK")], name: r[O("RPTOWNERNAME")], role: roleOf(r[O("RPTOWNER_RELATIONSHIP")], r[O("RPTOWNER_TITLE")]) });
  }
  let n = 0;
  for (const r of tr.rows) {
    if ((r[T("TRANS_CODE")] ?? "").trim() !== "P") continue;
    if ((r[T("TRANS_ACQUIRED_DISP_CD")] ?? "A").trim() === "D") continue;
    const a = r[T("ACCESSION_NUMBER")], s = subs.get(a), o = owners.get(a)?.[0];
    if (!s || !o || !s.filed || (s.type ?? "4").trim() !== "4") continue; // originals only; 4/A amendments repeat them
    const shares = +r[T("TRANS_SHARES")] || 0, price = +r[T("TRANS_PRICEPERSHARE")] || 0;
    if (!shares || !price) continue;
    const key = `${a}|${o.cik}`;
    const e = events.get(key) ?? { accession: a, ownerCik: o.cik, owner: o.name, role: o.role, issuerCik: s.issuerCik, issuer: s.issuer, symbol: s.symbol, filed: s.filed, planned: s.planned, date: null, shares: 0, value: 0, ownedAfter: null, code: "P" };
    const d = isoDate(r[T("TRANS_DATE")]);
    if (d && (!e.date || d < e.date)) e.date = d;
    e.shares += shares; e.value += shares * price;
    const after = +r[T("SHRS_OWND_FOLWNG_TRANS")];
    if (Number.isFinite(after) && (e.ownedAfter == null || after > e.ownedAfter)) e.ownedAfter = after; // the last fill's holding
    events.set(key, e); n++;
  }
  console.log(`${quarter}: ${n} purchase lines, ${events.size} events so far`);
  if (!LOCAL) await rm(zip, { force: true });
}

// ---- 2. Score each officer/director buy in the test window with the site's formula ---------
const all = [...events.values()].filter((e) => e.date && e.symbol && /^[A-Z.]{1,6}$/.test(e.symbol));
const exec = all.filter((e) => roleKind(e.role) !== "owner");
// Previous buy of the same stock by the same insider (history reaches back to HIST).
const byPair = new Map();
for (const e of all.sort((a, b) => a.date.localeCompare(b.date))) { const k = e.ownerCik + "|" + e.issuerCik; if (!byPair.has(k)) byPair.set(k, []); byPair.get(k).push(e.date); }
const histStart = `${HIST.slice(0, 4)}-${String((+HIST.slice(5) - 1) * 3 + 1).padStart(2, "0")}-01`;
// The last quarter actually read: asking for one SEC hasn't published yet just skips it.
const LAST = quarters.filter((q) => !skippedQuarters.includes(q)).at(-1) ?? TO;
const testStart = `${FROM.slice(0, 4)}-${String((+FROM.slice(5) - 1) * 3 + 1).padStart(2, "0")}-01`;
const days = (a, b) => (Date.parse(b) - Date.parse(a)) / 86_400_000;
const tested = exec.filter((e) => e.filed >= testStart);
const byIssuer = new Map();
for (const x of exec) { if (!byIssuer.has(x.issuerCik)) byIssuer.set(x.issuerCik, []); byIssuer.get(x.issuerCik).push(x); }
for (const e of tested) {
  const prior = (byPair.get(e.ownerCik + "|" + e.issuerCik) ?? []).filter((d) => d < e.date && days(d, e.date) > 7);
  e.prevBuy = prior.at(-1) ?? null;
  e.prevBuyYears = Math.min(5, Math.floor(days(histStart, e.date) / 365.25));
  // Insiders buying this stock in the 30 days to this filing (the site's window).
  const peers = new Set(byIssuer.get(e.issuerCik).filter((x) => x.filed <= e.filed && days(x.filed, e.filed) <= 30).map((x) => x.ownerCik));
  e.insiders = peers.size;
  e.conv = conviction(e, { insiders: e.insiders });
}
console.log(`${tested.length} officer/director buys filed ${testStart} or later`);

// ---- 3. Prices (daily closes: adjusted for returns, raw to check the ticker) ---------------
async function closes(symbol) {
  const y = symbol.replace(".", "-");
  const p1 = Math.floor(Date.parse(testStart) / 1000) - 86400 * 40, p2 = Math.floor(Date.now() / 1000);
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(y)}?period1=${p1}&period2=${p2}&interval=1d&events=split,div`, { headers: { "User-Agent": "Mozilla/5.0 (research)" }, signal: AbortSignal.timeout(20_000) });
      if (r.status === 404) return null;
      if (r.status === 429) { await sleep(5000 * (i + 1)); continue; }
      if (!r.ok) return null;
      const j = await r.json(), res = j.chart?.result?.[0];
      const ts = res?.timestamp ?? [], raw = res?.indicators?.quote?.[0]?.close ?? [], adj = res?.indicators?.adjclose?.[0]?.adjclose ?? raw;
      const out = []; for (let k = 0; k < ts.length; k++) if (adj[k] != null && raw[k] != null) out.push([new Date(ts[k] * 1000).toISOString().slice(0, 10), adj[k], raw[k]]);
      return out.length ? out : null;
    } catch { await sleep(2000); }
  }
  return null;
}
const symbols = [...new Set(tested.map((e) => e.symbol))].slice(0, MAX_TICKERS);
const px = new Map();
const spy = await closes("SPY"), iwm = await closes("IWM");
if (!spy || !iwm) throw new Error("No SPY/IWM prices: the price source is unavailable");
let done = 0;
for (const s of symbols) { const c = await closes(s); if (c) px.set(s, c); if (++done % 250 === 0) console.log(`prices: ${done}/${symbols.length} (${px.size} found)`); await sleep(150); }
console.log(`prices for ${px.size} of ${symbols.length} stocks`);

/** Return from the first close after `filed` to `h` trading days later. */
function ret(series, filed, h) {
  const i = series.findIndex(([d]) => d > filed);
  if (i < 0 || i + h >= series.length) return null;
  return series[i + h][1] / series[i][1] - 1;
}
// Ticker check: the unadjusted close around the trade date must be near the price in the
// filing, or the symbol probably belongs to another company (SEC's field can be stale).
function tickerOk(series, e) {
  const paid = e.value / e.shares;
  const i = series.findIndex(([d]) => d >= e.date);
  const c = series[i]?.[2] ?? series.at(-1)?.[2];
  if (!c || !paid) return false;
  const ratio = c / paid;
  return ratio > 0.67 && ratio < 1.5;
}
const rows = []; let mismatched = 0;
for (const e of tested) {
  const s = px.get(e.symbol); if (!s) continue;
  if (!tickerOk(s, e)) { mismatched++; continue; }
  const raw = {}, spyEx = {}, iwmEx = {};
  for (const [label, h] of HORIZONS) {
    const a = ret(s, e.filed, h), b = ret(spy, e.filed, h), c = ret(iwm, e.filed, h);
    raw[label] = a; spyEx[label] = a == null || b == null ? null : a - b; iwmEx[label] = a == null || c == null ? null : a - c;
  }
  rows.push({ ...e, entry: s.find(([d]) => d > e.filed)?.[2], raw, spy: spyEx, iwm: iwmEx });
}
// Versus other insider buys filed the same month: takes out market and timing, so what's
// left is whether the score picks the better buys.
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
for (const [label] of HORIZONS) {
  const byMonth = new Map();
  for (const r of rows) if (r.raw[label] != null) { const m = r.filed.slice(0, 7); if (!byMonth.has(m)) byMonth.set(m, []); byMonth.get(m).push(r.raw[label]); }
  const med = new Map([...byMonth].map(([m, xs]) => [m, median(xs)]));
  for (const r of rows) { r.month ??= {}; r.month[label] = r.raw[label] == null ? null : r.raw[label] - med.get(r.filed.slice(0, 7)); }
}

// ---- 4. Statistics -------------------------------------------------------------------------
const winsor = (xs) => { const s = [...xs].sort((a, b) => a - b); const lo = s[Math.floor(s.length * 0.01)], hi = s[Math.ceil(s.length * 0.99) - 1]; return xs.map((x) => Math.min(hi, Math.max(lo, x))); };
function stats(list, bench, label) {
  const xs = list.map((r) => r[bench][label]).filter((x) => x != null);
  if (xs.length < 20) return { n: xs.length };
  const w = winsor(xs), mean = w.reduce((a, b) => a + b, 0) / w.length;
  const sd = Math.sqrt(w.reduce((a, b) => a + (b - mean) ** 2, 0) / (w.length - 1));
  return { n: xs.length, mean, median: median(xs), hit: xs.filter((x) => x > 0).length / xs.length, t: mean / (sd / Math.sqrt(w.length)) };
}
const groups = {
  "All officer/director buys": () => true,
  "Strong (60+)": (r) => r.conv.tier === "strong", "Notable (40–59)": (r) => r.conv.tier === "notable", "Routine (<40)": (r) => r.conv.tier === "routine",
  "Score 80+": (r) => r.conv.score >= 80, "Score 70–79": (r) => r.conv.score >= 70 && r.conv.score < 80, "Score 60–69": (r) => r.conv.score >= 60 && r.conv.score < 70,
  "Score 40–59": (r) => r.conv.score >= 40 && r.conv.score < 60, "Score 20–39": (r) => r.conv.score >= 20 && r.conv.score < 40, "Score <20": (r) => r.conv.score < 20,
  "Top executive (CEO/CFO/President/Chair)": (r) => roleKind(r.role) === "top", "Other officer": (r) => roleKind(r.role) === "officer", "Director only": (r) => roleKind(r.role) === "director",
  "First buy in 2+ years": (r) => r.conv.reasons.some((x) => /First buy in \d/.test(x.text)), "Not a first buy": (r) => !r.conv.reasons.some((x) => /First buy/.test(x.text)),
  "Stake +50% or more": (r) => r.conv.reasons.some((x) => /Stake \+(\d+)/.test(x.text) && +x.text.match(/\d+/)[0] >= 50) || r.conv.reasons.some((x) => x.text === "First shares"),
  "Stake under +10%": (r) => !r.conv.reasons.some((x) => /^Stake|First shares/.test(x.text)),
  "2+ insiders buying": (r) => r.insiders >= 2, "3+ insiders buying": (r) => r.insiders >= 3, "Alone": (r) => r.insiders === 1,
  "Value $1M+": (r) => r.value >= 1e6, "Value $100K–1M": (r) => r.value >= 1e5 && r.value < 1e6, "Value under $100K": (r) => r.value < 1e5,
  "Pre-planned": (r) => r.planned,
  "Price $5+": (r) => r.entry >= 5, "Price under $5": (r) => r.entry < 5,
  "Strong, price $5+": (r) => r.conv.tier === "strong" && r.entry >= 5, "Routine, price $5+": (r) => r.conv.tier === "routine" && r.entry >= 5,
};
const BENCH = [["month", "Versus other insider buys filed the same month (isolates the score)"], ["iwm", "Versus small caps (IWM)"], ["spy", "Versus the S&P 500 (SPY)"]];
const tables = Object.fromEntries(BENCH.map(([b]) => [b, Object.entries(groups).map(([name, f]) => { const g = rows.filter(f); return [name, Object.fromEntries(HORIZONS.map(([l]) => [l, stats(g, b, l)]))]; })]));

const pct = (x) => x == null ? "—" : `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)}%`;
const cell = (s) => s.mean == null ? `n=${s.n}` : `${s.n} · ${pct(s.mean)} · ${pct(s.median)} · ${(s.hit * 100).toFixed(0)}% · ${s.t.toFixed(1)}`;
const gap = (b, l) => { const t = Object.fromEntries(tables[b]); const s = t["Strong (60+)"][l], r = t["Routine (<40)"][l]; return s.mean == null || r.mean == null ? "not enough data" : `${pct(s.mean - r.mean)} mean, ${pct(s.median - r.median)} median`; };
const md = [`# Signal backtest (owner-only)`, ``,
  `Generated ${new Date().toISOString().slice(0, 10)}. Officer and director open-market purchases (original Form 4s) filed ${testStart} to the end of ${LAST.toUpperCase()}, scored with the site's \`conviction()\`; returns from the first close after the filing date. History for "first buy in N years" from ${histStart}.`, ``,
  `${tested.length} buys scored; ${rows.length} kept. Dropped: stocks with no price history (${symbols.length - px.size} of ${symbols.length}, mostly delisted or renamed: survivorship bias) and ${mismatched} buys whose filing price didn't match the ticker's price (wrong or reused symbol).`, ``,
  `## Does the score pick better buys?`, ``,
  `Strong minus Routine, versus same-month insider buys: 1 month ${gap("month", "1 month")}; 3 months ${gap("month", "3 months")}; 6 months ${gap("month", "6 months")}.`, ``,
  `Cells: n · mean (winsorized 1%/99%) · median · share above the benchmark · t (overstates confidence: buys overlap in time).`, ``,
  ...BENCH.flatMap(([b, title]) => [`## ${title}`, ``, `| Group | ${HORIZONS.map(([l]) => l).join(" | ")} |`, `|---|${HORIZONS.map(() => "---").join("|")}|`,
    ...tables[b].map(([name, h]) => `| ${name} | ${HORIZONS.map(([l]) => cell(h[l])).join(" | ")} |`), ``]),
  `## Notes`, `- Prices: Yahoo daily closes, used only to compute these numbers (not published).`,
  `- Entry is the first close after the filing date (when the public could act), not the trade date.`,
  `- One event per filing and insider; several fills are combined. 10% owners who aren't officers or directors are excluded, as on the site.`,
  `- "First buy" uses only the history in this data set (${HIST} on), capped at 5 years, like the site's own lookback.`,
  `- Skipped quarters (not yet published): ${skippedQuarters.join(", ") || "none"}.`,
].join("\n");
await mkdir(OUT, { recursive: true });
await writeFile(`${OUT}/results.md`, md + "\n");
await writeFile(`${OUT}/results.json`, JSON.stringify({ generated: new Date().toISOString(), from: testStart, to: LAST, scored: tested.length, kept: rows.length, mismatched, tables }, null, 1));
console.log(md);
