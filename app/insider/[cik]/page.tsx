import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { insiderTradesByOwner } from "@/lib/sec";
import { withConviction } from "@/lib/conviction.mjs";
import { loadInsiders, withHistory } from "@/lib/insiderData";
import { TradeList } from "@/components/TradeList";
import { FollowButton } from "@/components/FollowButton";
import { personName, roleLabel } from "@/lib/people.mjs";
import { fmtBig } from "@/lib/format";
import type { InsiderTrade } from "@/lib/sec";
import { companyName } from "@/lib/people.mjs";

// One insider across every company they report for, from their own SEC filings.
// Rebuilt at most every 6 hours; search engines get the full page.
export const revalidate = 21600;
const titleCase = (s: string, sym?: string | null) => companyName(s, sym);
const day = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

async function load(cik: string) {
  const [r, site] = await Promise.all([
    insiderTradesByOwner(cik).catch(() => null),
    loadInsiders("https://arkanumdata.vercel.app", { next: { revalidate: 1800 } }).catch(() => null),
  ]);
  if (!r) return null;
  return { name: personName(r.name || r.trades[0]?.owner || "Insider"), trades: withConviction(withHistory(r.trades, site)) as InsiderTrade[] };
}

export async function generateMetadata({ params }: { params: Promise<{ cik: string }> }): Promise<Metadata> {
  const { cik } = await params;
  const d = await load(cik);
  if (!d) return { title: "Insider not found" };
  const cos = [...new Set(d.trades.map((t) => t.symbol))].slice(0, 3).join(", ");
  const title = `${d.name}: insider trades${cos ? ` (${cos})` : ""}`;
  const description = `Every recent stock purchase and sale ${d.name} reported to the SEC${cos ? `, at ${cos}` : ""}, in plain English.`;
  return { title, description, alternates: { canonical: `/insider/${cik}` }, openGraph: { title: `${title} · Arkanum Data`, description, url: `/insider/${cik}` } };
}

export default async function InsiderPage({ params }: { params: Promise<{ cik: string }> }) {
  const { cik } = await params;
  const d = await load(cik);
  if (!d) notFound();
  const market = d.trades.filter((t) => t.code === "P" || t.code === "S");
  const sum = (code: string) => market.filter((t) => t.code === code).reduce((a, t) => a + (t.value ?? 0), 0);
  const companies = new Map<string, InsiderTrade>();
  for (const t of d.trades) if (!companies.has(t.symbol)) companies.set(t.symbol, t); // newest first
  const oldest = d.trades.at(-1)?.date;
  return (
    <div className="stack">
      <section className="card">
        <h1>{d.name}</h1>
        <FollowButton cik={String(Number(cik))} name={d.name} />
        <p className="muted">Insider trades reported to the SEC{oldest ? ` since ${day(oldest)}` : ""}, from their latest {d.trades.length ? "Form 4 filings" : "filings"}.</p>
        <dl className="stats compact">
          <div><dt>Bought (open market)</dt>{sum("P") ? <dd className="mono up">${fmtBig(sum("P"))}</dd> : <dd className="muted">None</dd>}</div>
          <div><dt>Sold (open market)</dt>{sum("S") ? <dd className="mono down">${fmtBig(sum("S"))}</dd> : <dd className="muted">None</dd>}</div>
          <div><dt>Companies</dt><dd className="mono">{companies.size}</dd></div>
        </dl>
      </section>

      {companies.size ? (
        <section className="card">
          <h2>Companies</h2>
          <ul className="rows">{[...companies.values()].map((t) => (
            <li key={t.symbol}><Link href={`/stock/${t.symbol}`} className="row-link">
              <div className="row-main"><div><strong>{t.symbol}</strong> <span className="muted">{titleCase(t.issuer, t.symbol)}</span></div><div className="small muted">{roleLabel(t.role)}</div></div>
              <div className="small muted">latest {day(t.date)}</div>
            </Link></li>
          ))}</ul>
        </section>
      ) : null}

      <section className="card">
        <h2>Buys and sales</h2>
        <p className="muted small">Open-market purchases and sales only; grants, option exercises and tax withholding are routine pay and left out.</p>
        <TradeList trades={market} pageSize={20} empty="No open-market buys or sales in their recent filings." />
        <p className="small muted"><a href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=4&dateb=&owner=include&count=40`} target="_blank" rel="noreferrer">All their filings on SEC EDGAR ↗</a></p>
      </section>
    </div>
  );
}
