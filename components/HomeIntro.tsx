// The homepage (the insider dashboard is on /insiders): a short hero (what
// Arkanum is, what it's for), the three kinds of trade, and the research with its findings and
// papers. Server-rendered; every figure comes from the research files (lib/findings.ts).
import Link from "next/link";
import { findings } from "@/lib/findings";
import { SAMPLE } from "@/lib/research";
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
  const lead = f.find((x) => x.id === "market")!;
  const more = ["cheap", "size", "planned"].map((id) => f.find((x) => x.id === id)!).filter(Boolean);
  return (
    <>
      {/* One message, one line of proof, two ways in. */}
      <section className="home-hero" aria-labelledby="hero-title">
        <p className="hero-kicker">Independent research · free · no account</p>
        <h1 id="hero-title" className="hi-title">Follow the money. Test the signal.</h1>
        <p className="hi-lead">What company insiders, members of Congress and big funds buy and sell, from their filings, next to how trades like them have done. Other sites sell insider signals; we test them and publish every result.</p>
        <ul className="hero-proof" aria-label="Why trust it">
          <li><Link href="/about?tab=data">Official SEC and House filings</Link></li>
          <li><Link href="/research">Tested against history</Link></li>
          <li><Link href="/research/methodology">Methodology published</Link></li>
        </ul>
        <div className="hero-actions">
          <Link className="btn primary" href="/insiders">Today&apos;s trades ›</Link>
          <OpenSearch className="btn">Check a stock</OpenSearch>
        </div>
      </section>

      <div className="home-explain">
        {/* The research as one finding with its real sample; the others one click away. */}
        <section className="home-research home-spot" aria-labelledby="research-title">
          <h2 id="research-title" className="kinds-title">From {SAMPLE.kept.toLocaleString("en-US")} insider purchases, 2023–25</h2>
          <Link href={lead.href} className="spot-fig mono">{lead.figure}</Link>
          <p className="spot-head"><strong>{lead.head}</strong></p>
          <p className="muted small">{lead.body} Returns start when each purchase became public.</p>
          <details className="spot-more">
            <summary>{more.length} more results</summary>
            <ul>{more.map((x) => <li key={x.id}><Link href={x.href}><span className="mono">{x.figure}</span> {x.head}</Link> <span className="muted small">{x.figureNote}</span></li>)}</ul>
          </details>
          <Link href="/research" className="small">All findings and papers ›</Link>
        </section>
        <TradeKinds compact />
        {/* The papers as one full-width strip under both cards, so neither card leaves empty space. */}
        <nav className="home-papers" aria-label="Research papers">
          <span className="kinds-title">The research</span>
          <ul>{PAPERS.map(([href, t]) => <li key={href}><Link href={href}>{t} ›</Link></li>)}</ul>
        </nav>
      </div>
    </>
  );
}
