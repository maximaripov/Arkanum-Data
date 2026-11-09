// The conclusions each working paper draws from its out-of-sample section (filings since
// January 2026). The numbers in each paper's data file are refreshed every month by
// .github/workflows/research-refresh.yml; the sentences around them are written by hand. A
// refresh is committed only while every claim for that paper still holds, so a paper's text
// can't contradict its own figures. If one fails, the owner gets an alert to rewrite it.
// A new paper with a refreshed section adds an entry to PAPERS and a job to the workflow.

const SIX = "6 months";

/** Filing months with six-month returns needed before 2026 can confirm or overturn a finding. */
export const MIN_MONTHS = 12;

/** Six-month median against the month's typical trade, for one group (null if missing or under 20 trades). */
export function median6(tables, group) {
  const row = tables.month.find(([g]) => g === group);
  return row?.[1][SIX]?.median ?? null;
}

export const PAPERS = {
  buys: {
    title: "Working paper no. 1 (insider purchases), section 4.5",
    file: "docs/backtest/oos-2026.json",
    claims: [
      { id: "score", text: "Scores of 60+ did no better than scores under 40 (within 1 point)", holds: (m) => m("Strong (60+)") <= m("Routine (<40)") + 0.01 },
      { id: "topExec", text: "CEO, CFO, President or Chair purchases did worse than the month's typical purchase", holds: (m) => m("Top executive (CEO/CFO/President/Chair)") < 0 },
      { id: "big", text: "Purchases of $1M or more did worse than the month's typical purchase", holds: (m) => m("Value $1M+") < 0 },
      { id: "directors", text: "Purchases by directors did better than the month's typical purchase", holds: (m) => m("Director only") > 0 },
      { id: "planned", text: "Pre-planned purchases did worse than the month's typical purchase", holds: (m) => m("Pre-planned") < 0 },
    ],
  },
  sales: {
    title: "Working paper no. 2 (insider sales), section 4.5",
    file: "docs/backtest/sales-2026.json",
    // Section 4.5's sentences about 2026 are written for each outcome (see NotableOos in the
    // paper), so no fixed claim can go stale; the refresh still stops on a shrinking sample.
    claims: [],
  },
};

// Papers no. 4 and 5 rerun their whole test each month on a growing (House: rolling two-year)
// sample. Their sentences that don't branch on the numbers are checked here, against the
// six-month medians and 90% ranges in their data files.
const six = (h) => h?.[SIX] ?? {};
const notAbove = (s) => s.lo == null || s.lo <= 0; // 90% range reaches zero or lies below it
const overlap = (a, b) => a.lo != null && b.lo != null && a.lo <= b.hi && b.lo <= a.hi;
const group = (rows, name) => { const r = rows.find(([g]) => g === name); if (!r) throw new Error(`No result for "${name}"`); return r[1]; };

PAPERS.house = {
  title: "Working paper no. 4 (House members' trades)",
  file: "docs/backtest/congress.json",
  size: (r) => r.kept,
  span: (r) => `trades from ${r.tradedFrom}, prices through ${r.pricesThrough}`,
  shrinkTolerance: 0.8, // the Congress file keeps a rolling two years, so trades roll off as new ones come in
  check: (r) => {
    const b = group(r.buys, "All"), s = group(r.sales, "All");
    return [
      { text: "Purchases did no better than sales (their 90% ranges overlap)", holds: () => overlap(six(b.followerEq), six(s.followerEq)) || six(b.followerEq).median <= six(s.followerEq).median },
      { text: "Followers' purchases did not clearly beat the equal-weighted S&P 500", holds: () => notAbove(six(b.followerEq)) },
      { text: "Members' own purchases did not clearly beat the equal-weighted S&P 500", holds: () => notAbove(six(b.memberEq)) },
      { text: "Members' own purchases did no better than the stocks they sold (from the trade date)", holds: () => overlap(six(b.memberEq), six(s.memberEq)) || six(b.memberEq).median <= six(s.memberEq).median },
      { text: "Copying purchases did not clearly beat the S&P 500", holds: () => notAbove(six(b.follower)) },
      { text: "Followers did not miss a run-up before disclosure (head start under half a point)", holds: () => (b.head.median ?? 0) < 0.005 },
      { text: "Against the ordinary S&P 500 both purchases and sales look worse than against the equal-weighted one", holds: () => six(b.follower).median < six(b.followerEq).median && six(s.follower).median < six(s.followerEq).median },
    ];
  },
};

PAPERS.funds = {
  title: "Working paper no. 5 (copying 13F funds)",
  file: "docs/backtest/funds.json",
  size: (r) => r.priced,
  span: (r) => `${r.reports} reports since ${r.firstPeriod}, prices through ${r.pricesThrough}`,
  sameStart: (old, r) => old.firstPeriod === r.firstPeriod,
  check: (r) => {
    const eq = r.moveTableEq, bought = six(group(eq, "New or added")), sold = six(group(eq, "Sold entirely")), big = six(group(eq, "New positions, 1%+ of the fund"));
    return [
      { text: "What the funds bought did no better than what they sold (their 90% ranges overlap)", holds: () => overlap(bought, sold) || bought.median <= sold.median },
      { text: "New and added positions carried no clear edge over the equal-weighted S&P 500", holds: () => notAbove(bought) && notAbove(big) },
      { text: "Copying the top ten did not clearly beat the equal-weighted S&P 500", holds: () => notAbove(r.clone.allEq) },
      { text: "Copying the top ten did not clearly beat the S&P 500", holds: () => notAbove(r.clone.all) },
      { text: "Copying different funds gave widely different results (best and worst over 30 points apart, against the equal-weighted S&P 500)", holds: () => { const c = r.clone.byFund.map(([, x]) => x.compoundEq); return Math.max(...c) - Math.min(...c) > 0.3 && Math.max(...c) > 0 && Math.min(...c) < 0; } },
    ];
  },
};

/** Claims of one paper that no longer hold (empty: the paper's text is still true). */
export function failedClaims(paper, results) {
  if (PAPERS[paper].check) return PAPERS[paper].check(results).filter((c) => !c.holds());
  const m = (g) => {
    const v = median6(results.tables, g);
    if (v == null) throw new Error(`No six-month result for "${g}"`);
    return v;
  };
  return PAPERS[paper].claims.filter((c) => !c.holds(m));
}

/** Months covered, and a phrase like "January to September 2026", from results' from/to. */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function oosSpan({ from, to }) {
  const fy = +from.slice(0, 4), fm = +from.slice(5, 7);
  const ty = +to.slice(0, 4), tm = +to.slice(5) * 3; // "2026q3" → September
  const text = fy === ty ? `${MONTHS[fm - 1]} to ${MONTHS[tm - 1]} ${ty}` : `${MONTHS[fm - 1]} ${fy} to ${MONTHS[tm - 1]} ${ty}`;
  return { text, months: (ty - fy) * 12 + tm - fm + 1, years: fy === ty ? `${fy}` : `${fy}–${String(ty).slice(2)}` };
}
