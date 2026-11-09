// "Do insider stock sales predict anything?" as a four-page working paper (no. 2). Every
// number comes from the sales study output (docs/backtest/sales.json) via lib/research.ts.
import Link from "next/link";
import type { Metadata } from "next";
import { Paper, type PaperPage } from "@/components/research/Paper";
import { DivergingBars, DotPlot, ColumnPanel, Figure } from "@/components/research/Charts";
import { BENCH, HORIZONS, SALES, SALES_OOS, p, saleGroups, saleName, saleOosStat, saleStat, type Bench } from "@/lib/research";

export const BASE = "/research/insider-sales";
export const TITLE = "Do insider stock sales predict anything? A test of 84,000 sales";
const DATE = "November 2026";
export const PAGES: PaperPage[] = [
  { slug: "", title: "Abstract and introduction" },
  { slug: "method", title: "Data and method" },
  { slug: "results", title: "Results" },
  { slug: "discussion", title: "Discussion, appendix and references" },
];
const DESCRIPTIONS = [
  "Arkanum tested 84,158 open-market sales by company officers and directors from 2023 to 2025. Sales flagged as notable were followed by the same returns as any other sale.",
  "How the 84,158 sales were chosen, how Arkanum's notable-sale rule works, and how returns were measured against other sales, small-company stocks and the S&P 500.",
  "Notable sales, large sales, top-executive sales and sales of a big share of a stake were followed by much the same returns as other sales. Charts and numbers at 1, 3 and 6 months.",
  "What the results mean, what Arkanum's notable-sale label does and doesn't say, the limits of the test, full tables for all 20 groups and references.",
];

export function paperMetadata(i: number): Metadata {
  const url = PAGES[i].slug ? `${BASE}/${PAGES[i].slug}` : BASE;
  const title = i === 0 ? TITLE : `${PAGES[i].title} · ${TITLE}`;
  return {
    title, description: DESCRIPTIONS[i],
    alternates: { canonical: url },
    openGraph: { title: `${title} · Arkanum Data`, description: DESCRIPTIONS[i], url, type: "article", images: "/opengraph-image" },
  };
}

const six = (g: string) => saleStat("month", g, "6 months");
const signed = (x: number) => { const v = p(x); return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`; };
const n = (x: number) => x.toLocaleString("en-US");
const bars = (gs: string[]) => gs.map((g) => ({ label: saleName(g), value: p(six(g).median), n: six(g).n })).sort((a, b) => a.value - b.value);
const dots = (gs: string[]) => gs.map((g) => ({ label: saleName(g), value: p(six(g).below), n: six(g).n }));
const HEADLINE = ["All officer/director sales", "Notable (site rule)", "Not notable"];
const TRAITS = ["Price under $5", "Value under $100K", "Top exec, not pre-planned", "Sold under 20%", "Not pre-planned", "Director only", "Top executive", "Alone",
  "3+ insiders selling", "Sold 50%+ of stake", "Sold entire stake", "Price $5+", "Pre-planned (10b5-1)", "Sold 20–49% of stake", "Value $1M+"];

function Page0() {
  const notable = six("Notable (site rule)"), all = six("All officer/director sales");
  return (
    <>
      <section className="paper-abstract">
        <h2>Abstract</h2>
        <p>Insider sales are far more common than insider purchases, and much harder to read: executives sell to diversify, pay taxes and fund their lives, often on a schedule set months in advance. Websites, Arkanum included, therefore try to pick out the sales that might matter: a top executive selling a large share of their stake, outside a pre-planned trading plan. We tested {n(SALES.kept)} open-market sales by officers and directors filed with the SEC from January 2023 to December 2025, measuring each stock&apos;s return from the first close after the sale became public. Sales that met Arkanum&apos;s &ldquo;notable&rdquo; rule were followed by the same returns as other sales filed the same month: a median of {signed(notable.median)} over six months, with {p(notable.below).toFixed(0)}% doing worse. No other trait (size, role, share of the stake sold, several insiders selling) moved the median by more than two points; the one large effect, cheap stocks falling after insiders sold, is about cheap stocks rather than the sales. <OosAbstract /></p>
        <p className="paper-keywords"><strong>Keywords:</strong> insider trading, insider sales, Form 4, Rule 10b5-1, event study</p>
      </section>

      <h2>1. Introduction</h2>
      <p>When a company&apos;s executives buy its shares with their own money, there are few reasons to do it other than expecting the price to rise. Sales are different. Most of an executive&apos;s pay often arrives as stock, so selling is how they diversify, cover the tax on vesting shares, buy a house or give to charity. Many sales are also set up in advance under Rule 10b5-1 trading plans, precisely so that they can&apos;t be timed on inside information. Academic work has accordingly found insider sales much less informative than purchases (Lakonishok and Lee, 2001; Jeng, Metrick and Zeckhauser, 2003), with any information concentrated in particular kinds of trades (Cohen, Malloy and Pomorski, 2012).</p>
      <p>Arkanum lists every large sale by an executive or director and labels a subset &ldquo;notable&rdquo;: sales that are not pre-planned, not by an investment fund, and either by a top executive selling at least a quarter of their stake or $1 million or more, or by anyone selling at least half of what they hold. This paper asks whether that label, or any of the traits behind it, picks out sales that were followed by worse returns.</p>
      <p>It does not. Figure 1 shows the median six-month result for all sales and for notable and other sales, each against the typical sale filed the same month: all three are at or very near zero.</p>
      <Figure n={1} title="Median six-month return after the sale, against the month's typical insider sale." note={`${n(all.n)} sales. 0% means the same as the median insider sale filed that month; a negative number means the stock did worse after the sale. Source: SEC Form 4 data; Arkanum calculations.`}>
        <DivergingBars rows={bars(HEADLINE)} label="Median 6-month return vs the month's typical insider sale" unit="sales" />
      </Figure>
      <p>Page 2 describes the data and method; page 3 the results by trait and against the market; page 4 what the results mean, the limits of the test, the full tables and references. A companion paper tests insider purchases: <Link href="/research/insider-buys">Do insider stock purchases beat the market?</Link></p>
    </>
  );
}

function Page1() {
  return (
    <>
      <h2>2. Data</h2>
      <p>Sales come from the SEC&apos;s quarterly insider transaction data sets: every open-market sale (transaction code S) on an original Form 4 by an officer or director, filed from January 2023 to December 2025, one event per filing and insider (several fills combined). Sales by 10% owners who are neither officers nor directors, mostly investment funds, are excluded, as on Arkanum&apos;s pages. To count how many insiders were selling the same stock, filings were read back to 2022.</p>
      <table className="ttable fit paper-table">
        <caption><strong>Table 1.</strong> Sample</caption>
        <tbody>
          <tr><td>Officer and director sales filed 2023 to 2025</td><td className="mono r">{n(SALES.tested)}</td></tr>
          <tr><td>Dropped: stock has no price history ({n(SALES.noPrices)} of {n(SALES.symbols)} stocks; mostly delisted or renamed)</td><td className="mono r">{n(SALES.tested - SALES.kept - SALES.mismatched)}</td></tr>
          <tr><td>Dropped: filing price doesn&apos;t match the ticker&apos;s price (wrong or reused symbol)</td><td className="mono r">{n(SALES.mismatched)}</td></tr>
          <tr><td><strong>Sales kept</strong></td><td className="mono r"><strong>{n(SALES.kept)}</strong></td></tr>
        </tbody>
      </table>

      <h2>3. Method</h2>
      <h3>3.1 The notable-sale rule</h3>
      <p>Each sale was labelled with exactly the rule Arkanum uses on its pages.</p>
      <table className="ttable fit paper-table">
        <caption><strong>Table 2.</strong> When a sale counts as notable (on the site this label now reads &ldquo;Large unplanned sale&rdquo;)</caption>
        <thead><tr><th>Condition</th><th>Rule</th></tr></thead>
        <tbody>
          <tr><td>Not pre-planned</td><td>Not made under a Rule 10b5-1 trading plan</td></tr>
          <tr><td>Not a fund</td><td>The seller isn&apos;t a 10% owner or an investment vehicle (LLC, partnership, trust)</td></tr>
          <tr><td>And either</td><td>A CEO, CFO, President or Chair selling at least 25% of their stake, or $1 million or more</td></tr>
          <tr><td>Or</td><td>Anyone selling at least 50% of their stake</td></tr>
        </tbody>
      </table>
      <h3>3.2 Returns and benchmarks</h3>
      <p>Returns run from the first closing price <em>after the filing date</em>, when the public could act, to 1, 3 and 6 months later. As in the companion paper on purchases, the main benchmark is the median return of all insider sales filed in the same calendar month, which removes the market&apos;s moves and the timing and leaves only the question of whether a trait matters. Returns against small-company stocks (IWM) and the S&amp;P 500 (SPY) are also reported.</p>
      <h3>3.3 Reading the numbers</h3>
      <p>For a sale, a <strong>negative</strong> number means the stock did worse than the benchmark after the sale, that is, the sale worked as a warning. The &ldquo;share that did worse&rdquo; is the proportion of sales followed by a return below the benchmark; 50% is a coin flip. Means are winsorized at the 1st and 99th percentiles. t-statistics are in the published results file; they overstate confidence because sales overlap in time and cluster in the same stocks, so this paper relies on medians and shares.</p>
    </>
  );
}

function Page2() {
  const notable = six("Notable (site rule)"), not = six("Not notable"), big = six("Value $1M+"), top = six("Top exec, not pre-planned");
  const half = six("Sold 50%+ of stake"), entire = six("Sold entire stake"), penny = six("Price under $5"), five = six("Price $5+");
  const plan = six("Pre-planned (10b5-1)"), unplan = six("Not pre-planned"), small = six("Value under $100K");
  const g = "All officer/director sales";
  const lim = Math.ceil(Math.max(...(["month", "iwm", "spy"] as Bench[]).flatMap((b) => HORIZONS.map((h) => Math.abs(p(saleStat(b, g, h).median)))))) + 1;
  const iwm6 = saleStat("iwm", g, "6 months"), spy6 = saleStat("spy", g, "6 months");
  return (
    <>
      <h2>4. Results</h2>
      <h3>4.1 The notable-sale rule</h3>
      <p>Six months after the filing, notable sales had a median of {signed(notable.median)} against the month&apos;s typical sale and {p(notable.below).toFixed(0)}% did worse; other sales had {signed(not.median)} and {p(not.below).toFixed(0)}%. The same held at one and three months (appendix, Table A1). The rule picks out sales that look more significant, but they were not followed by worse returns.</p>

      <h3>4.2 The traits behind it</h3>
      <p>Figure 2 breaks sales down by the traits the rule and the usual advice rely on. Most sit within a point of zero. The exception runs the opposite way to the usual advice: small sales, under $100,000, did slightly worse ({signed(small.median)}), while sales of $1 million or more were followed by slightly <em>better</em> returns ({signed(big.median)}), and a top executive selling outside a trading plan only slightly worse ({signed(top.median)}). Selling half or more of a stake ({signed(half.median)}) or all of it ({signed(entire.median)}) made no difference. Pre-planned and unplanned sales ({signed(plan.median)} and {signed(unplan.median)}) were also alike, which matters: if insiders were timing unplanned sales on bad news, those should have done clearly worse.</p>
      <Figure n={2} title="Median six-month return after the sale by trait, against the month's typical insider sale." note="Negative: the stock did worse after the sale. Groups overlap: a sale can be a CEO's, $1M+ and half a stake at once.">
        <DivergingBars rows={bars(TRAITS)} label="Median 6-month return vs the month's typical insider sale" unit="sales" />
      </Figure>
      <Figure n={3} title="Share of sales followed by a worse six-month return than the month's typical insider sale, by trait." note="50% = a coin flip. Above 50%: more of these sales were followed by worse returns.">
        <DotPlot rows={dots(TRAITS)} verb="did worse" invert label="Share of sales followed by a worse return" unit="sales" />
      </Figure>

      <h3>4.3 Cheap stocks fell, whoever sold</h3>
      <p>The largest effect in the data is not about the sale. Stocks under $5 had a median six-month result of {signed(penny.median)} after an insider sale, and {p(penny.below).toFixed(0)}% did worse, yet their mean was {signed(penny.mean)}: most fell, and a few soared. The companion paper found the same pattern after insider <em>purchases</em> of cheap stocks, so it describes cheap stocks, not what insiders know.</p>
      <table className="ttable fit paper-table">
        <caption><strong>Table 3.</strong> Six months after the sale against the month&apos;s typical insider sale, by share price</caption>
        <thead><tr><th>Group</th><th className="r">Sales</th><th className="r">Median</th><th className="r">Mean</th><th className="r">Did worse</th></tr></thead>
        <tbody>{[["Share price under $5", penny], ["Share price $5+", five]].map(([label, s]) => {
          const x = s as typeof penny;
          return <tr key={label as string}><td>{label as string}</td><td className="mono r">{n(x.n)}</td><td className="mono r">{signed(x.median)}</td><td className="mono r">{signed(x.mean)}</td><td className="mono r">{p(x.below).toFixed(0)}%</td></tr>;
        })}</tbody>
      </table>

      <h3>4.4 Against the market</h3>
      <p>Stocks that insiders sold trailed the market afterwards: over six months the median trailed small-company stocks by {signed(iwm6.median).replace("−", "")} and the S&amp;P 500 by {signed(spy6.median).replace("−", "")} (Figure 4). We read most of that as the period, in which smaller companies lagged the largest ones, rather than a warning in the sales; this paper doesn't test that directly.</p>
      <Figure n={4} title="Median return after all officer and director sales against each benchmark, at 1, 3 and 6 months." note={`${n(saleStat("month", g, "6 months").n)} sales at six months. Against same-month sales the result for all sales is zero by construction, since that median is the benchmark; it is shown for scale.`}>
        <div className="paper-panels">
          {(["month", "iwm", "spy"] as Bench[]).map((b) => (
            <ColumnPanel key={b} title={b === "month" ? "Same-month insider sales" : b === "iwm" ? "Small caps (IWM)" : "S&P 500 (SPY)"} lim={lim}
              cols={HORIZONS.map((h) => ({ label: h.replace(" months", "m").replace(" month", "m"), value: p(saleStat(b, g, h).median) }))} />
          ))}
        </div>
      </Figure>

      <h3>4.5 Out of sample: sales filed since January 2026</h3>
      <p>The whole test was repeated, unchanged, on the {n(SALES_OOS.kept)} sales filed from {SALES_OOS.span.text}, which the 2023 to 2025 results were not built on. Only {n(oosAll.n)} of them have six months of returns so far, so these figures are less certain than the main ones. This section is rerun every month as new filings and returns come in; it was last updated in {oosUpdated}.</p>
      <p><NotableOos /></p>
      <Figure n={5} title="Median six-month return after the sale by group, sales filed since January 2026, against the month's typical insider sale." note={`Only the ${n(oosAll.n)} sales with six months of returns so far. Negative: the stock did worse after the sale.`}>
        <DivergingBars rows={OOS_GROUPS.map((g) => ({ label: saleName(g), value: p(saleOosStat(g, "6 months").median), n: saleOosStat(g, "6 months").n })).sort((a, b) => a.value - b.value)} label="Median 6-month return vs the month's typical insider sale" unit="sales" />
      </Figure>
      <table className="ttable fit paper-table">
        <caption><strong>Table 4.</strong> Six months after the sale against the month&apos;s typical insider sale: median, and share that did worse</caption>
        <thead><tr><th>Group</th><th className="r">2023–2025</th><th className="r">{SALES_OOS.span.years}</th></tr></thead>
        <tbody>{OOS_GROUPS.map((g) => { const a = six(g), b = saleOosStat(g, "6 months"); return (
          <tr key={g}><td>{saleName(g)}</td><td className="mono r">{signed(a.median)}<span className="muted"> · {p(a.below).toFixed(0)}%</span></td><td className="mono r">{signed(b.median)}<span className="muted"> · {p(b.below).toFixed(0)}%</span><div className="muted small">{n(b.n)} sales</div></td></tr>
        ); })}</tbody>
      </table>
    </>
  );
}

// ---- Section 4.5 is refreshed monthly (research-refresh.yml), so its wording follows the numbers.
const OOS_GROUPS = ["Notable (site rule)", "Not notable", "Not pre-planned", "Top exec, not pre-planned", "Value $1M+", "Sold 50%+ of stake", "Sold entire stake", "Price under $5"];
const oosAll = saleOosStat("All officer/director sales", "6 months");
const oosUpdated = new Date(SALES_OOS.generated).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
/** Notable sales since 2026 followed by clearly worse returns: a median 2+ points below the month and 53%+ doing worse. */
export const oosWarns = () => { const s = saleOosStat("Notable (site rule)", "6 months"); return p(s.median) <= -2 && p(s.below) >= 53; };
function NotableOos() {
  const now = saleOosStat("Notable (site rule)", "6 months"), then = six("Notable (site rule)");
  const was = `(2023 to 2025: ${signed(then.median)}, ${p(then.below).toFixed(0)}% did worse)`;
  if (oosWarns()) return <>Unlike 2023 to 2025, notable sales were followed by worse returns: a median of {signed(now.median)} against the month&apos;s typical sale, with {p(now.below).toFixed(0)}% doing worse {was}. The mean was {signed(now.mean)}, so the typical notable sale&apos;s stock lagged while a few rose enough to cancel that out. Sales of half or all of a stake show the same pattern (Table 4). It rests on {n(now.n)} notable sales with six months of returns, all filed in the first months of the year, and could be one period&apos;s luck; it needs more filings before the label can be read as a warning.</>;
  if (Math.abs(p(now.median)) < 1) return <>As in 2023 to 2025, notable sales were followed by much the same returns as other sales: a median of {signed(now.median)} against the month&apos;s typical sale, with {p(now.below).toFixed(0)}% doing worse {was}.</>;
  return <>Notable sales were followed by a median of {signed(now.median)} against the month&apos;s typical sale, with {p(now.below).toFixed(0)}% doing worse {was}. It rests on {n(now.n)} notable sales with six months of returns, too few to change the main finding.</>;
}
function OosAbstract() {
  return oosWarns()
    ? <>Sales filed in 2026, which the test was not built on, are the exception so far: notable sales were followed by worse returns by the median, though not by the mean, on a few months of data.</>
    : <>Repeating the test on sales filed in 2026, which it was not built on, gave the same answer so far.</>;
}

function Page3() {
  const list = saleGroups();
  return (
    <>
      <h2>5. Discussion</h2>
      <p>The results fit the usual explanation for insider sales: they are mostly about the seller&apos;s own finances, not the company&apos;s prospects. Even the sales built to look most like a warning (a top executive selling much of their stake, outside a pre-planned plan) were followed by returns within a point of other sales. The test does not rule out that a handful of sales carry real information; it shows that the simple rules websites use can&apos;t find them.</p>
      <h3>5.1 What this means for Arkanum&apos;s label</h3>
      <p>Arkanum&apos;s &ldquo;notable&rdquo; label should be read as a description, not a prediction: it marks sales that are out of the ordinary in size or share of a stake, which is worth knowing about a company, but it does not mean the stock is more likely to fall. The same is true of the labels on purchases (<Link href="/research/insider-buys">working paper no. 1</Link>).{oosWarns() ? <> Sales filed in 2026 so far point the other way (section 4.5); if that holds as more filings come in, this section will need rewriting.</> : null}</p>

      <h2>6. Limits of the test</h2>
      <ul>
        <li><strong>One three-year period</strong>, in which small companies lagged large ones. A different period could give different results.</li>
        <li><strong>Share of stake.</strong> SEC&apos;s data sets give the holding left after each sale in that account only, not across all of an insider&apos;s accounts, so the share of a stake sold runs somewhat high here.</li>
        <li><strong>Delisted stocks.</strong> {n(SALES.noPrices)} stocks had no price history, mostly delisted companies; their sales are missing from the results.</li>
        <li><strong>Overlapping sales.</strong> Sales overlap in time and cluster in the same stocks, so the evidence is less certain than {n(SALES.kept)} sales makes it sound.</li>
      </ul>

      <h2>7. Conclusion</h2>
      <p>Across {n(SALES.kept)} sales by company officers and directors in 2023 to 2025, neither Arkanum&apos;s notable-sale rule nor any of the usual warning signs picked out sales followed by worse returns. Insider sales are worth knowing about, but not as a signal to sell{oosWarns() ? ", though sales filed in 2026 so far are a reason to keep checking (section 4.5)" : ""}.</p>

      <h2>Appendix</h2>
      <p>Each cell: median return after the sale against the benchmark · share of sales followed by a worse return. Sales counted at six months.</p>
      {(["month", "iwm", "spy"] as Bench[]).map((b, i) => (
        <div key={b} className="paper-table-wrap">
          <table className="ttable fit paper-table">
            <caption><strong>Table A{i + 1}.</strong> Against {b === "month" ? "other insider sales filed the same month" : BENCH[b].replace("Small-company stocks", "small-company stocks")}</caption>
            <thead><tr><th>Group</th>{HORIZONS.map((h) => <th key={h} className="r">{h}</th>)}<th className="r">n</th></tr></thead>
            <tbody>{list.map((grp) => (
              <tr key={grp}>
                <td>{saleName(grp)}</td>
                {HORIZONS.map((h) => { const s = saleStat(b, grp, h); return <td key={h} className="mono r">{signed(s.median)}<span className="muted"> · {p(s.below).toFixed(0)}%</span></td>; })}
                <td className="mono r muted">{n(saleStat(b, grp, "6 months").n)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ))}
      <p>Results generated on {SALES.generated.slice(0, 10)}. Prices from daily closing prices, used only to compute these statistics.</p>

      <h2>References</h2>
      <ol className="paper-refs">
        <li>Arkanum Data Research (2026). Do insider stock purchases beat the market? A test of 23,000 buys. Working paper no. 1.</li>
        <li>Cohen, L., Malloy, C. and Pomorski, L. (2012). Decoding inside information. <em>Journal of Finance</em>, 67(3), 1009–1043.</li>
        <li>Jeng, L. A., Metrick, A. and Zeckhauser, R. (2003). Estimating the returns to insider trading: a performance-evaluation perspective. <em>Review of Economics and Statistics</em>, 85(2), 453–471.</li>
        <li>Lakonishok, J. and Lee, I. (2001). Are insider trades informative? <em>Review of Financial Studies</em>, 14(1), 79–111.</li>
        <li>U.S. Securities and Exchange Commission. Insider transactions data sets (Forms 3, 4 and 5), quarterly files 2022–2025.</li>
      </ol>
      <p className="muted small">Not investment advice.</p>
    </>
  );
}

const BODIES = [Page0, Page1, Page2, Page3];

export function PaperPageView({ i }: { i: number }) {
  const Body = BODIES[i];
  return (
    <Paper base={BASE} title={TITLE} date={DATE} pages={PAGES} current={i} no={2}>
      <Body />
    </Paper>
  );
}
