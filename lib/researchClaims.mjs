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

/** Claims of one paper that no longer hold (empty: the paper's text is still true). */
export function failedClaims(paper, results) {
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
