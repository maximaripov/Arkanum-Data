// Working paper no. 4: do House members' stock trades beat the market, for the member and
// for someone who follows the disclosures? Reads the site's own Congress file
// (public/data/congress.json, from the House Clerk's Periodic Transaction Reports), prices
// from lib/returns.mjs (Yahoo, Tiingo fallback). Read-only; prints JSON between
// RESULT_JSON_START and RESULT_JSON_END, or writes it to the path given as the first argument.
//   node scripts/diagnose/congress-study.mjs [out.json]
import { readFile, writeFile } from "node:fs/promises";
import { closesFor, dailyCloses } from "../../lib/returns.mjs";
import { monthBootstrap } from "../../lib/bootstrap.mjs";

const OUT = process.argv[2];
const HORIZONS = [["1 month", 21], ["3 months", 63], ["6 months", 126]];
const { trades: all, updated } = JSON.parse(await readFile(new URL("../../public/data/congress.json", import.meta.url), "utf8"));

// Stocks only, buys and sales, with a ticker and a clear trade date; one per report line.
const seen = new Set();
const trades = all.filter((t) => {
  if (!t.ticker || !(t.type === "P" || t.type === "S") || (t.assetType && t.assetType !== "ST") || !t.date || t.dateUnclear) return false;
  const k = [t.doc, t.member, t.ticker, t.date, t.type, t.owner, t.min].join("|");
  if (seen.has(k)) return false;
  seen.add(k); return true;
});
const from = trades.reduce((a, t) => (t.date < a ? t.date : a), trades[0].date);
console.log(`${trades.length} stock trades (${all.length} lines in the file), traded ${from} on`);

const spy = await dailyCloses("SPY", from);
if (!spy) throw new Error("No S&P 500 prices");
const px = await closesFor(trades.map((t) => t.ticker), from, { pause: 100 });
console.log(`prices for ${px.size} of ${new Set(trades.map((t) => t.ticker)).size} stocks, through ${spy.at(-1)[0]}`);

const at = (s, date, after = false) => s.findIndex(([d]) => (after ? d > date : d >= date));
const spyAt = new Map(spy.map(([d], i) => [d, i]));
/** Stock minus S&P 500 from index i for h trading days, or null. */
function excess(s, i, h) {
  if (i < 0 || i + h >= s.length) return null;
  const a = s[i + h][1] / s[i][1] - 1;
  const si = spyAt.get(s[i][0]), sj = spyAt.get(s[i + h][0]);
  if (si == null || sj == null) return null;
  return a - (spy[sj][1] / spy[si][1] - 1);
}

const rows = [];
let noPrice = 0, laterListing = 0;
for (const t of trades) {
  const s = px.get(t.ticker);
  if (!s) { noPrice++; continue; }
  const i0 = at(s, t.date), j = at(s, t.filed, true);
  if (i0 < 0 || j < 0) { noPrice++; continue; }
  if (Date.parse(s[i0][0]) - Date.parse(t.date) > 10 * 86_400_000) { laterListing++; continue; }
  const member = {}, follower = {};
  for (const [l, h] of HORIZONS) { member[l] = excess(s, i0, h); follower[l] = excess(s, j, h); }
  const lagDays = Math.round((Date.parse(t.filed) - Date.parse(t.date)) / 86_400_000);
  rows.push({ ...t, mid: t.min != null && t.max != null ? (t.min + t.max) / 2 : t.min, lagDays, head: excess(s, i0, Math.max(0, j - i0)) ?? (j === i0 ? 0 : null), member, follower });
}
console.log(`${rows.length} trades kept; ${noPrice} without prices, ${laterListing} whose ticker now belongs to a later listing`);

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
function stat(list, get) {
  const kept = list.filter((r) => get(r) != null), xs = kept.map(get);
  if (xs.length < 20) return { n: xs.length };
  const out = { n: xs.length, median: median(xs), up: xs.filter((x) => x > 0).length / xs.length };
  const ci = monthBootstrap(xs, kept.map((r) => r.filed.slice(0, 7)));
  return ci ? { ...out, lo: ci.lo, hi: ci.hi, months: ci.months } : out;
}
/** Dollar-weighted mean of a value, by the midpoint of each trade's reported range. */
function weighted(list, get) {
  const kept = list.filter((r) => get(r) != null && r.mid);
  const w = kept.reduce((a, r) => a + r.mid, 0);
  return kept.length < 20 ? null : kept.reduce((a, r) => a + get(r) * r.mid, 0) / w;
}

const party = (p) => (r) => r.party === p;
const GROUPS = {
  "All": () => true,
  "Democrats": party("Democrat"), "Republicans": party("Republican"),
  "$1K–15K": (r) => r.min != null && r.min < 15001, "$15K–50K": (r) => r.min === 15001, "$50K+": (r) => r.min != null && r.min >= 50001,
  "The member's own account": (r) => r.owner === "Self", "Spouse, joint or child": (r) => r.owner !== "Self",
  "Disclosed within 30 days": (r) => r.lagDays <= 30, "Disclosed after 30 days": (r) => r.lagDays > 30, "Disclosed after the 45-day deadline": (r) => r.lagDays > 45,
};
// The ten members with the most trades in the data, together, against everyone else.
const counts = new Map(); for (const r of rows) counts.set(r.member, (counts.get(r.member) ?? 0) + 1);
const top10 = new Set([...counts].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([m]) => m));
GROUPS["The 10 most active traders"] = (r) => top10.has(r.member);
GROUPS["Everyone else"] = (r) => !top10.has(r.member);

const side = (type) => Object.entries(GROUPS).map(([name, f]) => {
  const g = rows.filter((r) => r.type === type && f(r));
  return [name, {
    n: g.length,
    member: Object.fromEntries(HORIZONS.map(([l]) => [l, stat(g, (r) => r.member[l])])),
    follower: Object.fromEntries(HORIZONS.map(([l]) => [l, stat(g, (r) => r.follower[l])])),
    head: stat(g, (r) => r.head),
    weighted6: { member: weighted(g, (r) => r.member["6 months"]), follower: weighted(g, (r) => r.follower["6 months"]) },
  }];
});
const lags = rows.map((r) => r.lagDays).sort((a, b) => a - b);
const out = {
  generated: new Date().toISOString(), dataUpdated: updated, tradedFrom: from, pricesThrough: spy.at(-1)[0],
  trades: trades.length, kept: rows.length, noPrice, laterListing, members: counts.size, top10: [...top10],
  lagDays: { median: median(lags), p90: lags[Math.floor(lags.length * 0.9)], over45: lags.filter((x) => x > 45).length / lags.length },
  buys: side("P"), sales: side("S"),
};
if (OUT) await writeFile(OUT, JSON.stringify(out, null, 1));
console.log("RESULT_JSON_START"); console.log(JSON.stringify(out)); console.log("RESULT_JSON_END");
