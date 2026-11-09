// "Do House members' stock trades beat the market?" as a two-page working paper (no. 4).
// Every number comes from the study output (docs/backtest/congress.json, written by
// scripts/diagnose/congress-study.mjs), so the paper and the data can't drift apart.
import Link from "next/link";
import type { Metadata } from "next";
import { Paper, type PaperPage } from "@/components/research/Paper";
import { PaperPrint } from "@/components/research/PaperPrint";
import { DivergingBars, Figure } from "@/components/research/Charts";
import study from "@/docs/backtest/congress.json";

type S = { n: number; median?: number; up?: number; lo?: number; hi?: number; months?: number };
type G = { n: number; member: Record<string, S>; follower: Record<string, S>; memberEq: Record<string, S>; followerEq: Record<string, S>; head: S };
const BUYS = Object.fromEntries(study.buys as [string, G][]), SALES = Object.fromEntries(study.sales as [string, G][]);

export const BASE = "/research/house-trades";
const N = (Math.floor(study.kept / 100) * 100).toLocaleString("en-US");
export const TITLE = `Do House members' stock trades beat the market? A test of ${N} trades`;
const DATE = "November 2026";
export const PAGES: PaperPage[] = [
  { slug: "", title: "Abstract, data and method" },
  { slug: "results", title: "Results, limits and references" },
];

const pc = (x?: number) => (x == null ? 0 : Math.round(x * 1000) / 10);
const signed = (x?: number) => { const v = pc(x); return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`; };
const range = (s: S) => (s.lo == null ? "" : ` (90% range ${signed(s.lo)} to ${signed(s.hi)})`);
const n = (x: number) => x.toLocaleString("en-US");
const day = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const F6 = (g: G) => g.followerEq["6 months"], M6 = (g: G) => g.memberEq["6 months"];
const GROUPS = Object.keys(BUYS).filter((g) => g !== "All" && g !== "Disclosed after the 45-day deadline");
// Does any group of buys have a six-month result clearly above the benchmark (whole 90% range above zero)?
const clearlyAbove = (side: Record<string, G>, get: (g: G) => S) => Object.entries(side).filter(([, g]) => (get(g).lo ?? -1) > 0).map(([k]) => k);

const DESCRIPTIONS = [
  `Arkanum tested ${n(study.kept)} stock trades disclosed by members of the U.S. House from late 2024 to 2026 against the S&P 500, from the trade date and from the day each trade became public.`,
  "House members' buys trailed the market about as much as the stocks they sold, by party, size, account and how late the trade was disclosed. Charts and numbers at 1, 3 and 6 months.",
];
export function paperMetadata(i: number): Metadata {
  const url = PAGES[i].slug ? `${BASE}/${PAGES[i].slug}` : BASE;
  const title = i === 0 ? TITLE : `${PAGES[i].title} · ${TITLE}`;
  return { title, description: DESCRIPTIONS[i], alternates: { canonical: url }, openGraph: { title: `${title} · Arkanum Data`, description: DESCRIPTIONS[i], url, type: "article", images: "/opengraph-image" } };
}

function Page0() {
  const b = BUYS["All"], s = SALES["All"];
  return (
    <>
      <section className="paper-abstract">
        <h2>Abstract</h2>
        <p>Members of the U.S. House must disclose their stock trades within 45 days, and a whole genre of websites invites readers to copy them. We tested {n(study.kept)} stock purchases and sales disclosed by {study.members} House members, traded from {day(study.tradedFrom)}, measuring what each stock did over the following one, three and six months against the S&amp;P 500 and against the equal-weighted S&amp;P 500, in which every company counts the same. Measured from the day a trade became public, the median purchase did {signed(F6(b).median)} against the equal-weighted index over six months{range(F6(b))}, and the median stock members sold did {signed(F6(s).median)}: what they bought did no better than what they sold. Measured from the members&apos; own trade dates, purchases did {signed(M6(b).median)}. {clearlyAbove(BUYS, F6).length === 0 ? "No group of purchases (by party, size, account or disclosure delay) did clearly better than the index." : `Only these groups of purchases did clearly better than the index: ${clearlyAbove(BUYS, F6).join(", ")}.`}</p>
        <p className="paper-keywords"><strong>Keywords:</strong> Congress, STOCK Act, Periodic Transaction Reports, event study, copy trading</p>
      </section>

      <h2>1. Introduction</h2>
      <p>The STOCK Act of 2012 requires members of Congress to report their stock trades in Periodic Transaction Reports, filed with the House Clerk within 45 days. Because members vote on laws and hear briefings that move markets, many people assume their trades carry an edge, and websites rank members by their trading and alert subscribers to new filings. This paper asks the question a reader of those sites faces: had you bought each stock a House member reported buying, as soon as the report was public, would you have beaten the market? It is a companion to Arkanum&apos;s tests of company insiders&apos; <Link href="/research/insider-buys">purchases</Link> and <Link href="/research/insider-sales">sales</Link>, and uses the same methods where they apply.</p>

      <h2>2. Data</h2>
      <p>The trades come from the House Clerk&apos;s Periodic Transaction Reports, as collected for Arkanum&apos;s <Link href="/congress">Congress pages</Link> (file updated {day(study.dataUpdated.slice(0, 10))}). We kept stock purchases and sales with a ticker and a clear trade date, one per line of a report: {n(study.trades)} trades. Of these, {n(study.noPrice)} had no usable price history and {n(study.laterListing)} had a ticker that now belongs to a later listing, leaving <strong>{n(study.kept)}</strong> trades by {study.members} members: {n(b.n)} purchases and {n(s.n)} sales. The Senate is not covered: its disclosure site blocks automated access.</p>
      <p>Disclosure is slow. The median trade was disclosed {study.lagDays.median} days after it was made, one in ten took {study.lagDays.p90} days or more, and {Math.round(study.lagDays.over45 * 100)}% were disclosed after the 45-day deadline.</p>

      <h2>3. Method</h2>
      <p><strong>Two starting points.</strong> For each trade we measure the stock from the close on the trade date (what the member got) and from the first close after the report was filed (what a reader could get). Returns run one, three and six months (21, 63 and 126 trading days), using daily closes adjusted for splits and dividends.</p>
      <p><strong>Two benchmarks.</strong> Each return is compared with the S&amp;P 500 over the same days, and with the equal-weighted S&amp;P 500 (RSP). In 2025 and 2026 a handful of very large companies drove the ordinary index, so most individual stocks trailed it; the equal-weighted index removes that, and is the fairer test of stock picking. We report the equal-weighted results first.</p>
      <p><strong>Purchases against sales.</strong> If members knew something, the stocks they bought should do better than the stocks they sold. Comparing the two is a test that doesn&apos;t depend on the benchmark at all.</p>
      <p><strong>Statistics.</strong> We report medians, since a few large moves dominate averages, and the share of trades that beat the benchmark. Trades disclosed in the same month share the same market, so they are not independent: each six-month median carries a 90% range from a bootstrap that resamples whole disclosure months (400 resamples), as in the insider papers. Report amounts are given only as ranges ($1,001–15,000 and up), so each trade counts once, whatever its size; a dollar-weighted view is in the appendix table.</p>
      <p className="muted small">Not investment advice.</p>
    </>
  );
}

const bar = (side: Record<string, G>, get: (g: G) => S) => GROUPS.map((g) => ({ label: g, value: pc(get(side[g]).median), n: get(side[g]).n })).sort((a, z) => a.value - z.value);

function Page1() {
  const b = BUYS["All"], s = SALES["All"];
  const spyB = b.follower["6 months"], spyS = s.follower["6 months"];
  const late = BUYS["Disclosed after the 45-day deadline"], top = BUYS["The 10 most active traders"], rest = BUYS["Everyone else"];
  return (
    <>
      <h2>4. Results</h2>
      <h3>4.1 Purchases did no better than sales</h3>
      <p>Six months after the report was public, the median purchase was {signed(F6(b).median)} against the equal-weighted S&amp;P 500{range(F6(b))}, and {Math.round((F6(b).up ?? 0) * 100)}% beat it. The median stock a member sold was {signed(F6(s).median)}{range(F6(s))}. Against the ordinary S&amp;P 500 both look worse ({signed(spyB.median)} and {signed(spyS.median)}), because the largest companies led the market in this period. Either way, the stocks members bought and the stocks they sold ended up in much the same place: there is no sign that one side knew more than the other.</p>

      <h3>4.2 The members themselves did no better</h3>
      <p>Measured from their own trade dates, which no follower can match, members&apos; purchases were {signed(M6(b).median)} against the equal-weighted index over six months{range(M6(b))}. Between the trade and the report, the median purchased stock moved {signed(b.head.median)} against the S&amp;P 500: followers did not miss a run-up while waiting for the disclosure.</p>

      <h3>4.3 By party, size, account and delay</h3>
      <p>Figure 1 shows the six-month result from disclosure for each group of purchases. {clearlyAbove(BUYS, F6).length === 0 ? "None did clearly better than the index: every group's 90% range reaches zero or lies below it." : `Groups with a 90% range wholly above zero: ${clearlyAbove(BUYS, F6).join(", ")}.`} The ten members who traded most, who made {n(top.n)} of the {n(b.n)} purchases, did {signed(F6(top).median)} against everyone else&apos;s {signed(F6(rest).median)}. Purchases disclosed after the 45-day deadline ({n(late.n)}) are too few, and too spread out, to read: their 90% range runs from {signed(F6(late).lo)} to {signed(F6(late).hi)}.</p>
      <Figure n={1} title="Median six-month return after the report was public, purchases by group, against the equal-weighted S&P 500." note="Groups overlap: a purchase can be a Republican's, $15K–50K and disclosed within 30 days at once.">
        <DivergingBars rows={bar(BUYS, F6)} label="Median 6-month return vs the equal-weighted S&P 500" unit="purchases" />
      </Figure>
      <Figure n={2} title="The same for sales: median six-month return after the report was public." note="Negative: the stock did worse after the member sold it, which would favour the member.">
        <DivergingBars rows={bar(SALES, F6)} label="Median 6-month return vs the equal-weighted S&P 500" unit="sales" />
      </Figure>

      <h2>5. Discussion</h2>
      <p>Over these two years, House members&apos; disclosed trades were not a source of better stock picks, for followers or for the members themselves. That matches more recent academic work, which found little or no edge in members&apos; portfolios from 2004 to 2008 (Eggers and Hainmueller, 2013) and after the STOCK Act (Belmont et al., 2022), and contrasts with an older study of senators&apos; trades in the 1990s that found a large one (Ziobrowski et al., 2004). It does not show that no member ever trades on what they know: a few well-timed trades can hide inside thousands of ordinary ones, and this test looks at the typical trade, not the best one.</p>

      <h2>6. Limits of the test</h2>
      <ul>
        <li><strong>A short period.</strong> Trades from late 2024 to 2026, so six-month results cover only about {F6(b).months ?? 0} disclosure months. A different period could look different.</li>
        <li><strong>House only.</strong> The Senate&apos;s disclosure site blocks automated access.</li>
        <li><strong>Amounts are ranges.</strong> Every trade counts once; most are in the smallest range ($1,001–15,000).</li>
        <li><strong>Accounts.</strong> Many trades are a spouse&apos;s or a child&apos;s, or made by a manager the member may not direct; Figure 1 separates the member&apos;s own account.</li>
        <li><strong>Prices.</strong> Daily closes adjusted for splits and dividends, from a free source; {n(study.noPrice)} trades had none.</li>
      </ul>

      <h2>7. Conclusion</h2>
      <p>Copying House members&apos; disclosed stock trades would not have beaten the market in 2025 and 2026, and the members&apos; own purchases did no better than the stocks they sold. Arkanum shows these trades because they are public and newsworthy, not as a list of stocks to buy.</p>

      <h2>Appendix: all groups</h2>
      <div className="table-wrap">
        <table className="data-table paper-table">
          <thead><tr><th>Group</th><th className="r">Trades</th><th className="r">Follower, equal-weighted</th><th className="r">Follower, S&amp;P 500</th><th className="r">Member, equal-weighted</th></tr></thead>
          <tbody>{(["buys", "sales"] as const).flatMap((sideName) => {
            const side = sideName === "buys" ? BUYS : SALES;
            return [
              <tr key={sideName}><td colSpan={5}><strong>{sideName === "buys" ? "Purchases" : "Sales"}</strong></td></tr>,
              ...Object.entries(side).map(([g, x]) => (
                <tr key={sideName + g}><td>{g}</td><td className="mono r">{n(x.n)}</td><td className="mono r">{x.followerEq["6 months"].median == null ? "—" : signed(x.followerEq["6 months"].median)}</td><td className="mono r">{x.follower["6 months"].median == null ? "—" : signed(x.follower["6 months"].median)}</td><td className="mono r">{x.memberEq["6 months"].median == null ? "—" : signed(x.memberEq["6 months"].median)}</td></tr>
              )),
            ];
          })}</tbody>
        </table>
      </div>
      <p className="muted small">Six-month medians. Prices through {day(study.pricesThrough)}.</p>

      <h2>References</h2>
      <ol className="paper-refs">
        <li>Belmont, W., Sacerdote, B., Sehgal, R. and Van Hoek, I. (2022). Do senators and house members beat the stock market? Evidence from the STOCK Act. <em>Journal of Public Economics</em>, 207, 104602.</li>
        <li>Eggers, A. C. and Hainmueller, J. (2013). Capitol losses: the mediocre performance of congressional stock portfolios. <em>Journal of Politics</em>, 75(2), 535–551.</li>
        <li>Ziobrowski, A. J., Cheng, P., Boyd, J. W. and Ziobrowski, B. J. (2004). Abnormal returns from the common stock investments of the U.S. Senate. <em>Journal of Financial and Quantitative Analysis</em>, 39(4), 661–676.</li>
        <li>U.S. House of Representatives, Office of the Clerk. Financial disclosure reports: Periodic Transaction Reports, 2024–2026.</li>
      </ol>
      <p className="muted small">Not investment advice.</p>
    </>
  );
}

const BODIES = [Page0, Page1];
export function PaperPageView({ i }: { i: number }) {
  const Body = BODIES[i];
  return <Paper base={BASE} title={TITLE} date={DATE} pages={PAGES} current={i} no={4}><Body /></Paper>;
}
export function PaperPrintView() {
  return <PaperPrint base={BASE} title={TITLE} date={DATE} no={4} pages={PAGES} bodies={BODIES.map((B, i) => <B key={i} />)} />;
}
