// Open data: every file the site itself reads is public. This page says what each holds, how
// often it changes, and how to use it, so power users don't need an API.
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open data",
  description: "Arkanum Data's insider, Congress, fund and company-holdings data as free JSON files: what each contains, how often it updates, and how to use it.",
  alternates: { canonical: "/open-data" },
};

const SITE = "https://arkanumdata.vercel.app";
const FILES: [path: string, what: string, updated: string][] = [
  ["/data/insiders.json", "Open-market buys, sales and other Form 4 transactions by insiders over the last 30 days, one row per filing and insider, with Arkanum's labels (how unusual, large unplanned sale).", "Daily, evenings"],
  ["/data/insiders-today.json", "The same for filings since the last daily file.", "Hourly on weekdays"],
  ["/data/overview.json", "The homepage numbers and lists, including each listed trade's return since filing against the S&P 500 (since: s stock, m S&P, d trading days).", "Hourly on weekdays"],
  ["/data/people.json", "The insider directory: SEC ID, name, latest company and role.", "Daily"],
  ["/data/congress-trades.json", "Every stock trade House members reported in the last two years: member, party and seat, ticker, buy or sale, reported range, trade and disclosure dates, link to the report, and returns (r: stock and S&P since the trade, then since disclosure).", "Weekday evenings"],
  ["/data/congress-overview.json", "The Congress page: headline numbers, latest trades, most bought and sold and most active members over 30 days, 90 days, 1 year and 2 years (estimated dollars from range midpoints), and each member's returns summary.", "Weekday evenings"],
  ["/data/congress/<member>.json", "One file per member, e.g. /data/congress/nancy-pelosi.json: all their stock trades with returns.", "Weekday evenings"],
  ["/data/funds.json", "The tracked big funds' latest 13F holdings and quarter-on-quarter changes.", "Daily; 13Fs arrive quarterly"],
  ["/data/stakes.json", "What listed companies hold in other public companies (13F, 13D/13G).", "Weekday mornings"],
  ["/data/private.json", "Private funding rounds listed companies took part in, from press releases (not verified).", "Hourly"],
  ["/data/screener.json", "Fundamentals for about 4,600 US-listed companies from their SEC filings.", "Daily"],
  ["/data/digests/index.json", "The daily digest archive; each digest is at /data/digests/<date>.json.", "Weekdays, 5 PM ET"],
];

export default function OpenData() {
  return (
    <div className="stack prose">
      <section className="card">
        <h1>Open data</h1>
        <p>Every number on Arkanum comes from files anyone can download. No key and no sign-up: they are plain JSON on the same address as the site, and each has an <code>updated</code> time. The underlying filings are public domain; the labels, returns and research are Arkanum&apos;s own, free to use with credit to Arkanum Data.</p>
        <p className="muted small">Formats can change without notice, so check fields before you rely on them. Please fetch at most once an hour: the files don&apos;t change faster than that. Prices are never included (only the returns computed from them).</p>
      </section>

      <section className="card flush">
        <div className="card-title"><h2>Files</h2></div>
        <div className="paper-table-wrap">
          <table className="ttable fit">
            <thead><tr><th>File</th><th>What it holds</th><th>Updated</th></tr></thead>
            <tbody>{FILES.map(([path, what, updated]) => (
              <tr key={path}>
                <td className="mono small">{path.includes("<") ? path : <a href={SITE + path}>{path}</a>}</td>
                <td className="small">{what}</td>
                <td className="small muted">{updated}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Research results and history</h2>
        <p>The research tables behind the papers and the <Link href="/research/report-card">report card</Link> (every group, every horizon, against each benchmark) are in the public repository under <a href="https://github.com/maximaripov/Arkanum-Data/tree/main/docs/backtest" target="_blank" rel="noreferrer">docs/backtest</a>, along with the code that builds every file above and its full history.</p>
        <p className="small muted">Questions or a format you need? <Link href="/about#contact">Contact</Link>.</p>
      </section>
    </div>
  );
}
