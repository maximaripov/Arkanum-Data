// The research's key findings in one sentence each, with their numbers, for the homepage and
// /research. Computed from the same results the papers use (lib/research.ts), so a refresh of
// the data can't leave a finding saying something its paper no longer shows. Server-only.
import { stat, saleStat, p } from "./research";
import { oosState } from "@/app/research/insider-sales/paper";

export type Finding = { id: string; head: string; body: string; figure: string; figureNote: string; href: string };

const signed = (x: number) => { const v = p(x); return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`; };
const six = (g: string) => stat("month", g, "6 months");
const sale6 = (g: string) => saleStat("month", g, "6 months");

// "vs other insider buys" is not the market: it is the typical insider purchase filed that month.
const VS_BUYS = "vs other insider buys that month, not the market";

export function findings(): Finding[] {
  const strong = six("Strong (60+)"), routine = six("Routine (<40)");
  const top = six("Top executive (CEO/CFO/President/Chair)"), big = six("Value $1M+");
  const cheap = six("Price under $5"), cheapSale = sale6("Price under $5");
  const planned = six("Pre-planned");
  const notable = sale6("Notable (site rule)");
  const spy = stat("spy", "All officer/director buys", "6 months");
  const better = p(strong.median) > p(routine.median) + 1;
  const n = (x: number) => x.toLocaleString("en-US");
  return [
    {
      id: "cheap", href: "/research/insider-buys/results",
      head: "Stocks under $5 fell, whoever traded",
      body: `Buys of stocks under $5 had a six-month median of ${signed(cheap.median)} against other insider buys that month (${n(cheap.n)} buys), and sales of them ${signed(cheapSale.median)} against other sales: it's about cheap stocks, not what insiders know.`,
      figure: signed(cheap.median), figureNote: `buys of stocks under $5, 6 months, ${VS_BUYS}`,
    },
    {
      id: "size", href: "/research/insider-buys/results",
      head: "$1M+ buys and CEO buys trailed",
      body: `Purchases of $1 million or more had a median of ${signed(big.median)} (${n(big.n)} buys), and purchases by a CEO, CFO, President or Chair ${signed(top.median)}, against other insider buys that month.`,
      figure: signed(big.median), figureNote: `$1M+ buys, 6 months, ${VS_BUYS}`,
    },
    {
      id: "planned", href: "/research/insider-buys/results",
      head: "Pre-planned buys did worst",
      body: `Purchases made under a pre-set trading plan had a median of ${signed(planned.median)} against other insider buys that month (${n(planned.n)} buys), the weakest group tested.`,
      figure: signed(planned.median), figureNote: `pre-planned buys, 6 months, ${VS_BUYS}`,
    },
    {
      id: "market", href: "/research/insider-buys/market",
      head: "Insider buys trailed the S&P 500",
      body: `Over six months the median insider purchase did ${signed(spy.median)} against the S&P 500 in 2023–25, with ${p(spy.hit).toFixed(0)}% beating it.`,
      figure: signed(spy.median), figureNote: "all insider buys, 6 months, vs the S&P 500",
    },
    {
      id: "unusual", href: "/research/insider-buys/results",
      head: better ? "The most unusual insider buys did better" : "Unusual doesn't mean better",
      body: `Insider buys we rate most unusual (60+ of 100) had a six-month median of ${signed(strong.median)} against other insider buys that month; routine ones had ${signed(routine.median)}.`,
      figure: signed(strong.median), figureNote: `most unusual buys, 6 months, ${VS_BUYS}`,
    },
    {
      id: "sales", href: "/research/insider-sales",
      head: oosState() === "warns" ? "Sales weren't a warning, until 2026" : "Insider sales weren't a warning",
      body: `Large unplanned sales were followed by a median of ${signed(notable.median)} against other insider sales that month in 2023–25.${oosState() === "warns" ? " Sales filed since 2026 have been followed by clearly worse returns." : ""}`,
      figure: signed(notable.median), figureNote: "large unplanned sales, 6 months, vs other insider sales that month",
    },
  ];
}
