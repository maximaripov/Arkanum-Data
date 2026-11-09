// Working paper no. 3: what the filing delay costs someone who follows insider trades.
// For each trade: the stock's move (minus the S&P 500's) from the trade-date close to the
// first close after the filing (the insider's head start), and six months measured from
// each of those two starting points (the insider's result and a follower's result).
import { monthBootstrap } from "../../lib/bootstrap.mjs";

const H6 = 126; // trading days in six months, as in the studies

/** Index of the first close on or after (or, with after, strictly after) a date. */
const at = (series, date, after = false) => series.findIndex(([d]) => (after ? d > date : d >= date));
/** Return over [i, j] in a series, or null. */
const move = (s, i, j) => (i >= 0 && j >= 0 && j < s.length && j > i ? s[j][1] / s[i][1] - 1 : i === j && i >= 0 ? 0 : null);
/** The S&P 500's return between two dates (both looked up in its own series). */
function spyMove(spy, d0, d1) {
  const i = at(spy, d0), j = at(spy, d1);
  return i < 0 || j < 0 ? null : move(spy, i, j);
}

/** Delay fields for one trade, or null when prices don't cover it. Excess returns are vs SPY. */
export function delayFields(s, spy, e) {
  const i0 = at(s, e.date), j = at(s, e.filed, true);
  if (i0 < 0 || j < 0 || j < i0) return null;
  // History that starts well after the trade belongs to a later listing under the same symbol.
  if (Date.parse(s[i0][0]) - Date.parse(e.date) > 10 * 86_400_000) return null;
  const ex = (k0, k1) => { const a = move(s, k0, k1), b = k1 < s.length ? spyMove(spy, s[k0][0], s[k1][0]) : null; return a == null || b == null ? null : a - b; };
  return {
    lag: j - i0, // trading days from the trade-date close to the first close a reader could act on
    pre: ex(i0, j), // head start: the move the public couldn't get
    ins6: i0 + H6 < s.length ? ex(i0, i0 + H6) : null, // insider's six months
    fol6: j + H6 < s.length ? ex(j, j + H6) : null, // follower's six months
  };
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
function stat(rows, get) {
  const kept = rows.filter((r) => r.delay && get(r.delay) != null);
  const xs = kept.map((r) => get(r.delay));
  if (xs.length < 20) return { n: xs.length };
  const ci = monthBootstrap(xs, kept.map((r) => r.filed.slice(0, 7)));
  return { n: xs.length, median: median(xs), up: xs.filter((x) => x > 0).length / xs.length, ...(ci ? { lo: ci.lo, hi: ci.hi, months: ci.months } : {}) };
}

const LAGS = [["Filed the next trading day or sooner", (l) => l <= 1], ["2 trading days", (l) => l === 2], ["3–5 trading days", (l) => l >= 3 && l <= 5], ["Late: 6+ trading days", (l) => l >= 6]];

/** Tables for the paper: per group, then per filing delay (all trades). */
export function delayTables(rows, groups) {
  const one = (list) => {
    const lags = list.filter((r) => r.delay).map((r) => r.delay.lag).sort((a, b) => a - b);
    return {
      n: lags.length, lagMedian: median(lags), lagP90: lags.length ? lags[Math.floor(lags.length * 0.9)] : null,
      pre: stat(list, (d) => d.pre), ins6: stat(list, (d) => d.ins6), fol6: stat(list, (d) => d.fol6),
      gap: stat(list, (d) => (d.ins6 == null || d.fol6 == null ? null : d.ins6 - d.fol6)),
    };
  };
  return {
    groups: Object.entries(groups).map(([name, f]) => [name, one(rows.filter(f))]),
    lags: LAGS.map(([name, f]) => [name, one(rows.filter((r) => r.delay && f(r.delay.lag)))]),
  };
}
