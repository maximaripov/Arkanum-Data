// Sanity checks for the SEC fundamentals in screener.json. A few companies tag figures
// at the wrong scale in their XBRL (FedEx's net income came through as $4,092), which
// makes nonsense margins and payout ratios. Figures that can't be right are blanked
// rather than shown. Applied when the file is built (scripts/build-screener.mjs).

/** Net income that can't be right for a company of this size. */
export function implausibleNetIncome(rev, ni) {
  if (ni == null) return false;
  if (Math.abs(ni - Math.round(ni)) > 0.01) return true; // dollars and cents: a mis-scaled tag
  return rev != null && rev >= 1e8 && Math.abs(ni) < rev * 1e-4; // under 0.01% of $100M+ sales
}

/** Above this the payout ratio is a data error, not a generous dividend (REITs can pay 200%+). */
export const MAX_PAYOUT = 1000;

/** Blanks impossible figures in one row object (field names as in screener.json). */
export function cleanRow(r) {
  const out = { ...r };
  if (implausibleNetIncome(out.rev, out.ni)) { out.ni = null; out.margin = null; out.roe = null; out.payout = null; }
  if (out.payout != null && out.payout > MAX_PAYOUT) out.payout = null;
  return out;
}

/** Ranking by a ratio is only meaningful with real sales behind it. */
export const RANK_MIN_REVENUE = 1e7;
