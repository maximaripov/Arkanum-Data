"use client";
// Well-known insiders: CEOs and chairs who file Form 4s, ranked by how often people looked
// them up on Wikipedia in the last 30 days (public/data/famous.json, built daily).
import { useEffect, useState } from "react";
import Link from "next/link";

type Famous = { cik: string; label: string; title: string; name: string; role: string; symbol: string; company: string; last: string; views: number };
type Data = { updated: string; from: string; to: string; people: Famous[] };

const views = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));
const day = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.slice(0, 4) === String(new Date().getFullYear()) ? undefined : "numeric" });

export function FamousView() {
  const [d, setD] = useState<Data | null | undefined>(undefined);
  useEffect(() => { fetch("/data/famous.json").then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => setD(null)); }, []);
  if (d === undefined) return <section className="card"><p className="muted">Loading…</p></section>;
  if (!d?.people.length) return <section className="card"><p className="muted">The well-known insiders list is built with the daily update; it isn&apos;t ready yet.</p></section>;
  return (
    <section className="card flush">
      <div className="card-title"><h2>Well-known insiders <span className="muted small">most looked up on Wikipedia, {day(d.from)} – {day(d.to)}</span></h2></div>
      <table className="ttable d-only">
        <thead><tr><th>#</th><th>Insider</th><th>Company</th><th className="r">Wikipedia views</th><th className="r">Latest filing</th></tr></thead>
        <tbody>{d.people.map((p, i) => (
          <tr key={p.cik}>
            <td className="mono muted">{i + 1}</td>
            <td><Link href={`/insider/${p.cik}`}><strong>{p.label}</strong></Link><div className="muted small">{p.role}</div></td>
            <td className="cstock"><Link href={`/stock/${p.symbol}`}><strong>{p.symbol}</strong> <span className="muted">{p.company}</span></Link></td>
            <td className="mono r">{views(p.views)}</td>
            <td className="mono muted r">{day(p.last)}</td>
          </tr>
        ))}</tbody>
      </table>
      <ul className="lrows m-only">{d.people.map((p, i) => (
        <li key={p.cik}><Link href={`/insider/${p.cik}`}>
          <span className="lrow-rank mono muted">{i + 1}</span>
          <span className="lrow-main"><span><strong>{p.label}</strong> <span className="muted">· {p.symbol}</span></span><span className="muted small">{p.role}, {p.company}</span></span>
          <span className="lrow-v"><span className="mono">{views(p.views)}</span><span className="muted small">views</span></span>
        </Link></li>
      ))}</ul>
      <p className="muted small pad">CEOs and chairs listed on Wikidata, matched to the people who report their trades to the SEC, ranked by English Wikipedia page views. Views measure how much people look someone up, not how they trade.</p>
    </section>
  );
}
