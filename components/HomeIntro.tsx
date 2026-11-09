// The top of the homepage: what Arkanum is in one line, the search for everything on the
// site, and three findings from the research with their numbers. Server-rendered.
import Link from "next/link";
import { Search } from "./Search";
import { findings } from "@/lib/findings";
import { OOS, SALES, SALES_OOS, SAMPLE } from "@/lib/research";

export function HomeIntro() {
  const f = findings();
  const tested = SAMPLE.kept + OOS.kept + SALES.kept + SALES_OOS.kept;
  const show = ["unusual", "size", "sales"].map((id) => f.find((x) => x.id === id)!).filter(Boolean);
  return (
    <section className="home-intro span12">
      <div className="hi-top">
        <h1 className="hi-title">Insider and Congress trades, with the evidence.</h1>
        <p className="hi-lead">Every trade from SEC and House filings, linked to the source, next to how trades like it have actually performed. We test our own labels and publish the results, including when they don&apos;t work.</p>
        <div className="hi-search"><Search placeholder="Search a stock, insider, politician…" /></div>
        <nav className="hi-links" aria-label="Sections">
          <a href="/?view=trades">Insider trades</a>
          <Link href="/congress">Congress trades</Link>
          <a href="/?view=funds">Big funds</a>
          <Link href="/stakes">Company holdings</Link>
          <Link href="/research">Research</Link>
        </nav>
      </div>
      <div className="hi-findings">
        <p className="hi-kicker">What our research found <span className="muted">· 2 working papers, {(Math.floor(tested / 1000) * 1000).toLocaleString("en-US")}+ trades tested</span></p>
        <div className="hi-cards">
          {show.map((x) => (
            <Link key={x.id} href={x.href} className="hi-card">
              <span className="hi-fig mono">{x.figure}</span>
              <span className="hi-fignote muted small">{x.figureNote}</span>
              <strong>{x.head}</strong>
              <span className="muted small">{x.body}</span>
            </Link>
          ))}
        </div>
        <Link href="/research" className="linkbtn">All findings and the papers ›</Link>
      </div>
    </section>
  );
}
