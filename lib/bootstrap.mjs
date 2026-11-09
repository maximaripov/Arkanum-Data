// Uncertainty for a median when trades come in clusters: trades filed in the same month move
// with the same market, so they aren't independent. A month-block bootstrap resamples whole
// filing months (with replacement), pools their trades, and takes the median each time; the
// middle 90% of those medians is the range. Seeded, so a rerun on the same data gives the same
// range. Plain JS: used by the research scripts (scripts/backtest.mjs, sales-study.mjs).

/** Small seeded random number generator (mulberry32). */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** k-th smallest value (0-based) by quickselect; reorders the array. */
function select(a, k) {
  let lo = 0, hi = a.length - 1;
  while (lo < hi) {
    const p = a[(lo + hi) >> 1];
    let i = lo, j = hi;
    while (i <= j) { while (a[i] < p) i++; while (a[j] > p) j--; if (i <= j) { const t = a[i]; a[i] = a[j]; a[j] = t; i++; j--; } }
    if (k <= j) hi = j; else if (k >= i) lo = i; else return a[k];
  }
  return a[k];
}
/** Median as the site's research defines it: the value at floor(n/2) of the sorted list. */
const medianOf = (a) => (a.length ? select(a, Math.floor(a.length / 2)) : null);

/**
 * 90% range for the median of `values`, resampling by `months` (same length; e.g. "2026-03").
 * @returns {{ lo: number, hi: number, months: number } | null}
 */
export function monthBootstrap(values, months, { reps = 400, seed = 1 } = {}) {
  const by = new Map();
  values.forEach((v, i) => { if (v == null) return; const m = months[i]; if (!by.has(m)) by.set(m, []); by.get(m).push(v); });
  const blocks = [...by.values()];
  if (blocks.length < 2) return null; // one month can't show month-to-month variation
  const r = rng(seed), meds = [];
  for (let k = 0; k < reps; k++) {
    const pool = [];
    for (let j = 0; j < blocks.length; j++) { const b = blocks[Math.floor(r() * blocks.length)]; for (const v of b) pool.push(v); }
    meds.push(medianOf(pool));
  }
  meds.sort((a, b) => a - b);
  return { lo: meds[Math.floor(reps * 0.05)], hi: meds[Math.ceil(reps * 0.95) - 1], months: blocks.length };
}
