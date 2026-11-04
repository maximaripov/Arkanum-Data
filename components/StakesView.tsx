"use client";
// Company stakes: what listed companies (NVIDIA, Amazon, Alphabet…) own in other public
// companies, from their SEC filings. Data: public/data/stakes.json (scripts/build-stakes.mjs).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HoldingRows, Badge, type Holding } from "./FundsView";
import { fmtBig } from "@/lib/format";

type Stake = { accession: string; form: string; filed: string; issuer: string; issuerCik: string; t: string | null; pct: number | null; url: string };
type Company = {
  cik: string; name: string; ticker: string | null; industry: string;
  period?: string; filed?: string; prevPeriod?: string | null; total?: number; count?: number;
  top?: Holding[]; new?: Holding[]; added?: Holding[]; reduced?: Holding[]; sold?: Holding[];
  stakes: Stake[];
};

const q = (d?: string | null) => { if (!d) return ""; const [y, m] = d.split("-"); return `Q${Math.ceil(+m / 3)} ${y}`; };
const day = (d: string) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const TABS = [["new", "New"], ["added", "Added to"], ["reduced", "Cut"], ["sold", "Sold completely"]] as const;
const isAmendment = (f: string) => /\/A$/.test(f);

export function StakesView() {
  const [data, setData] = useState<Company[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("new");
  useEffect(() => {
    fetch("/data/stakes.json").then((r) => (r.ok ? r.json() : { companies: [] })).then((d) => {
      const list: Company[] = d.companies ?? [];
      setData(list);
      const want = new URLSearchParams(location.search).get("c")?.toUpperCase();
      const pick = list.find((c) => c.ticker === want || c.cik === want) ?? list[0];
      if (pick) setSel(pick.cik);
    }).catch(() => setData([]));
  }, []);
  const choose = (c: Company) => { setSel(c.cik); setTab("new"); history.replaceState(null, "", `?c=${c.ticker ?? c.cik}`); };

  // The most recent 5%+ stake filings across every company: the timeliest signal here.
  const recentStakes = useMemo(() => (data ?? []).flatMap((c) => c.stakes.map((s) => ({ ...s, owner: c }))).sort((a, b) => b.filed.localeCompare(a.filed)).slice(0, 12), [data]);

  if (data === null) return <section className="card"><p className="muted">Loading…</p></section>;
  if (!data.length) return (
    <section className="card"><h1>Company stakes</h1><p className="muted">The first update is running. Company holdings will appear here shortly.</p></section>
  );
  const c = data.find((x) => x.cik === sel) ?? data[0];
  const changes = (c[tab] ?? []) as Holding[];
  return (
    <div className="stack">
      <section className="card">
        <h1>Company stakes</h1>
        <p className="muted">What big companies own in other public companies, from their own SEC filings. NVIDIA, Amazon, Alphabet and others report their stock holdings every quarter, and must file within days whenever they own more than 5% of a company.</p>
        <details className="howto"><summary>How to read this</summary>
          <ul>
            <li><strong>Quarterly holdings</strong> (Form 13F) are filed up to 45 days after each quarter ends, so they can be 2–5 months old.</li>
            <li><strong>5%+ stakes</strong> (Schedules 13D and 13G) are filed within days of crossing 5% or making a big change, so they&apos;re the most up to date.</li>
            <li><strong>Private companies don&apos;t appear.</strong> Stakes in startups that aren&apos;t publicly traded aren&apos;t reported in these filings.</li>
            <li>Only companies big enough to file are listed; many (Apple, Microsoft, Meta…) don&apos;t file 13Fs.</li>
          </ul>
        </details>
      </section>

      {recentStakes.length ? (
        <section className="card">
          <h2>Recent 5%+ stake filings <span className="muted small">last 12 months</span></h2>
          <ul className="rows">{recentStakes.map((s) => (
            <li key={s.accession} className="row-static">
              <div className="row-main">
                <div><strong>{s.owner.name}</strong> <span className="muted">owns</span> {s.pct != null ? <strong className="mono">{s.pct.toFixed(1)}%</strong> : "5%+"} <span className="muted">of</span> {s.t ? <Link href={`/stock/${s.t}`}><strong>{s.t}</strong></Link> : null} <span className="muted">{s.issuer}</span></div>
                <div className="small muted">{isAmendment(s.form) ? "Updated stake" : "New stake filing"} · {day(s.filed)} · <a href={s.url} target="_blank" rel="noreferrer">SEC filing ↗</a></div>
              </div>
            </li>
          ))}</ul>
        </section>
      ) : null}

      <section className="card">
        <h2>Pick a company</h2>
        <div className="scroller">{data.map((x) => <button key={x.cik} className={`chip${x.cik === c.cik ? " on" : ""}`} onClick={() => choose(x)}>{x.name}{x.ticker ? <span className="muted"> {x.ticker}</span> : null}</button>)}</div>
        <div className="fund-head">
          <div>
            <h2 className="fund-name">{c.name}</h2>
            <div className="muted small">{c.ticker ? <Link href={`/stock/${c.ticker}`}>{c.ticker}</Link> : null}{c.ticker && c.industry ? " · " : ""}{c.industry ? c.industry.toLowerCase().replace(/^./, (m) => m.toUpperCase()) : ""}</div>
          </div>
          {c.total != null ? (
            <dl className="stats compact">
              <div><dt>Reported stock holdings</dt><dd className="mono">${fmtBig(c.total)}</dd></div>
              <div><dt>Companies</dt><dd className="mono">{c.count}</dd></div>
              <div><dt>As of</dt><dd>{q(c.period)}</dd></div>
              <div><dt>Filed</dt><dd>{c.filed ? day(c.filed) : "—"}</dd></div>
            </dl>
          ) : null}
        </div>
      </section>

      {c.top?.length ? (
        <div className="twocol">
          <section className="card">
            <h2>What they own <span className="muted small">{q(c.period)}</span></h2>
            <HoldingRows items={c.top} max={25} maxPct={c.top[0]?.pct} />
          </section>
          <section className="card">
            <h2>What changed <span className="muted small">{c.prevPeriod ? `vs ${q(c.prevPeriod)}` : ""}</span></h2>
            <div className="seg wrap">{TABS.map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l} ({(c[k] ?? []).length})</button>)}</div>
            <HoldingRows items={changes} />
          </section>
        </div>
      ) : null}

      {c.stakes.length ? (
        <section className="card">
          <h2>{c.name}&apos;s 5%+ stakes <span className="muted small">filings in the last 12 months</span></h2>
          <ul className="rows">{c.stakes.map((s) => (
            <li key={s.accession} className="row-static">
              <div className="row-main"><div>{s.t ? <Link href={`/stock/${s.t}`}><strong>{s.t}</strong></Link> : null} <span className="muted">{s.issuer}</span></div><div className="small muted">{day(s.filed)} · <a href={s.url} target="_blank" rel="noreferrer">SEC filing ↗</a></div></div>
              <div className="row-value mono">{s.pct != null ? `${s.pct.toFixed(1)}%` : "5%+"}</div>
            </li>
          ))}</ul>
        </section>
      ) : null}
    </div>
  );
}

/** Which tracked companies own a given stock (stock page). */
export function StakeHolders({ symbol }: { symbol: string }) {
  const [rows, setRows] = useState<{ name: string; ticker: string | null; period?: string; h?: Holding; stake?: Stake }[] | null>(null);
  useEffect(() => {
    fetch("/data/stakes.json").then((r) => (r.ok ? r.json() : { companies: [] })).then((d) => {
      const out: { name: string; ticker: string | null; period?: string; h?: Holding; stake?: Stake }[] = [];
      for (const c of (d.companies ?? []) as Company[]) {
        const h = [...(c.top ?? []), ...(c.new ?? []), ...(c.added ?? []), ...(c.reduced ?? []), ...(c.sold ?? [])].find((x) => x.t === symbol);
        const stake = c.stakes.find((s) => s.t === symbol);
        if (h || stake) out.push({ name: c.name, ticker: c.ticker, period: c.period, h, stake });
      }
      setRows(out);
    }).catch(() => setRows([]));
  }, [symbol]);
  if (!rows?.length) return null;
  return (
    <section className="card">
      <h2>Companies that own {symbol} <span className="muted small">from their SEC filings</span></h2>
      <ul className="holdings">{rows.map((r) => (
        <li key={r.name}>
          <div className="h-name"><Link href={`/stakes?c=${r.ticker ?? ""}`}><strong>{r.name}</strong></Link><span className="muted small">{r.stake ? `${r.stake.pct != null ? r.stake.pct.toFixed(1) + "% stake" : "5%+ stake"}, filed ${day(r.stake.filed)}` : q(r.period)}</span></div>
          <div className="h-right">
            <div className="mono">{r.h && r.h.change !== "sold" ? `$${fmtBig(r.h.value)}` : r.h ? "—" : ""}</div>
            {r.h ? <Badge h={r.h} /> : null}
          </div>
        </li>
      ))}</ul>
    </section>
  );
}
