// The research lab: insider purchases as a compact table, filtered by a reader's rules, with
// the same statistics the papers use (median vs the S&P 500, 90% range from a month-block
// bootstrap, share that beat it). Shared by scripts/backtest.mjs (writes the table) and the
// /research/lab page (reads it). Returns are relative to the S&P 500 only; no prices are kept.
import { monthBootstrap } from "./bootstrap.mjs";

export const ROLE = { officer: 0, director: 1, top: 2, ceo: 3 };
export const HORIZONS = [["m1", "1 month"], ["m3", "3 months"], ["m6", "6 months"]];

/** One purchase as stored: filing date, role code, insiders buying, value, pre-planned,
 * market cap ($M, -1 unknown), under $5, and excess returns vs the S&P 500 in basis points. */
export function encode(rows, meta) {
  const cols = { f: [], r: [], i: [], v: [], p: [], c: [], u: [], m1: [], m3: [], m6: [] };
  const bp = (x) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10000));
  for (const x of rows) {
    cols.f.push(x.filed); cols.r.push(x.role); cols.i.push(x.insiders); cols.v.push(Math.round(x.value));
    cols.p.push(x.planned ? 1 : 0); cols.c.push(x.mcap == null ? -1 : Math.round(x.mcap / 1e6)); cols.u.push(x.cheap ? 1 : 0);
    cols.m1.push(bp(x.m1)); cols.m3.push(bp(x.m3)); cols.m6.push(bp(x.m6));
  }
  return { v: 1, ...meta, n: rows.length, cols };
}

/** Back to one object per purchase. */
export function decode(file) {
  const c = file.cols, out = new Array(c.f.length);
  for (let k = 0; k < c.f.length; k++) out[k] = { f: c.f[k], r: c.r[k], i: c.i[k], v: c.v[k], p: c.p[k], c: c.c[k], u: c.u[k], m1: c.m1[k], m3: c.m3[k], m6: c.m6[k] };
  return out;
}

/** Rules a reader can set; any left out don't filter. */
export const DEFAULT_RULES = { ceoOnly: false, topOnly: false, minInsiders: 1, minValue: 0, noPlanned: false, minCapM: 0, noUnder5: false };

export function applyRules(rows, rules) {
  const r = { ...DEFAULT_RULES, ...rules };
  return rows.filter((x) => (!r.ceoOnly || x.r === ROLE.ceo) && (!r.topOnly || x.r >= ROLE.top) && x.i >= r.minInsiders && x.v >= r.minValue
    && (!r.noPlanned || !x.p) && (!r.minCapM || (x.c >= 0 && x.c >= r.minCapM)) && (!r.noUnder5 || !x.u));
}

/** Median excess return vs the S&P 500 at one horizon, its 90% range, share that beat the index. */
export function summarize(rows, h) {
  const ok = rows.filter((x) => x[h] != null);
  if (!ok.length) return null;
  const vals = ok.map((x) => x[h] / 10000), months = ok.map((x) => x.f.slice(0, 7));
  const s = [...vals].sort((a, b) => a - b);
  const range = monthBootstrap(vals, months);
  return { n: ok.length, months: range?.months ?? new Set(months).size, med: s[Math.floor(s.length / 2)], lo: range?.lo ?? null, hi: range?.hi ?? null, beat: vals.filter((v) => v > 0).length / vals.length };
}

/** The verdict wording the site uses: only "beat" or "trailed" when the range excludes zero. */
export const verdict = (s) => (!s || s.lo == null ? "too few" : s.lo > 0 ? "beat" : s.hi < 0 ? "trailed" : "no clear edge");
