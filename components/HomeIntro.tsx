// The homepage (the insider dashboard is on /insiders): a compact hero (what
// Arkanum is, what it's for), the three kinds of trade, and the research with its findings and
// papers. Server-rendered; every figure comes from the research files (lib/findings.ts).
import Link from "next/link";
import { findings } from "@/lib/findings";
import { OOS, SALES, SALES_OOS, SAMPLE } from "@/lib/research";
import { TradeKinds } from "./TradeKinds";
import { OpenSearch } from "./OpenSearch";

const PAPERS: [string, string][] = [
  ["/research/insider-buys", "Do insider buys beat the market?"],
  ["/research/insider-sales", "Do insider sales predict anything?"],
  ["/research/filing-delay", "What the filing delay costs"],
  ["/research/house-trades", "Do House members' trades beat the market?"],
  ["/research/fund-copying", "Does copying famous funds work?"],
  ["/research/report-card", "Report card: do the labels still hold?"],
  ["/research/lab", "Research lab: test your own strategy"],
];

export function HomeIntro() {
  const f = findings();
  const tested = SAMPLE.kept + OOS.kept + SALES.kept + SALES_OOS.kept;
  const show = ["cheap", "size", "planned", "market"].map((id) => f.find((x) => x.id === id)!).filter(Boolean);
  return (
    <>
      <section className="home-hero" aria-labelledby="hero-title">
        <p className="hero-kicker">Independent research · free · no account</p>
        <h1 id="hero-title" className="hi-title">Follow the money. Test the signal.</h1>
        <p className="hi-lead">Insider, Congress and fund trades from official filings, next to how trades like them have actually done. Other sites sell insider signals; we test them and publish every result.</p>
        <ul className="hero-uses" aria-label="What you can do here">
          <li><OpenSearch><strong>Check a stock</strong></OpenSearch> <span className="muted">who inside bought or sold, and how trades like it did</span></li>
          <li><Link href="/markets"><strong>Follow people and funds</strong></Link> <span className="muted">executives, House members, funds; a ping when they trade</span></li>
          <li><Link href="/research"><strong>See what has worked</strong></Link> <span className="muted">{(Math.floor(tested / 1000) * 1000).toLocaleString("en-US")}+ trades tested</span></li>
        </ul>
        <div className="hero-actions">
          <Link className="btn primary" href="/insiders">Today&apos;s trades ›</Link>
          <Link className="btn" href="/research">Read the research ›</Link>
        </div>
      </section>

      <div className="home-explain">
        <TradeKinds compact />
        <section className="home-research" aria-labelledby="research-title">
          <h2 id="research-title" className="kinds-title">What the research found</h2>
          <div className="hi-findings">
            {show.map((x) => (
              <Link key={x.id} href={x.href} className="hi-find" title={`${x.body} (${x.figureNote})`} aria-label={`${x.figure}: ${x.head} (${x.figureNote})`}>
                <span className="mono">{x.figure}</span> {x.head}
              </Link>
            ))}
          </div>
          <p className="hi-note muted small">Six-month medians vs other insider buys that month (not the market), except the S&amp;P 500 one.</p>
        </section>
        {/* The papers as one full-width strip under both cards, so neither card leaves empty space. */}
        <nav className="home-papers" aria-label="Research papers">
          <span className="kinds-title">The research</span>
          <ul>{PAPERS.map(([href, t]) => <li key={href}><Link href={href}>{t} ›</Link></li>)}</ul>
        </nav>
      </div>

    </>
  );
}
