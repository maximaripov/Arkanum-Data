// The top of the homepage: what Arkanum is in one line, one obvious first step (the search),
// a short "start here" path, and a compact strip of research findings. Server-rendered.
import Link from "next/link";
import { Search } from "./Search";
import { findings } from "@/lib/findings";
import { OOS, SALES, SALES_OOS, SAMPLE } from "@/lib/research";

export function HomeIntro() {
  const f = findings();
  const tested = SAMPLE.kept + OOS.kept + SALES.kept + SALES_OOS.kept;
  const show = ["cheap", "size", "planned", "market"].map((id) => f.find((x) => x.id === id)!).filter(Boolean);
  return (
    <section className="home-intro">
      <h1 className="hi-title">Insider and Congress trades, with the evidence.</h1>
      <p className="hi-tag">Other sites sell you insider signals. We test them.</p>
      <p className="hi-lead">Every trade from SEC and House filings, linked to the source, next to how trades like it have actually performed. We publish the results, including when our own labels don&apos;t work.</p>
      <div className="hi-search"><Search placeholder="Search a stock, insider, politician or fund" /></div>
      <ol className="hi-steps" aria-label="Start here">
        <li><div><span className="hi-n">1</span><div><strong>Look anything up</strong><span className="muted small">A stock, an executive, a member of Congress or a fund, in the box above.</span></div></div></li>
        <li><Link href="/markets"><span className="hi-n">2</span><div><strong>Follow what matters to you</strong><span className="muted small">Add stocks to your watchlist and follow people; get a ping when they trade.</span></div></Link></li>
        <li><Link href="/research/report-card"><span className="hi-n">3</span><div><strong>Check what the labels are worth</strong><span className="muted small">The report card: how each label did, re-checked every month.</span></div></Link></li>
      </ol>
      <div className="hi-findings">
        <span className="hi-kicker">What actually mattered · {(Math.floor(tested / 1000) * 1000).toLocaleString("en-US")}+ trades tested, six months after the filing</span>
        {show.map((x) => (
          <Link key={x.id} href={x.href} className="hi-find" title={`${x.body} (${x.figureNote})`}>
            <span className="mono">{x.figure}</span> {x.head}
          </Link>
        ))}
        <Link href="/research" className="hi-find more">All findings ›</Link>
        <p className="hi-note muted small">Figures are six-month medians against other insider buys filed the same month, which is not the market, except the S&amp;P 500 one.</p>
      </div>
    </section>
  );
}
