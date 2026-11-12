// "Does copying famous funds from their 13F reports work?" as a two-page working paper (no. 5).
// Every number comes from the study output (docs/backtest/funds.json, written by
// scripts/diagnose/funds-study.mjs), so the paper and the data can't drift apart.
import Link from "next/link";
import type { Metadata } from "next";
import { Paper, type PaperPage } from "@/components/research/Paper";
import { PaperPrint } from "@/components/research/PaperPrint";
import { DivergingBars, Figure } from "@/components/research/Charts";
import study from "@/docs/backtest/funds.json";

type S = { n: number; median?: number; up?: number; lo?: number; hi?: number; months?: number };
type H = Record<string, S>;
type C = { quarters: number; beat: number; beatEq: number; medianQuarter: number; compound: number; compoundEq: number };
const MOVES = Object.fromEntries(study.moveTable as [string, H][]), MOVES_EQ = Object.fromEntries(study.moveTableEq as [string, H][]);
const PER_FUND = study.perFund as [string, H][];
const CLONE = study.clone as { all: S; allEq: S; beat: number; beatEq: number; quarters: number; byFund: [string, C][] };

export const BASE = "/research/fund-copying";
/** How many funds the published study covers (its own data, not the site's current list). */
export const FUNDS_TESTED = study.funds.length;
export const TITLE = `Does copying famous funds from their 13F reports work? A test of ${study.funds.length} funds and ${(Math.floor(study.priced / 1000) * 1000).toLocaleString("en-US")} portfolio changes`;
const DATE = "November 2026";
export const PAGES: PaperPage[] = [
  { slug: "", title: "Abstract, data and method" },
  { slug: "results", title: "Results, limits and references" },
];

const pc = (x?: number) => (x == null ? 0 : Math.round(x * 1000) / 10);
const signed = (x?: number) => { const v = pc(x); return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`; };
const range = (s: S) => (s.lo == null ? "" : ` (90% range ${signed(s.lo)} to ${signed(s.hi)})`);
const size = (x?: number) => `${Math.abs(pc(x)).toFixed(1)}%`; // magnitude, where the words give the direction
const share = (x: number) => `${Math.round(x * 100)}%`;
const n = (x: number) => x.toLocaleString("en-US");
const day = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const LAST = study.pricesThrough.slice(0, 4);
const six = (h: H) => h["6 months"];
const overlap = (a: S, b: S) => a.lo != null && b.lo != null && a.lo <= (b.hi ?? 0) && b.lo <= (a.hi ?? 0);

const DESCRIPTIONS = [
  `Arkanum tested what happened after ${study.funds.length} well-known funds, from Berkshire Hathaway to ARK, reported their holdings each quarter since 2023: buying what they bought, avoiding what they sold, and copying their top ten holdings.`,
  "What the funds bought did no better than what they sold; copying their top ten holdings roughly matched the market overall, with wide gaps between funds that no one could have picked in advance. Charts and tables.",
];
export function paperMetadata(i: number): Metadata {
  const url = PAGES[i].slug ? `${BASE}/${PAGES[i].slug}` : BASE;
  const title = i === 0 ? TITLE : `${PAGES[i].title} · ${TITLE}`;
  return { title, description: DESCRIPTIONS[i], alternates: { canonical: url }, openGraph: { title: `${title} · Arkanum Data`, description: DESCRIPTIONS[i], url, type: "article", images: "/opengraph-image" } };
}

function Page0() {
  const bought = six(MOVES_EQ["New or added"]), sold = six(MOVES_EQ["Sold entirely"]);
  const same = overlap(bought, sold);
  return (
    <>
      <section className="paper-abstract">
        <h2>Abstract</h2>
        <p>Large investment managers must report their U.S. stock holdings each quarter on Form 13F, up to 45 days after the quarter ends, and many websites invite readers to copy famous investors from these reports. For {study.funds.length} well-known funds, we compared every pair of consecutive reports filed for quarters from the end of 2022 on ({n(study.reports)} reports) and measured what each stock did after the report became public, against the equal-weighted S&amp;P 500. Over six months, stocks the funds had newly bought or added to did {signed(bought.median)}{range(bought)}, and stocks they had sold entirely did {signed(sold.median)}{range(sold)}: {same ? "what the funds bought did no better than what they sold" : bought.median! > sold.median! ? "what the funds bought did better than what they sold" : "what the funds bought did worse than what they sold"}. Copying each fund&apos;s ten largest holdings until its next report beat the equal-weighted index in {share(CLONE.beatEq)} of {n(CLONE.quarters)} fund-quarters, a median of {signed(CLONE.allEq.median)} a quarter{range(CLONE.allEq)}; against the ordinary S&amp;P 500, the fairer comparison for a list of mostly very large companies, the median quarter was {signed(CLONE.all.median)}. A few funds did very well over the period and several did badly; nothing in the reports said which in advance.</p>
        <p className="paper-keywords"><strong>Keywords:</strong> Form 13F, institutional investors, copy trading, hedge funds, event study</p>
      </section>

      <h2>1. Introduction</h2>
      <p>Arkanum&apos;s <Link href="/research">other working papers</Link> test whether following company insiders or members of Congress beats the market. This one asks the same of the most-followed investors of all: the funds behind Warren Buffett, Ray Dalio, Bill Ackman, Stanley Druckenmiller and Cathie Wood. Their 13F reports are public and widely covered, and Arkanum shows the latest changes on the <Link href="/">home page</Link> under Big funds. The question is whether a reader who acted on them, once they were public, would have done better than the market.</p>

      <h2>2. Data</h2>
      <p>The funds are the {study.funds.length} Arkanum tracks: {study.funds.join(", ")}. For each, we took every 13F holdings report (form 13F-HR) for quarters ending {day(study.firstPeriod)} or later, as filed with the SEC: {n(study.reports)} reports. We kept stock positions (not options), matched securities to tickers through OpenFIGI and SEC&apos;s company list, and compared each report with the fund&apos;s previous one. That gives {n(study.moves)} changes with a ticker: positions opened, added to (shares up more than 0.5%), reduced, or sold entirely. {n(study.priced)} had prices to measure.</p>

      <h2>3. Method</h2>
      <p><strong>Following the changes.</strong> Each change is measured from the first close after the report was filed, the earliest a reader could act, for one, three and six months (21, 63 and 126 trading days), using daily closes adjusted for splits and dividends.</p>
      <p><strong>Copying the portfolio.</strong> For each report we also hold the fund&apos;s ten largest positions in equal amounts, from the first close after the report to the first close after the next one, about one quarter, and compare that with the index over the same days.</p>
      <p><strong>Benchmarks.</strong> We report results against the equal-weighted S&amp;P 500 (RSP), in which every company counts the same, and give the ordinary S&amp;P 500 alongside. Over this period a few very large companies drove the ordinary index, so almost any list of individual stocks trailed it. Comparing what the funds bought with what they sold doesn&apos;t depend on the benchmark.</p>
      <p><strong>Statistics.</strong> Medians, the share that beat the benchmark, and a 90% range for each median from a bootstrap that resamples whole filing months (400 resamples). 13F reports cluster in four filing seasons a year, so these ranges rest on fewer independent months than the insider papers and are wider.</p>
      <p className="muted small">Not investment advice.</p>
    </>
  );
}

const MOVE_ORDER = ["New positions", "New positions, 1%+ of the fund", "Added to", "Reduced", "Sold entirely"];

function Page1() {
  const bought = six(MOVES_EQ["New or added"]), sold = six(MOVES_EQ["Sold entirely"]), big = six(MOVES_EQ["New positions, 1%+ of the fund"]);
  const fundsSorted = [...CLONE.byFund].sort((a, b) => b[1].compoundEq - a[1].compoundEq);
  const best = fundsSorted[0], worst = fundsSorted.at(-1)!;
  const beatHalf = CLONE.byFund.filter(([, c]) => c.beatEq > c.quarters / 2).length;
  return (
    <>
      <h2>4. Results</h2>
      <h3>4.1 Bought and sold ended up alike</h3>
      <p>Six months after the report was public, stocks the funds had opened or added to did {signed(bought.median)} against the equal-weighted S&amp;P 500{range(bought)}; stocks they had reduced did {signed(six(MOVES_EQ["Reduced"]).median)}, and stocks they had sold entirely {signed(sold.median)}{range(sold)}. {overlap(bought, sold) ? "The ranges overlap: by the time the reports were public, the funds' purchases and sales were not distinguishable." : "The ranges don't overlap."} New positions large enough to be at least 1% of the fund, the ones most likely to reflect a manager&apos;s conviction, did {signed(big.median)}{range(big)} (Figure 1).</p>
      <Figure n={1} title="Median six-month return after the 13F report was public, by kind of change, against the equal-weighted S&P 500." note={`All ${study.funds.length} funds together; a fund with thousands of positions (Renaissance) contributes many more changes than one with ten.`}>
        <DivergingBars rows={MOVE_ORDER.map((g) => ({ label: g, value: pc(six(MOVES_EQ[g]).median), n: six(MOVES_EQ[g]).n }))} label="Median 6-month return vs the equal-weighted S&P 500" unit="changes" />
      </Figure>

      <h3>4.2 Fund by fund</h3>
      <p>Figure 2 shows each fund&apos;s new and added positions over six months. Funds with thousands of small positions, like Renaissance Technologies, make up most of the changes; concentrated funds swing more, and their ranges are wide because each rests on a few dozen changes.</p>
      <Figure n={2} title="Each fund's new and added positions: median six-month return after the report, against the equal-weighted S&P 500.">
        <DivergingBars rows={PER_FUND.map(([f, h]) => ({ label: f, value: pc(six(h).median), n: six(h).n })).sort((a, b) => a.value - b.value)} label="Median 6-month return vs the equal-weighted S&P 500" unit="changes" />
      </Figure>

      <h3>4.3 Copying the top ten</h3>
      <p>Holding a fund&apos;s ten largest positions from each report to the next beat the equal-weighted S&amp;P 500 in {share(CLONE.beatEq)} of {n(CLONE.quarters)} fund-quarters, with a median quarter of {signed(CLONE.allEq.median)}{range(CLONE.allEq)}; against the ordinary S&amp;P 500, {share(CLONE.beat)} and {signed(CLONE.all.median)}. A top-ten list is mostly very large companies, so here the ordinary S&amp;P 500, itself weighted toward them, is the fairer comparison: part of any lead over the equal-weighted index comes simply from holding large companies in years when they led. The spread between funds was wide: compounded over the period, copying {best[0]} {best[1].compoundEq >= 0 ? "beat" : "trailed"} the equal-weighted index by {size(best[1].compoundEq)} and copying {worst[0]} {worst[1].compoundEq >= 0 ? "beat" : "trailed"} it by {size(worst[1].compoundEq)} (Table 1). {beatHalf} of the {CLONE.byFund.length} funds beat the index in more than half their quarters. A reader in 2023 had no way to know which funds would be the winners; choosing them now, with hindsight, is the mistake the test is designed to avoid.</p>

      <h3>Table 1. Copying each fund&apos;s top ten holdings</h3>
      <div className="table-wrap">
        <table className="data-table paper-table">
          <thead><tr><th>Fund</th><th className="r">Quarters</th><th className="r">Beat the equal-weighted index</th><th className="r">Compounded vs equal-weighted</th><th className="r">Compounded vs S&amp;P 500</th></tr></thead>
          <tbody>{fundsSorted.map(([f, c]) => (
            <tr key={f}><td>{f}</td><td className="mono r">{c.quarters}</td><td className="mono r">{c.beatEq}</td><td className="mono r">{signed(c.compoundEq)}</td><td className="mono r">{signed(c.compound)}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <p className="muted small">Compounded: quarterly differences from the index, compounded; an approximation of holding the copy against holding the index. Prices through {day(study.pricesThrough)}.</p>

      <h3>Table 2. All changes, six months after the report</h3>
      <div className="table-wrap">
        <table className="data-table paper-table">
          <thead><tr><th>Change</th><th className="r">Changes</th><th className="r">Equal-weighted S&amp;P 500</th><th className="r">Share that beat it</th><th className="r">S&amp;P 500</th></tr></thead>
          <tbody>{[...MOVE_ORDER, "New or added"].map((g) => (
            <tr key={g}><td>{g}</td><td className="mono r">{n(six(MOVES_EQ[g]).n)}</td><td className="mono r">{signed(six(MOVES_EQ[g]).median)}</td><td className="mono r">{share(six(MOVES_EQ[g]).up ?? 0)}</td><td className="mono r">{signed(six(MOVES[g]).median)}</td></tr>
          ))}</tbody>
        </table>
      </div>

      <h2>5. Discussion</h2>
      <p>13F reports show what a fund held weeks earlier, and only its U.S. stock positions: not short sales, most derivatives or cash, and not why it traded. By the time a report is public, the changes in it carried no consistent edge from 2023 to {LAST}. Academic work has found that managers&apos; largest, highest-conviction holdings tend to do better than the rest of their portfolios (Cohen, Polk and Silli, 2010); here, read only once the reports were public, copying the funds&apos; ten largest holdings did not reliably beat the market. Arkanum shows the funds&apos; changes as information about what large investors did, not as a list of stocks to buy.</p>

      <h2>6. Limits of the test</h2>
      <ul>
        <li><strong>A short period</strong> (reports for quarters from late 2022), in which a few very large companies led the market.</li>
        <li><strong>Thirteen funds</strong>, chosen because they are well known today, which tilts the list toward managers with good records; even so, copying them did not reliably beat the index.</li>
        <li><strong>Tickers.</strong> Securities were matched to tickers by CUSIP and, failing that, by company name; a few matches may be wrong.</li>
        <li><strong>Long positions only.</strong> A 13F doesn&apos;t show short sales, so a fund&apos;s real performance can differ a lot from its reported holdings.</li>
      </ul>

      <h2>7. Conclusion</h2>
      <p>Acting on famous funds&apos; 13F reports once they were public would not have beaten the market on average from 2023 to {LAST}: what they bought did about as well as what they sold, and copying their largest holdings matched the market overall, with winners and losers that only hindsight can name.</p>

      <h2>References</h2>
      <ol className="paper-refs">
        <li>Cohen, R. B., Polk, C. and Silli, B. (2010). Best ideas. Working paper, Harvard Business School and London School of Economics.</li>
        <li>U.S. Securities and Exchange Commission. Form 13F-HR filings, 2023–{LAST}; OpenFIGI (Bloomberg) security identifiers.</li>
      </ol>
      <p className="muted small">Not investment advice.</p>
    </>
  );
}

const BODIES = [Page0, Page1];
export function PaperPageView({ i }: { i: number }) {
  const Body = BODIES[i];
  return <Paper base={BASE} title={TITLE} date={DATE} pages={PAGES} current={i} no={5}><Body /></Paper>;
}
export function PaperPrintView() {
  return <PaperPrint base={BASE} title={TITLE} date={DATE} no={5} pages={PAGES} bodies={BODIES.map((B, i) => <B key={i} />)} />;
}
