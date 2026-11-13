import type { Metadata } from "next";
import Link from "next/link";
import { readOverview } from "@/lib/siteData";
import { WaitlistForm } from "@/components/WaitlistForm";

// The planned Arkanum API: what it would offer, an example response from today's data, the
// planned prices and an early-access list. Nothing is sold yet; the sign-ups measure demand.
export const metadata: Metadata = {
  title: "Insider trading API (early access)",
  description: "A planned API of SEC insider trades already analysed: cleaned names and roles, an activity score with reasons, group buys, pre-planned trade flags, company risk flags and fund holdings. Join the early-access list.",
  alternates: { canonical: "/developers" },
  openGraph: { title: "Insider trading API (early access) · Arkanum Data", url: "/developers", images: "/opengraph-image" },
};
export const revalidate = 3600;

const ROLE = (r: string) => r.split(/,\s*/).map((x) => x.toLowerCase().replace(/chief executive officer/, "ceo").replace(/chief financial officer/, "cfo").replace(/10% owner/, "10_percent_owner").replace(/\s+/g, "_"));

async function example() {
  const o = await readOverview().catch(() => null);
  const t = o?.strongest?.[0];
  if (!t) return null;
  return {
    data: [{
      accession: t.accession, filing_url: t.url, filed: t.filed, traded: t.date,
      ticker: t.symbol, company: t.issuer,
      insider: { name: t.owner, cik: t.ownerCik, roles: ROLE(t.role ?? "") },
      transaction: { type: t.code === "P" ? "open_market_purchase" : "open_market_sale", shares: t.shares, price: t.price, value: t.value, planned_10b5_1: !!t.planned },
      activity_score: t.conv ? { score: t.conv.score, tier: t.conv.tier, reasons: t.conv.reasons.map((r: { text: string; neg?: boolean }) => ({ text: r.text, ...(r.neg ? { lowers_score: true } : {}) })) } : null,
    }],
    next_cursor: "…",
  };
}

const ENDPOINTS: [string, string][] = [
  ["GET /v1/insider-trades", "Every open-market buy and sale by officers, directors and 10% owners. Filter by ticker, insider, date, buy or sell, size, role, and pre-planned (10b5-1) or not."],
  ["GET /v1/insider-trades/unusual", "Purchases with an Insider Activity Score, 0 to 100, and the reasons behind it: first buy in years, stake growth, size, several insiders at once."],
  ["GET /v1/clusters", "Stocks where two or more insiders bought within the same window, with the people and amounts."],
  ["GET /v1/companies/{ticker}/risk", "Risk flags from the company's filings: bankruptcy and delisting notices, auditor changes, executive departures, losses and cash burn, heavy insider selling."],
  ["GET /v1/funds/{cik}/holdings", "A fund's 13F holdings and what changed since the previous quarter: new, added, cut, sold out."],
  ["Planned: Form 144 and webhooks", "Notices of planned insider sales (often filed before the sale), and a push to your server the minute a matching filing is processed."],
];

const PLANS: [string, string, string[]][] = [
  ["Free", "$0", ["100 requests a day", "Last 30 days", "All endpoints"]],
  ["Hobby", "$19 / month", ["10,000 requests a day", "History from 2023", "CSV and JSON"]],
  ["Pro", "$49 / month", ["100,000 requests a day", "History back to 2003 (planned)", "Webhooks (planned)"]],
];

export default async function Developers() {
  const ex = await example();
  return (
    <div className="stack dev">
      <section className="card dev-hero">
        <p className="hero-kicker">Arkanum API · early access</p>
        <h1 className="hi-title">Insider trades, already analysed.</h1>
        <p className="hi-lead">Raw Form 4 data is everywhere. What takes work is cleaning it and reading it: who is really buying, whether it&apos;s routine, whether several insiders moved at once, and what else the company&apos;s filings say. The Arkanum API returns that, as JSON, from SEC filings only.</p>
        <ul className="hero-proof"><li>SEC filings, each linked</li><li>Cleaned names and roles</li><li>Scores with their reasons</li></ul>
        <p className="muted small">Not built yet: we&apos;re measuring demand first. Join the list below and you&apos;ll hear once, when early access opens.</p>
      </section>

      <section className="card">
        <h2>Endpoints</h2>
        <dl className="dev-endpoints">{ENDPOINTS.map(([k, v]) => <div key={k}><dt className="mono">{k}</dt><dd>{v}</dd></div>)}</dl>
      </section>

      {ex ? (
        <section className="card">
          <h2>Example response <span className="muted small">a real filing from this week</span></h2>
          <pre className="dev-code" tabIndex={0}>{`GET /v1/insider-trades/unusual?min_score=80&limit=1\n\n${JSON.stringify(ex, null, 2)}`}</pre>
        </section>
      ) : null}

      <section className="card">
        <h2>Planned pricing</h2>
        <div className="dev-plans">{PLANS.map(([n, p, f]) => (
          <div key={n} className="dev-plan"><strong>{n}</strong><span className="mono">{p}</span><ul>{f.map((x) => <li key={x}>{x}</li>)}</ul></div>
        ))}</div>
        <p className="muted small">Prices may change before launch.</p>
      </section>

      <section className="card">
        <h2>What it won&apos;t include</h2>
        <ul>
          <li><strong>Congress trades.</strong> Federal law limits commercial use of members&apos; financial disclosure reports. They stay free on <Link href="/congress">the Congress pages</Link>.</li>
          <li><strong>Stock prices and returns.</strong> Those come from licensed price data. Trades carry the price the insider paid, from the filing.</li>
          <li><strong>Advice.</strong> The data describes filings. In <Link href="/research">our research</Link>, copying insider purchases did not beat the market.</li>
        </ul>
      </section>

      <section className="card" id="early-access">
        <h2>Get early access</h2>
        <WaitlistForm />
      </section>
    </div>
  );
}
