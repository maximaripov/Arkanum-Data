// "What does the filing delay cost a follower?" as a two-page working paper (no. 3). Every
// number comes from the delay tables the buy and sales studies write (docs/backtest/results.json
// and sales.json, key "delay"; scripts/lib/delay.mjs), so the paper and the data can't drift apart.
import Link from "next/link";
import type { Metadata } from "next";
import { Paper, type PaperPage } from "@/components/research/Paper";
import { PaperPrint } from "@/components/research/PaperPrint";
import { DivergingBars, Figure } from "@/components/research/Charts";
import buys from "@/docs/backtest/results.json";
import sales from "@/docs/backtest/sales.json";
import oosBuys from "@/docs/backtest/oos-2026.json";
import oosSales from "@/docs/backtest/sales-2026.json";
import { MIN_MONTHS, OOS, SALES_OOS, judge, type Verdict } from "@/lib/research";

type S = { n: number; median?: number; up?: number; lo?: number; hi?: number; months?: number };
type D = { n: number; lagMedian: number | null; lagP90: number | null; pre: S; ins6: S; fol6: S; gap: S };
const table = (x: { groups: unknown; lags: unknown }) => ({ groups: Object.fromEntries(x.groups as [string, D][]), lags: x.lags as [string, D][] });
const B = table(buys.delay), SL = table(sales.delay);
const allB = B.groups["All officer/director buys"], allS = SL.groups["All officer/director sales"];
// The same measurement on trades filed since January 2026 (refreshed monthly by research-refresh.yml).
const OB = table(oosBuys.delay), OS = table(oosSales.delay);
const newB = OB.groups["All officer/director buys"], newS = OS.groups["All officer/director sales"];

export const BASE = "/research/filing-delay";
const N = (Math.floor((allB.n + allS.n) / 1000) * 1000).toLocaleString("en-US");
export const TITLE = `What does the filing delay cost someone who follows insiders? A test of ${N} trades`;
const DATE = "November 2026";
export const PAGES: PaperPage[] = [
  { slug: "", title: "Abstract, data and method" },
  { slug: "results", title: "Results, limits and references" },
];

const pc = (x?: number) => (x == null ? 0 : Math.round(x * 1000) / 10);
const signed = (x?: number) => { const v = pc(x); return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`; };
const range = (s: S) => (s.lo == null ? "" : ` (90% range ${signed(s.lo)} to ${signed(s.hi)})`);
const size = (x?: number) => `${Math.abs(pc(x)).toFixed(1)}`; // magnitude, where the words give the direction
const share = (s: S) => `${Math.round((s.up ?? 0) * 100)}%`;
const n = (x: number) => x.toLocaleString("en-US");
const NAME: Record<string, string> = { "All officer/director buys": "All purchases", "Top executive (CEO/CFO/President/Chair)": "CEO, CFO, President or Chair", "Strong (60+)": "Rated unusual (score 60+)", "All officer/director sales": "All sales", "Top exec, not pre-planned": "Top executive, not pre-planned", "Notable (site rule)": "Flagged notable" };
const name = (g: string) => NAME[g] ?? g;

const DESCRIPTIONS = [
  `Insiders have two business days to report a trade. Arkanum measured what ${n(allB.n)} purchases and ${n(allS.n)} sales did in that gap, and what it cost someone who followed them.`,
  "How much of the move came before the filing, for large purchases, purchases Arkanum rates unusual, late filers and sales, and why the delay is not why following insiders fails. Charts and tables.",
];
export function paperMetadata(i: number): Metadata {
  const url = PAGES[i].slug ? `${BASE}/${PAGES[i].slug}` : BASE;
  const title = i === 0 ? TITLE : `${PAGES[i].title} · ${TITLE}`;
  return { title, description: DESCRIPTIONS[i], alternates: { canonical: url }, openGraph: { title: `${title} · Arkanum Data`, description: DESCRIPTIONS[i], url, type: "article", images: "/opengraph-image" } };
}

function Page0() {
  const big = B.groups["Value $1M+"];
  return (
    <>
      <section className="paper-abstract">
        <h2>Abstract</h2>
        <p>Company insiders must report a trade on Form 4 within two business days, so anyone who follows insider trades starts after the insider. We measured, for {n(allB.n)} open-market purchases and {n(allS.n)} sales by officers and directors filed in 2023 to 2025, how the stock moved against the S&amp;P 500 between the insider&apos;s trade and the first price a reader could get, and how the next six months looked from each starting point. In the median purchase the stock gained {signed(allB.pre.median)} on the market before the public could act{range(allB.pre)}, and {share(allB.pre)} of purchased stocks beat the market in that gap; the head start was larger for purchases of $1 million or more ({signed(big.pre.median)}) and for purchases Arkanum&apos;s score rated unusual. Over six months a follower ended a median {size(allB.gap.median)} percentage points behind the insider. But the insiders&apos; own purchases trailed the S&amp;P 500 by {size(allB.ins6.median)}% over six months, so the delay is not the reason following insiders has not worked: the trades themselves did not beat the market. Before sales the stock barely moved ({signed(allS.pre.median)}).</p>
        <p className="paper-keywords"><strong>Keywords:</strong> insider trading, Form 4, filing delay, information leakage, event study</p>
      </section>

      <h2>1. Introduction</h2>
      <p>Arkanum&apos;s first two working papers found that following insider <Link href="/research/insider-buys">purchases</Link> and <Link href="/research/insider-sales">sales</Link> as they are filed did not beat the market. A natural objection is timing: by the time a Form 4 is public, the insider has already traded, and perhaps the market has already moved. If most of the gain happened before the filing, insiders could still be well informed even though followers can&apos;t profit. This paper measures that gap directly.</p>

      <h2>2. Data</h2>
      <p>The trades are the same as in papers no. 1 and 2: open-market purchases and sales by officers and directors, filed with the SEC from January 2023 to December 2025, after the same checks that the ticker&apos;s price matches the price in the filing. With prices covering the trade date: {n(allB.n)} purchases and {n(allS.n)} sales. The median purchase was reported {allB.lagMedian} trading day{allB.lagMedian === 1 ? "" : "s"} after it was made, counting to the first close after the filing; one in ten took {allB.lagP90} or more.</p>

      <h2>3. Method</h2>
      <p><strong>Three windows.</strong> For each trade, with daily closes adjusted for splits and dividends and each stock&apos;s return minus the S&amp;P 500&apos;s over the same days:</p>
      <ul>
        <li><strong>Head start:</strong> from the close on the trade date to the first close after the filing date, the first price at which a reader of the filing could act.</li>
        <li><strong>Insider&apos;s six months:</strong> 126 trading days from the trade-date close.</li>
        <li><strong>Follower&apos;s six months:</strong> 126 trading days from the first close after the filing.</li>
      </ul>
      <p><strong>The cost of waiting</strong> is the insider&apos;s six months minus the follower&apos;s, trade by trade. A positive number means the follower did worse.</p>
      <p><strong>Statistics.</strong> Medians, the share of trades above zero, and a 90% range for each median from a bootstrap that resamples whole filing months (400 resamples), since trades filed in the same month share the same market. The trade-date close is a stand-in for the insider&apos;s actual price, which can differ within the day.</p>
      <p className="muted small">Not investment advice.</p>
    </>
  );
}

const ORDER_B = ["All officer/director buys", "Strong (60+)", "Value $1M+", "Price under $5", "Price $5+", "Top executive (CEO/CFO/President/Chair)", "Director only", "Pre-planned"];
const ORDER_S = ["All officer/director sales", "Notable (site rule)", "Top exec, not pre-planned", "Value $1M+", "Pre-planned (10b5-1)", "Not pre-planned", "Price under $5", "Price $5+"];
const bars = (rows: [string, D][]) => rows.map(([g, d]) => ({ label: name(g), value: pc(d.pre.median), n: d.pre.n }));

function Row({ g, d }: { g: string; d: D }) {
  return <tr><td>{name(g)}</td><td className="mono r">{n(d.n)}</td><td className="mono r">{signed(d.pre.median)}</td><td className="mono r">{share(d.pre)}</td><td className="mono r">{signed(d.ins6.median)}</td><td className="mono r">{signed(d.fol6.median)}</td><td className="mono r">{signed(d.gap.median)}</td></tr>;
}
function Table({ rows }: { rows: [string, D][] }) {
  return (
    <div className="table-wrap">
      <table className="data-table paper-table">
        <thead><tr><th>Group</th><th className="r">Trades</th><th className="r">Head start</th><th className="r">Share up</th><th className="r">Insider, 6 mo</th><th className="r">Follower, 6 mo</th><th className="r">Cost of waiting</th></tr></thead>
        <tbody>{rows.map(([g, d]) => <Row key={g} g={g} d={d} />)}</tbody>
      </table>
    </div>
  );
}

function Page1() {
  const big = B.groups["Value $1M+"], strong = B.groups["Strong (60+)"], cheap = B.groups["Price under $5"];
  const late = Object.fromEntries(B.lags)["Late: 6+ trading days"], quick = Object.fromEntries(B.lags)["Filed the next trading day or sooner"];
  const notable = SL.groups["Notable (site rule)"];
  return (
    <>
      <h2>4. Results</h2>
      <h3>4.1 Purchases: a small head start, mostly for the visible ones</h3>
      <p>Between the insider&apos;s purchase and the first price a reader could get, the median purchased stock beat the S&amp;P 500 by {signed(allB.pre.median)}{range(allB.pre)}, and {share(allB.pre)} beat it. Some of the market&apos;s reaction comes before the filing is public, but not much. The head start was largest where a purchase is most noticeable: {signed(big.pre.median)} for purchases of $1 million or more ({share(big.pre)} beat the market) and {signed(strong.pre.median)} for purchases Arkanum&apos;s score rated unusual, against {signed(cheap.pre.median)} for stocks under $5 (Figure 1).</p>
      <Figure n={1} title="Head start: median move against the S&P 500 from the insider's trade to the first price a reader could get, purchases by group." note="Positive: the stock rose on the market before the filing was public, so a follower paid more than the insider.">
        <DivergingBars rows={bars(ORDER_B.map((g) => [g, B.groups[g]] as [string, D]))} label="Median head start vs the S&P 500" unit="purchases" />
      </Figure>

      <h3>4.2 Over six months, the delay cost about a point</h3>
      <p>Measured from the trade date, the median purchase trailed the S&amp;P 500 by {size(allB.ins6.median)}% over six months; measured from the first price after the filing, by {size(allB.fol6.median)}%. Trade by trade, the follower ended a median {size(allB.gap.median)} points behind the insider{range(allB.gap)}. For $1 million-plus purchases the cost was larger ({signed(big.gap.median)}), but the insiders&apos; own result was still {signed(big.ins6.median)}. {ORDER_B.every((g) => (B.groups[g].ins6.median ?? 0) < 0) ? "In every group of purchases we tested, the insider's own six months trailed the market (Table 1): the filing delay costs followers something, but it is not why following insider purchases has not worked." : "In some groups the insiders' own six months beat the market (Table 1); the cost of waiting is what a follower gave up there."}</p>

      <h3>4.3 Filing speed</h3>
      <p>Purchases reported by the next trading day ({n(quick.n)}) had a head start of {signed(quick.pre.median)}. Late filers, reported six or more trading days after the trade ({n(late.n)}), had none ({signed(late.pre.median)}): waiting did not hide a run-up, perhaps because insiders who are late to file are rarely the ones trading on news.</p>
      <Figure n={2} title="Head start by how long the purchase took to be reported." note="Trading days from the trade-date close to the first close after the filing.">
        <DivergingBars rows={bars(B.lags)} label="Median head start vs the S&P 500" unit="purchases" />
      </Figure>

      <h3>4.4 Sales: nothing to miss</h3>
      <p>Before a sale was public, the median stock moved {signed(allS.pre.median)} against the market, and {signed(notable.pre.median)} for sales Arkanum flags as notable. The cost of waiting was {signed(allS.gap.median)}: a reader of sale filings misses almost nothing, consistent with paper no. 2, where sales predicted little at all.</p>

      <h3>4.5 Filed since January 2026</h3>
      <p><Since2026 /></p>

      <h3>Table 1. Purchases</h3>
      <Table rows={ORDER_B.map((g) => [g, B.groups[g]] as [string, D])} />
      <h3>Table 2. Sales</h3>
      <Table rows={ORDER_S.map((g) => [g, SL.groups[g]] as [string, D])} />
      <p className="muted small">Medians against the S&amp;P 500. Head start: trade-date close to the first close after the filing. Cost of waiting: insider&apos;s six months minus the follower&apos;s, trade by trade (not the difference of the two medians).</p>

      <h2>5. Discussion</h2>
      <p>The market does move before insider purchases become public, most for the large and unusual ones that insider websites highlight, which fits paper no. 1&apos;s reading that widely watched signals get priced in. But the gap is small next to the result that matters: in 2023 to 2025 the insiders&apos; own purchases trailed the S&amp;P 500 over the following six months. A faster feed would not have turned these trades into a winning strategy. Older academic work found that insider purchases were followed by above-market returns that outsiders could partly capture (Seyhun, 1986; Lakonishok and Lee, 2001), and that after 2002, when the deadline shortened to two business days, the market reacted to purchases faster, around the filing itself (Brochet, 2010).</p>

      <h2>6. Limits of the test</h2>
      <ul>
        <li><strong>The insider&apos;s price.</strong> We use the close on the trade date; the insider may have bought earlier or later in the day.</li>
        <li><strong>One three-year period</strong>, in which large companies led the market.</li>
        <li><strong>Survivorship.</strong> Stocks with no price history, mostly delisted companies, are left out, as in papers no. 1 and 2.</li>
        <li><strong>Sales.</strong> A follower can&apos;t sell shares they don&apos;t own; for sales the &quot;cost of waiting&quot; is what a holder who sold after reading the filing would have missed.</li>
      </ul>

      <h2>7. Conclusion</h2>
      <p>The two-day filing delay costs someone following insider purchases about a percentage point over six months, more for large and unusual purchases, and almost nothing for sales. It does not explain why following insiders hasn&apos;t paid: the insiders&apos; own purchases trailed the market. Arkanum shows filings as soon as they are public, and says so plainly when the market has already moved.</p>

      <h2>References</h2>
      <ol className="paper-refs">
        <li>Brochet, F. (2010). Information content of insider trades before and after the Sarbanes-Oxley Act. <em>The Accounting Review</em>, 85(2), 419–446.</li>
        <li>Lakonishok, J. and Lee, I. (2001). Are insider trades informative? <em>Review of Financial Studies</em>, 14(1), 79–111.</li>
        <li>Seyhun, H. N. (1986). Insiders&apos; profits, costs of trading, and market efficiency. <em>Journal of Financial Economics</em>, 16(2), 189–212.</li>
        <li>U.S. Securities and Exchange Commission. Insider transactions data sets (Forms 3, 4 and 5), quarterly files 2022–2025.</li>
      </ol>
      <p className="muted small">Not investment advice.</p>
    </>
  );
}

/** One clause on 2026 against 2023–25, written for each verdict (lib/research.ts judge()). */
function verdictText(v: Verdict, what: string, main: S, now: S) {
  if (v === "early") return `${what} has been ${signed(now.median)} so far (2023 to 2025: ${signed(main.median)}), but that rests on ${now.months ?? 0} filing months, too few to read; it is judged once ${MIN_MONTHS} months are in.`;
  if (v === "holds") return `${what} was ${signed(now.median)}${range(now)}, within the 2023 to 2025 range.`;
  return `${what} was clearly ${v === "higher" ? "larger" : "smaller"} than in 2023 to 2025: ${signed(now.median)}${range(now)}, against ${signed(main.median)}${range(main)}.`;
}
function Since2026() {
  return <>Every month the measurement is repeated on trades filed since January 2026, which this paper&apos;s 2023 to 2025 results never saw ({n(newB.n)} purchases filed {OOS.span.text}; {n(newS.n)} sales filed {SALES_OOS.span.text}). For purchases, {verdictText(judge(allB.pre, newB.pre), "the head start", allB.pre, newB.pre)} For sales, {verdictText(judge(allS.pre, newS.pre), "the move before the filing", allS.pre, newS.pre)}</>;
}

const BODIES = [Page0, Page1];
export function PaperPageView({ i }: { i: number }) {
  const Body = BODIES[i];
  return <Paper base={BASE} title={TITLE} date={DATE} pages={PAGES} current={i} no={3}><Body /></Paper>;
}
export function PaperPrintView() {
  return <PaperPrint base={BASE} title={TITLE} date={DATE} no={3} pages={PAGES} bodies={BODIES.map((B, i) => <B key={i} />)} />;
}
