// How the research is done, in one place: sources, which trades, the price check, returns,
// ranges, the verdict rule, the limits and the corrections. Counts come from the research
// files (lib/research.ts) so they follow the data.
import type { Metadata } from "next";
import Link from "next/link";
import { OOS, SALES, SALES_OOS, SAMPLE } from "@/lib/research";

const title = "Methodology: how Arkanum tests insider and Congress trades";
const description = "Where every number on Arkanum comes from, which trades are tested, how prices are checked, how returns and 90% ranges are worked out, when a result counts as changed, what isn't tested, and every correction.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "/research/methodology" },
  openGraph: { title: `${title} · Arkanum Data`, description, url: "/research/methodology", type: "article", images: "/opengraph-image" },
};

const n = (x: number) => x.toLocaleString("en-US");

export default function Methodology() {
  return (
    <article className="paper">
      <header className="paper-head">
        <p className="paper-series">Arkanum Data Research</p>
        <h1 className="paper-title">Methodology</h1>
        <p className="paper-authors">How the numbers on this site are made, and why you can check them</p>
      </header>
      <section className="paper-body">
        <h2>1. Sources: official filings only</h2>
        <ul>
          <li><strong>Company insiders:</strong> Form 4 filings from SEC EDGAR, read every two hours on weekdays. The research uses SEC&apos;s quarterly insider transaction data sets, the same filings in bulk.</li>
          <li><strong>House members:</strong> Periodic Transaction Reports from the Clerk of the House, read daily. Each e-filed report&apos;s PDF is turned into rows, one per trade, including the account it was made in and whether the report amends an earlier one. Scanned paper filings have no text and are counted but not read. The Senate&apos;s site blocks automated access, so Senate trades aren&apos;t covered.</li>
          <li><strong>Funds and companies:</strong> 13F holdings reports and 13D/13G ownership filings from SEC EDGAR.</li>
          <li><strong>Prices:</strong> daily closing prices from Yahoo Finance, with Tiingo as a fallback, used only to calculate returns; no quotes from them are shown. Live quotes and charts on the site are TradingView embeds.</li>
        </ul>
        <p>Every trade on the site links to the filing it came from, so any row can be checked against the source.</p>

        <h2>2. Which trades are tested</h2>
        <ul>
          <li>Open-market purchases and sales by officers and directors. Option exercises, gifts, grants and trades by 10% holders who aren&apos;t officers or directors are left out, because they aren&apos;t a decision to buy or sell at the market price.</li>
          <li>Filings repeated by several co-owners are counted once, and totals typed into the price field are corrected, before anything is counted.</li>
          <li>Purchases filed {SAMPLE.from} to {SAMPLE.to}: {n(SAMPLE.scored)} scored, {n(SAMPLE.kept)} kept. Sales: {n(SALES.tested)} tested, {n(SALES.kept)} kept. Filed since January 2026 and tested separately: {n(OOS.kept)} purchases and {n(SALES_OOS.kept)} sales so far.</li>
        </ul>

        <h2>3. The price check</h2>
        <p>A ticker can be reused or wrong in a filing. Each trade&apos;s price in the filing is compared with that day&apos;s closing price, and a trade is kept only if they are within a third of each other: {n(SAMPLE.mismatched)} purchases and {n(SALES.mismatched)} sales failed and were left out. Closing prices are adjusted for later stock splits, so the check first undoes those adjustments to recover the price that actually traded that day; without that, every trade before a split or reverse split would fail.</p>

        <h2>4. Returns</h2>
        <ul>
          <li><strong>From when the public could act:</strong> each return starts at the first closing price after the filing became public, not at the insider&apos;s own trade, which outsiders couldn&apos;t copy. Paper no. 3 measures what that delay costs.</li>
          <li><strong>Horizons:</strong> one, three and six months.</li>
          <li><strong>Benchmarks:</strong> the median insider trade filed the same month (so a finding isn&apos;t just a good or bad month for everyone), small-company stocks (IWM) and the S&amp;P 500 (SPY). House trades are also compared with the equal-weighted S&amp;P 500 (RSP). Each figure says which benchmark it uses.</li>
          <li><strong>Medians, not averages:</strong> a few huge winners in penny stocks would pull an average far from what a typical trade did.</li>
        </ul>

        <h2>5. Ranges: how sure a number is</h2>
        <p>Each six-month median carries a 90% range from a bootstrap: the test is rerun 400 times on samples drawn from the data, and the range covers the middle 90% of the results. Trades filed in the same month move together (one market drop hits them all), so the samples are drawn as whole filing months, not single trades. Counting trades one by one would make the ranges look far narrower than the evidence supports.</p>

        <h2>6. When a result counts as changed</h2>
        <p>Trades filed since January 2026 were never used to design the labels, so they test whether a result still holds. Until 2026 has twelve filing months with six-month returns (about early 2028), the verdict is &ldquo;too early&rdquo;, whatever the numbers look like. After that, a result is &ldquo;changed&rdquo; only if its 2026 range and its 2023&ndash;25 range don&apos;t overlap; otherwise it &ldquo;holds&rdquo;. The <Link href="/research/report-card">report card</Link> applies this rule to every label, every month.</p>
        <p>Each paper&apos;s conclusions are written as checks on the data. When the monthly refresh contradicts one, the paper keeps last month&apos;s numbers and is flagged for rewriting, instead of quietly showing figures its text no longer describes.</p>

        <h2>7. Three kinds of trade</h2>
        <p>A <strong>reported</strong> trade is one that was disclosed. An <strong>unusual</strong> trade stands out for that person (Arkanum&apos;s Insider Activity Score, or a large unplanned sale). A <strong>tested signal</strong> is a kind of trade whose result held across years of filings with a range that excludes zero. Every row on the site is reported; some are marked unusual; none is presented as a buy signal, because no kind of insider purchase we tested beat the market. See <Link href="/research#kinds">the three kinds</Link>.</p>

        <h2>8. What isn&apos;t tested</h2>
        <ul>
          <li><strong>Survivorship:</strong> stocks with no price history, mostly delisted or renamed companies, are left out. Delisted stocks tend to have done badly, so this probably makes insider purchases look somewhat better than they were, not worse.</li>
          <li><strong>Costs:</strong> returns are before trading costs, spreads and taxes, which matter most for the small, cheap stocks where insider buying is common.</li>
          <li><strong>Risk:</strong> returns aren&apos;t adjusted for how volatile a stock is, beyond comparing with small-company stocks.</li>
          <li><strong>The Senate</strong> and scanned paper filings, as above.</li>
          <li><strong>Your portfolio:</strong> the research describes groups of past trades. It isn&apos;t advice about any stock.</li>
        </ul>

        <h2>9. Corrections</h2>
        <ul>
          <li><strong>2026-11-09, stock splits.</strong> The price check compared filing prices with split-adjusted closes, so trades before a later split or reverse split failed it and were dropped. Fixed and rerun: {n(SAMPLE.kept)} purchases kept (about 2,000 more) and {n(SALES.kept)} sales (about 5,300 more). The largest change: purchases of stocks under $5 moved from &minus;2.6% to &minus;6.4% against other insider buys, because many of the rescued trades were reverse-split penny stocks.</li>
          <li><strong>2026-11-12, House reports.</strong> Trades re-listed in a later report, or amended, were counted twice (12 trades). Each now appears once, dated by its first public filing. Purchases of one stock in two accounts on the same day are separate trades and now show the account.</li>
        </ul>

        <p className="muted small">Research data tables are available on request. Questions or a number you think is wrong: see <Link href="/about#contact">Contact</Link>.</p>
      </section>
    </article>
  );
}
