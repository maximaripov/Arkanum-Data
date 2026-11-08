// The conclusions working paper no. 1 draws from its out-of-sample test (purchases filed since
// January 2026). The numbers in docs/backtest/oos-2026.json are refreshed every month by
// .github/workflows/research-refresh.yml; the sentences around them are written by hand. A
// refresh is only committed while every claim here still holds, so the paper's text can't
// contradict its own figures. If one fails, the owner gets an alert to rewrite section 4.5.

const SIX = "6 months";

/** Six-month median against the month's typical purchase, for one group (null if missing). */
export function median6(tables, group) {
  const row = tables.month.find(([g]) => g === group);
  return row ? row[1][SIX].median : null;
}

export const OOS_CLAIMS = [
  { id: "score", text: "Scores of 60+ did no better than scores under 40 (within 1 point)", holds: (m) => m("Strong (60+)") <= m("Routine (<40)") + 0.01 },
  { id: "topExec", text: "CEO, CFO, President or Chair purchases did worse than the month's typical purchase", holds: (m) => m("Top executive (CEO/CFO/President/Chair)") < 0 },
  { id: "big", text: "Purchases of $1M or more did worse than the month's typical purchase", holds: (m) => m("Value $1M+") < 0 },
  { id: "directors", text: "Purchases by directors did better than the month's typical purchase", holds: (m) => m("Director only") > 0 },
  { id: "planned", text: "Pre-planned purchases did worse than the month's typical purchase", holds: (m) => m("Pre-planned") < 0 },
];

/** Claims that no longer hold (an empty list means the paper's text is still true). */
export function failedClaims(results) {
  const m = (g) => {
    const v = median6(results.tables, g);
    if (v == null) throw new Error(`Out-of-sample results have no group "${g}"`);
    return v;
  };
  return OOS_CLAIMS.filter((c) => !c.holds(m));
}

/** Months covered, and a phrase like "January to September 2026", from results' from/to. */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function oosSpan({ from, to }) {
  const fy = +from.slice(0, 4), fm = +from.slice(5, 7);
  const ty = +to.slice(0, 4), tm = +to.slice(5) * 3; // "2026q3" → September
  const text = fy === ty ? `${MONTHS[fm - 1]} to ${MONTHS[tm - 1]} ${ty}` : `${MONTHS[fm - 1]} ${fy} to ${MONTHS[tm - 1]} ${ty}`;
  return { text, months: (ty - fy) * 12 + tm - fm + 1, years: fy === ty ? `${fy}` : `${fy}–${String(ty).slice(2)}` };
}
