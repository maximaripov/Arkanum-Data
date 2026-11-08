// "Do insider stock purchases beat the market?" as a five-page working paper. Every number
// comes from the backtest output via lib/research.ts.
import Link from "next/link";
import type { Metadata } from "next";
import { Paper, type PaperPage } from "@/components/research/Paper";
import { DivergingBars, DotPlot, ColumnPanel, Figure } from "@/components/research/Charts";
import { BENCH, HORIZONS, OOS, SAMPLE, groups, nameOf, oosStat, p, stat, type Bench } from "@/lib/research";

export const BASE = "/research/insider-buys";
export const TITLE = "Do insider stock purchases beat the market? A test of 23,000 buys";
const DATE = "November 2026";
export const PAGES: PaperPage[] = [
  { slug: "", title: "Abstract and introduction" },
  { slug: "method", title: "Data and method" },
  { slug: "results", title: "Results" },
  { slug: "market", title: "The market, discussion and limits" },
  { slug: "appendix", title: "Appendix and references" },
];
const DESCRIPTIONS = [
  "Arkanum scored 22,969 officer and director purchases from 2023 to 2025 with the usual rules (CEO buys, big buys, first buys, several insiders buying) and checked how they did. The rules didn't pick better buys.",
  "How the 22,969 purchases were chosen, how each was scored, and how returns were measured against other insider buys, small-company stocks and the S&P 500.",
  "Higher scores didn't pick better purchases; $1M+ and pre-planned purchases did worst; directors did slightly better than CEOs; the same held for purchases filed in 2026. Charts and numbers at 1, 3 and 6 months.",
  "Insider buying as a whole trailed small-company stocks and the S&P 500 in 2023 to 2025. What Arkanum changed, and the limits of the test.",
  "Full results for all 28 groups against each benchmark, notes on the statistics, and references.",
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

const six = (g: string) => stat("month", g, "6 months");
const signed = (x: number) => { const v = p(x); return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`; }; // sign of the rounded value: no "+0.0%"
const n = (x: number) => x.toLocaleString("en-US");
const bars = (gs: string[]) => gs.map((g) => ({ label: nameOf(g), value: p(six(g).median), n: six(g).n }));
const dots = (gs: string[]) => gs.map((g) => ({ label: nameOf(g), value: p(six(g).hit), n: six(g).n }));
const SCORE_BANDS = ["Score <20", "Score 20–39", "Score 40–59", "Score 60–69", "Score 70–79", "Score 80+"];
const TRAITS = ["Pre-planned", "Value $1M+", "Price under $5", "Top executive (CEO/CFO/President/Chair)", "Value $100K–1M", "Alone", "Stake +50% or more",
  "First buy in 2+ years", "2+ insiders buying", "3+ insiders buying", "Value under $100K", "Price $5+", "Director only"];

function Page0() {
  const all = six("All officer/director buys");
  return (
    <>
      <section className="paper-abstract">
        <h2>Abstract</h2>
        <p>Insider-trading websites rank company insiders&apos; share purchases with the same rules of thumb: a CEO buying matters more than a director, a big purchase more than a small one, a first purchase in years and several insiders buying together are strong signs, and pre-planned purchases count for less. We scored {n(SAMPLE.kept)} open-market purchases by officers and directors filed with the SEC from January 2023 to December 2025 with exactly the formula Arkanum used, and measured each purchase&apos;s return from the first close after it became public. The rules did not pick better purchases. Over six months the highest-scored purchases did no better than the lowest-scored ones; purchases of $1 million or more and CEO purchases did worse than average; only the penalty for pre-planned purchases held up. Insider purchases as a whole trailed small-company stocks over the period. Repeating the test on {n(OOS.kept)} purchases filed in 2026, data the score was never examined on, gave the same answers.</p>
        <p className="paper-keywords"><strong>Keywords:</strong> insider trading, Form 4, event study, signal evaluation, small-cap stocks</p>
      </section>

      <h2>1. Introduction</h2>
      <p>Company officers and directors must report their trades in their own company&apos;s stock to the SEC within two business days, on Form 4. These filings are public, and a popular idea is that insiders&apos; purchases, made with their own money and better knowledge of the business, point to stocks that will do well. Older academic work supported a version of this: insider purchases earned more than the market, especially at smaller companies, though the edge narrowed once trading costs and later periods were taken into account (Seyhun, 1986; Lakonishok and Lee, 2001; Jeng, Metrick and Zeckhauser, 2003). Later work found the information sits in particular kinds of trades rather than in all of them (Cohen, Malloy and Pomorski, 2012).</p>
      <p>Websites that publish these filings, Arkanum included, go a step further and rank individual purchases. Arkanum gave each purchase a score from 0 to 100 and labelled the highest &ldquo;Strong signal&rdquo;. This paper asks a narrow question: <strong>does that score pick the purchases that go on to do better?</strong> It isolates the score by comparing each purchase only with other insider purchases filed the same month, so the market&apos;s ups and downs cancel out.</p>
      <p>The short answer is no. Figure 1 shows the median six-month result for each band of scores: there is no upward slope, and the top bands sit slightly below the middle ones.</p>
      <Figure n={1} title="Median six-month return by score, against the month's typical insider purchase." note={`${n(all.n)} purchases. 0% means the same as the median insider purchase filed that month. Source: SEC Form 4 data; Arkanum calculations.`}>
        <DivergingBars rows={bars(SCORE_BANDS)} />
      </Figure>
      <p>The rest of the paper describes the data and method (page 2), the results by score and by the traits behind it (page 3), how insider purchases did against the market, what Arkanum changed and the test&apos;s limits (page 4), and the full tables (page 5).</p>
    </>
  );
}

function Page1() {
  return (
    <>
      <h2>2. Data</h2>
      <p>Purchases come from the SEC&apos;s quarterly insider transaction data sets: every open-market purchase (transaction code P) on an original Form 4 by an officer or director, filed from {SAMPLE.from} to the end of 2025. Purchases by 10% owners who are neither officers nor directors, which are mostly investment funds, are excluded. To score &ldquo;first purchase in N years&rdquo;, each insider&apos;s history was read back to 2020.</p>
      <table className="ttable fit paper-table">
        <caption><strong>Table 1.</strong> Sample</caption>
        <tbody>
          <tr><td>Purchases scored</td><td className="mono r">{n(SAMPLE.scored)}</td></tr>
          <tr><td>Dropped: stock has no price history (654 of 3,751 stocks; mostly delisted or renamed)</td><td className="mono r">{n(SAMPLE.scored - SAMPLE.kept - SAMPLE.mismatched)}</td></tr>
          <tr><td>Dropped: filing price doesn&apos;t match the ticker&apos;s price (wrong or reused symbol)</td><td className="mono r">{n(SAMPLE.mismatched)}</td></tr>
          <tr><td><strong>Purchases kept</strong></td><td className="mono r"><strong>{n(SAMPLE.kept)}</strong></td></tr>
        </tbody>
      </table>

      <h2>3. Method</h2>
      <h3>3.1 The score</h3>
      <p>Each purchase was scored with exactly the formula Arkanum showed on its pages at the time, from 0 to 100. Labels: 60 and over &ldquo;Strong&rdquo;, 40 to 59 &ldquo;Notable&rdquo;, under 40 &ldquo;Routine&rdquo;.</p>
      <table className="ttable fit paper-table">
        <caption><strong>Table 2.</strong> What the score rewarded</caption>
        <thead><tr><th>Factor</th><th>Scored higher when</th></tr></thead>
        <tbody>
          <tr><td>Role</td><td>The buyer is the CEO, CFO, President or Chair rather than another officer or a director</td></tr>
          <tr><td>Stake</td><td>The purchase grows the insider&apos;s holding by a large share</td></tr>
          <tr><td>History</td><td>It is the insider&apos;s first purchase in years</td></tr>
          <tr><td>Cluster</td><td>Several insiders at the same company are buying</td></tr>
          <tr><td>Size</td><td>The purchase is large in dollars</td></tr>
          <tr><td>Plan</td><td>Penalty if the purchase was pre-planned under a Rule 10b5-1 trading plan</td></tr>
        </tbody>
      </table>
      <h3>3.2 Returns</h3>
      <p>Returns run from the first closing price <em>after the filing date</em>, the first moment the public could act, not the insider&apos;s own trade date, to 1, 3 and 6 months later, using daily closing prices.</p>
      <h3>3.3 Benchmarks</h3>
      <ul>
        <li><strong>{BENCH.month}.</strong> Each purchase&apos;s return minus the median return of all insider purchases filed in the same calendar month. This removes the market&apos;s moves and the timing, leaving only the question of whether the score ranks purchases. It is the main benchmark in this paper.</li>
        <li><strong>{BENCH.iwm}</strong> and <strong>{BENCH.spy}</strong>, over the same days: did insider purchases beat simply owning the market?</li>
      </ul>
      <h3>3.4 Statistics</h3>
      <p>For each group we report the number of purchases, the mean (winsorized at the 1st and 99th percentiles to stop a few huge winners dominating), the median, and the share of purchases that beat the benchmark (&ldquo;hit rate&rdquo;; 50% is a coin flip). The appendix also gives t-statistics; they overstate confidence because many purchases overlap in time and cluster in the same stocks, so the paper relies on medians and hit rates.</p>
    </>
  );
}

function Page2() {
  const strong = six("Strong (60+)"), routine = six("Routine (<40)"), big = six("Value $1M+"), plan = six("Pre-planned"), ceo = six("Top executive (CEO/CFO/President/Chair)"), dir = six("Director only");
  const penny = six("Price under $5"), five = six("Price $5+");
  return (
    <>
      <h2>4. Results</h2>
      <h3>4.1 The score did not rank purchases</h3>
      <p>Purchases scored 60 and over had a median six-month return of {signed(strong.median)} against the month&apos;s typical insider purchase, and {(p(strong.hit)).toFixed(0)}% beat it; purchases scored under 40 had {signed(routine.median)} and {(p(routine.hit)).toFixed(0)}%. The same held at one and three months (appendix, Table A1). Figure 2 shows the hit rate for each score band: all sit within a few points of a coin flip, and the two highest bands are below it.</p>
      <Figure n={2} title="Share of purchases that beat the month's typical insider purchase over six months, by score." note="50% = a coin flip.">
        <DotPlot rows={dots(SCORE_BANDS)} />
      </Figure>

      <h3>4.2 The traits behind the score</h3>
      <p>Figure 3 breaks the score into the traits it rewarded. Most made no real difference. Two went the wrong way: purchases of $1 million or more had the worst median of any group ({signed(big.median)}), and purchases by a CEO, CFO, President or Chair ({signed(ceo.median)}) did worse than purchases by directors ({signed(dir.median)}), the opposite of the usual advice. A first purchase in years, a big increase in the insider&apos;s stake and several insiders buying together were all close to zero.</p>
      <Figure n={3} title="Median six-month return by trait, against the month's typical insider purchase." note="Groups overlap: a purchase can be a CEO's, a first purchase and $1M+ at once.">
        <DivergingBars rows={bars(TRAITS)} />
      </Figure>

      <h3>4.3 The one rule that held</h3>
      <p>Pre-planned purchases, made under a Rule 10b5-1 trading plan set up in advance, did badly: a median of {signed(plan.median)}, and only {(p(plan.hit)).toFixed(0)}% beat the month (Figure 4). The score&apos;s penalty for them was right, but too few purchases are pre-planned ({n(plan.n)} of {n(SAMPLE.kept)}) for it to help the score overall.</p>
      <Figure n={4} title="Share of purchases that beat the month's typical insider purchase over six months, by trait.">
        <DotPlot rows={dots(TRAITS)} />
      </Figure>

      <h3>4.4 Cheap stocks behaved like lottery tickets</h3>
      <p>Purchases of stocks under $5 had a median of {signed(penny.median)} but a mean of {signed(penny.mean)}: most did worse than average, and a few soared. Above $5 the median and the mean were close ({signed(five.median)} and {signed(five.mean)}). Averages alone would make cheap stocks look like the best place to follow insiders; the medians say the typical purchase lagged.</p>
      <table className="ttable fit paper-table">
        <caption><strong>Table 3.</strong> Six months against the month&apos;s typical insider purchase, by share price</caption>
        <thead><tr><th>Group</th><th className="r">Purchases</th><th className="r">Median</th><th className="r">Mean</th><th className="r">Beat</th></tr></thead>
        <tbody>{[["Share price under $5", penny], ["Share price $5+", five]].map(([label, s]) => {
          const x = s as typeof penny;
          return <tr key={label as string}><td>{label as string}</td><td className="mono r">{n(x.n)}</td><td className="mono r">{signed(x.median)}</td><td className="mono r">{signed(x.mean)}</td><td className="mono r">{p(x.hit).toFixed(0)}%</td></tr>;
        })}</tbody>
      </table>

      <h3>4.5 Out of sample: purchases filed in 2026</h3>
      <p>A test run on the same years the score was built and discussed in can flatter or mislead. So the whole test was repeated, unchanged, on the {n(OOS.kept)} purchases filed from January to September 2026, which no part of this paper had looked at. Only purchases filed in the first quarter have six months of returns yet ({n(oosStat("All officer/director buys", "6 months").n)}), so these figures are less certain than the main ones.</p>
      <p>The main findings held (Figure 5, Table 4). The score still did not pick better purchases: scores of 60 and over had a median of {signed(oosStat("Strong (60+)", "6 months").median)}, against {signed(oosStat("Routine (<40)", "6 months").median)} for scores under 40. Purchases by a CEO, CFO, President or Chair ({signed(oosStat("Top executive (CEO/CFO/President/Chair)", "6 months").median)}) and purchases of $1 million or more ({signed(oosStat("Value $1M+", "6 months").median)}) again did worse than the month&apos;s typical insider purchase, more clearly than before, and directors again did better. One result reversed: three or more insiders buying together did well in 2026 ({signed(oosStat("3+ insiders buying", "6 months").median)}, {p(oosStat("3+ insiders buying", "6 months").hit).toFixed(0)}% beat the month) after making no difference in 2023 to 2025. It rests on one quarter of filings and relatively few companies, and needs another quarter of data before it can be taken seriously.</p>
      <Figure n={5} title="Median six-month return by group for purchases filed in 2026, against the month's typical insider purchase." note={`Purchases filed January to March 2026 (the only ones with six months of returns so far).`}>
        <DivergingBars rows={OOS_GROUPS.map((g) => ({ label: nameOf(g), value: p(oosStat(g, "6 months").median), n: oosStat(g, "6 months").n }))} />
      </Figure>
      <table className="ttable fit paper-table">
        <caption><strong>Table 4.</strong> Six months against the month&apos;s typical insider purchase: the main test and 2026</caption>
        <thead><tr><th>Group</th><th className="r">2023–2025</th><th className="r">2026</th></tr></thead>
        <tbody>{OOS_GROUPS.map((g) => { const a = stat("month", g, "6 months"), b = oosStat(g, "6 months"); return (
          <tr key={g}><td>{nameOf(g)}</td><td className="mono r">{signed(a.median)}<span className="muted"> · {p(a.hit).toFixed(0)}%</span></td><td className="mono r">{signed(b.median)}<span className="muted"> · {p(b.hit).toFixed(0)}%</span><div className="muted small">{n(b.n)} purchases</div></td></tr>
        ); })}</tbody>
      </table>
    </>
  );
}

const OOS_GROUPS = ["Strong (60+)", "Routine (<40)", "Top executive (CEO/CFO/President/Chair)", "Director only", "Value $1M+", "Pre-planned", "3+ insiders buying", "First buy in 2+ years"];

function Page3() {
  const g = "All officer/director buys";
  const lim = Math.ceil(Math.max(...(["month", "iwm", "spy"] as Bench[]).flatMap((b) => HORIZONS.map((h) => Math.abs(p(stat(b, g, h).median)))))) + 1;
  const iwm6 = stat("iwm", g, "6 months"), spy6 = stat("spy", g, "6 months");
  return (
    <>
      <h2>5. Against the market</h2>
      <p>Comparing with other insider purchases answers whether the score ranks them. A different question is whether insider purchases, taken together, beat simply owning the market. They did not in this period. Over six months the median purchase trailed small-company stocks (the IWM fund) by {signed(iwm6.median).replace("−", "")} and {p(iwm6.hit).toFixed(0)}% beat it; against the S&amp;P 500 it trailed by {signed(spy6.median).replace("−", "")}, with {p(spy6.hit).toFixed(0)}% beating it (Figure 6). The larger gap against the S&amp;P 500 is mostly because small companies, where most insider buying happens, lagged large ones in 2023 to 2025.</p>
      <Figure n={6} title="Median return of all officer and director purchases against each benchmark, at 1, 3 and 6 months." note={`${n(stat("month", g, "6 months").n)} purchases at six months.`}>
        <div className="paper-panels">
          {(["month", "iwm", "spy"] as Bench[]).map((b) => (
            <ColumnPanel key={b} title={b === "month" ? "Same-month insider buys" : b === "iwm" ? "Small caps (IWM)" : "S&P 500 (SPY)"} lim={lim}
              cols={HORIZONS.map((h) => ({ label: h.replace(" months", "m").replace(" month", "m"), value: p(stat(b, g, h).median) }))} />
          ))}
        </div>
      </Figure>

      <h2>6. Discussion</h2>
      <p>The rules of thumb behind insider-buying scores are intuitive, and some have support in older research. In this recent, three-year sample they did not separate better purchases from worse ones, and the two most celebrated (big purchases and CEO purchases) pointed the wrong way. A plausible reading is that widely known signals get priced in: once websites highlight a CEO&apos;s $5 million purchase, the price may move before most readers can act, and our returns start only after the filing was public. This paper does not test that explanation.</p>
      <h3>6.1 What Arkanum changed</h3>
      <p>Purchases are no longer called &ldquo;Strong signals&rdquo;. The labels now say what the score measures: <strong>Unusual</strong>, <strong>Somewhat unusual</strong> or <strong>Routine</strong>, meaning how out of the ordinary a purchase is for that person, not how it will do. Claims that group buying is &ldquo;the strongest signal&rdquo; were removed. The filings are still worth reading: an unusual purchase is a reason to look closer, not a reason to buy. <Link href="/">See this month&apos;s most unusual insider purchases ›</Link></p>

      <h2>7. Limits of the test</h2>
      <ul>
        <li><strong>A short history.</strong> Older studies found insider purchases did beat the market, with the edge shrinking over time. The 2026 check (section 4.5) supports these results, but it covers only nine months of filings and one quarter of six-month returns.</li>
        <li><strong>Delisted stocks.</strong> 654 stocks had no price history, mostly delisted companies. Delistings usually mean losses, so the true results are probably a little worse, not better.</li>
        <li><strong>Overlapping purchases.</strong> Many purchases overlap in time and cluster in the same stocks, so the evidence is less certain than {n(SAMPLE.kept)} purchases makes it sound.</li>
        <li><strong>One formula.</strong> A different combination of factors might work. Arkanum hasn&apos;t tested a reweighted score on data it wasn&apos;t built from, and won&apos;t claim one works until it has.</li>
      </ul>

      <h2>8. Conclusion</h2>
      <p>A score built from the usual insider-buying rules did not pick purchases that did better over one, three or six months in 2023 to 2025, the same was true of purchases filed in 2026, and insider purchases as a whole trailed the market. Arkanum now describes purchases as unusual or routine rather than as signals, and treats the filings as information to read, not a list of stocks to buy.</p>
    </>
  );
}

function Page4() {
  const list = groups("month");
  const row = (b: Bench) => list.map((g) => (
    <tr key={g}>
      <td>{nameOf(g)}</td>
      {HORIZONS.map((h) => { const s = stat(b, g, h); return <td key={h} className="mono r">{signed(s.median)}<span className="muted"> · {p(s.hit).toFixed(0)}%</span></td>; })}
      <td className="mono r muted">{n(stat(b, g, "6 months").n)}</td>
    </tr>
  ));
  return (
    <>
      <h2>Appendix</h2>
      <p>Each cell: median return against the benchmark · share of purchases that beat it. Purchases counted at six months (slightly fewer than at one month, as the most recent purchases had no six-month price yet).</p>
      {(["month", "iwm", "spy"] as Bench[]).map((b, i) => (
        <div key={b} className="paper-table-wrap">
          <table className="ttable fit paper-table">
            <caption><strong>Table A{i + 1}.</strong> Against {BENCH[b].toLowerCase().replace("s&p", "S&P").replace("iwm", "IWM").replace("spy", "SPY")}</caption>
            <thead><tr><th>Group</th>{HORIZONS.map((h) => <th key={h} className="r">{h}</th>)}<th className="r">n</th></tr></thead>
            <tbody>{row(b)}</tbody>
          </table>
        </div>
      ))}
      <h3>Notes on the statistics</h3>
      <p>Means are winsorized at the 1st and 99th percentiles. t-statistics for each cell are in the project&apos;s results file; they assume independent purchases, which these are not (purchases overlap in time and cluster in the same stocks), so they overstate confidence. Results were generated on {SAMPLE.generated.slice(0, 10)}.</p>

      <p>A companion paper runs the same test on insider sales: <Link href="/research/insider-sales">Do insider stock sales predict anything?</Link> (working paper no. 2).</p>

      <h2>References</h2>
      <ol className="paper-refs">
        <li>Cohen, L., Malloy, C. and Pomorski, L. (2012). Decoding inside information. <em>Journal of Finance</em>, 67(3), 1009–1043.</li>
        <li>Jeng, L. A., Metrick, A. and Zeckhauser, R. (2003). Estimating the returns to insider trading: a performance-evaluation perspective. <em>Review of Economics and Statistics</em>, 85(2), 453–471.</li>
        <li>Lakonishok, J. and Lee, I. (2001). Are insider trades informative? <em>Review of Financial Studies</em>, 14(1), 79–111.</li>
        <li>Seyhun, H. N. (1986). Insiders&apos; profits, costs of trading, and market efficiency. <em>Journal of Financial Economics</em>, 16(2), 189–212.</li>
        <li>U.S. Securities and Exchange Commission. Insider transactions data sets (Forms 3, 4 and 5), quarterly files 2020–2025.</li>
      </ol>
      <p className="muted small">Not investment advice. Returns computed from daily closing prices and published only as these summary statistics.</p>
    </>
  );
}

const BODIES = [Page0, Page1, Page2, Page3, Page4];

export function PaperPageView({ i }: { i: number }) {
  const Body = BODIES[i];
  return (
    <Paper base={BASE} title={TITLE} date={DATE} pages={PAGES} current={i}>
      <Body />
    </Paper>
  );
}
