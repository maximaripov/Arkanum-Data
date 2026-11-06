import Link from "next/link";
import type { Metadata } from "next";

// The backtest behind the buy labels, written up for readers (numbers from docs/backtest/results.md).
const title = "Do insider stock purchases beat the market? A test of 23,000 buys";
const description = "Arkanum scored 22,969 officer and director purchases from 2023–2025 with the usual rules (CEO buys, big buys, first buys, several insiders buying) and checked how they did. The rules didn't pick better buys.";
export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "/research/insider-buys" },
  openGraph: { title: `${title} · Arkanum Data`, description, url: "/research/insider-buys", type: "article" },
};

// Six months after the filing, versus the median insider buy filed the same month.
const ROWS: [string, number, string, number][] = [
  ["All officer and director buys", 22784, "0.0%", 50],
  ["Highest scores (60+)", 4091, "−0.3%", 49],
  ["Lowest scores (under 40)", 12642, "0.0%", 50],
  ["Very highest scores (80+)", 688, "−0.9%", 47],
  ["Purchases of $1M or more", 1298, "−4.6%", 44],
  ["CEO, CFO, President or Chair", 7790, "−1.2%", 47],
  ["Directors only", 11945, "+0.6%", 51],
  ["3 or more insiders buying", 7903, "+0.2%", 51],
  ["Buying alone", 9997, "−0.3%", 49],
  ["Pre-planned (Rule 10b5-1)", 764, "−6.9%", 38],
];

export default function InsiderBuysResearch() {
  return (
    <div className="stack prose">
      <section className="card">
        <h1>{title}</h1>
        <p className="muted small">Arkanum research · November 2026</p>
        <p>Insider-trading sites, Arkanum included, rank purchases with the same rules of thumb: a CEO buying matters more than a director, a big purchase matters more than a small one, a first purchase in years is a strong sign, and several insiders buying at once is the strongest sign of all. Purchases set up in advance under a trading plan count for less.</p>
        <p>Arkanum used those rules to label purchases &quot;Strong signal&quot;, then tested them on three years of real filings. They didn&apos;t pick better buys.</p>
      </section>

      <section className="card">
        <h2>How it was tested</h2>
        <ul>
          <li><strong>The purchases:</strong> every open-market purchase by an officer or director filed with the SEC from January 2023 to December 2025: 22,969 after removing stocks with no price history and filings whose price didn&apos;t match the ticker.</li>
          <li><strong>The score:</strong> each purchase was scored with exactly the formula Arkanum used on its pages: the insider&apos;s role, how much the purchase grew their stake, how long since their last purchase, how many insiders were buying, the size, and a penalty for pre-planned trades.</li>
          <li><strong>The returns:</strong> from the first close <em>after the filing</em>, when the public could act on it, not the insider&apos;s own trade date.</li>
          <li><strong>The comparison:</strong> each purchase against the typical insider purchase filed the same month. That cancels out the market and the timing, so the only question left is whether a higher score picked the better purchases.</li>
        </ul>
      </section>

      <section className="card flush">
        <div className="card-title"><h2>Six months later <span className="muted small">median return against the month&apos;s typical insider buy, and the share that beat it</span></h2></div>
        <table className="ttable fit">
          <thead><tr><th>Group</th><th className="r">Median</th><th className="r">Beat</th></tr></thead>
          <tbody>{ROWS.map(([g, n, med, beat]) => (
            <tr key={g}><td>{g}<div className="muted small">{n.toLocaleString("en-US")} purchases</div></td><td className={`mono r ${med.startsWith("+") ? "up" : med.startsWith("−") ? "down" : ""}`}>{med}</td><td className="mono r">{beat}%</td></tr>
          ))}</tbody>
        </table>
      </section>

      <section className="card">
        <h2>What it found</h2>
        <ul>
          <li><strong>The score didn&apos;t rank purchases.</strong> The highest-scored purchases did no better than the lowest-scored ones after one, three or six months. The very highest scores did slightly worse.</li>
          <li><strong>The biggest purchases did worst.</strong> Purchases of $1 million or more had the lowest median of any group, and only 44% beat the month&apos;s typical insider buy.</li>
          <li><strong>CEO purchases did worse than director purchases,</strong> the opposite of the usual advice.</li>
          <li><strong>Several insiders buying, a first purchase in years, and a big increase in the insider&apos;s stake</strong> made no real difference.</li>
          <li><strong>One rule held up:</strong> pre-planned purchases did badly (median −6.9%, 38% beat the month).</li>
          <li><strong>Stocks under $5 behaved like lottery tickets:</strong> the median purchase lagged (−2.6%), but the average was +14.7% because a few soared.</li>
          <li><strong>Insider buying as a whole didn&apos;t beat the market in this period.</strong> Against small-company stocks (the IWM fund), the median purchase trailed by 2.8% over six months, and 46% beat it. Against the S&amp;P 500 the gap was larger, mostly because small companies lagged large ones in 2023–2025.</li>
        </ul>
      </section>

      <section className="card">
        <h2>What Arkanum changed</h2>
        <p>Purchases are no longer called &quot;Strong signals.&quot; The labels now say what the score measures: <strong>Unusual</strong>, <strong>Somewhat unusual</strong> or <strong>Routine</strong>, meaning how out of the ordinary a purchase is for that person, not how it will do. Claims that group buying is &quot;the strongest signal&quot; were removed. The filings themselves are still worth reading: an unusual purchase is a reason to look closer, not a reason to buy.</p>
        <p><Link href="/">See this month&apos;s most unusual insider buys ›</Link></p>
      </section>

      <section className="card">
        <h2>Limits of the test</h2>
        <ul>
          <li><strong>One three-year period.</strong> Older academic studies found insider purchases did beat the market, with the edge shrinking over time. A different period could give different results.</li>
          <li><strong>Delisted stocks.</strong> 654 stocks had no price history, mostly companies that were delisted. Delistings usually mean losses, so the true results are probably a little worse, not better.</li>
          <li><strong>Overlapping purchases.</strong> Many purchases overlap in time and cluster in the same stocks, so the evidence is less certain than 23,000 purchases makes it sound.</li>
          <li><strong>One formula.</strong> A different combination of factors might work. Arkanum hasn&apos;t tested a reweighted score on data it wasn&apos;t built from, and won&apos;t claim one works until it has.</li>
        </ul>
        <p className="muted small">Filings from the SEC&apos;s quarterly insider transaction data sets. Returns computed from daily closing prices and published only as these summary statistics. Not investment advice.</p>
      </section>
    </div>
  );
}
