"use client";
// Company stakes: what listed companies (NVIDIA, Amazon, Alphabet…) own in other companies.
// Public companies from their SEC filings (public/data/stakes.json, scripts/build-stakes.mjs);
// private startups from press releases (public/data/private.json, scripts/build-private.mjs).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HoldingRows, Badge, ChangeLines, type Holding } from "./FundsView";
import { fmtBig } from "@/lib/format";

type Stake = { accession: string; form: string; filed: string; issuer: string; issuerCik: string; t: string | null; pct: number | null; url: string };
type Deal = { investor: string; investorName: string; target: string; amount: number | null; round: string | null; date: string | null; title: string; url: string; source: string };
type Company = {
  cik: string; name: string; ticker: string | null; industry: string;
  period?: string; filed?: string; prevPeriod?: string | null; total?: number; count?: number;
  top?: Holding[]; new?: Holding[]; added?: Holding[]; reduced?: Holding[]; sold?: Holding[];
  stakes: Stake[];
};

const q = (d?: string | null) => { if (!d) return ""; const [y, m] = d.split("-"); return `Q${Math.ceil(+m / 3)} ${y}`; };
const day = (d: string) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const isAmendment = (f: string) => /\/A$/.test(f);
/** "11.5%", "Exited" for a final 0% filing, "All" after a takeover, or "5%+" when the filing didn't say. */
const pctText = (p: number | null) => (p == null ? "5%+" : p === 0 ? "Exited" : p >= 99.95 ? "All" : `${p.toFixed(1)}%`);
const dealText = (d: Deal) => [d.round, d.amount ? `$${fmtBig(d.amount)} round` : null].filter(Boolean).join(" · ") || "Investment";

/** Press-release deals. Unverified, so each links to its release. */
function DealRows({ deals, showInvestor }: { deals: Deal[]; showInvestor?: boolean }) {
  return (
    <ul className="rows">{deals.map((d) => (
      <li key={d.url} className="row-static">
        <div className="row-main">
          <div>{showInvestor ? <><strong>{d.investorName}</strong> <span className="muted">invested in</span> </> : null}<strong>{d.target}</strong></div>
          <div className="small muted">{dealText(d)}{d.date ? ` · ${day(d.date)}` : ""} · <a href={d.url} target="_blank" rel="noreferrer">{d.source} ↗</a></div>
        </div>
      </li>
    ))}</ul>
  );
}

export function StakesView() {
  const [data, setData] = useState<Company[] | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([
      fetch("/data/stakes.json").then((r) => (r.ok ? r.json() : { companies: [] })).catch(() => ({ companies: [] })),
      fetch("/data/private.json").then((r) => (r.ok ? r.json() : { deals: [] })).catch(() => ({ deals: [] })),
    ]).then(([s, p]) => {
      const list: Company[] = s.companies ?? [];
      const ds: Deal[] = p.deals ?? [];
      // Investors with press-release deals but no SEC holdings (Microsoft, Salesforce…) get an entry too.
      for (const d of ds) if (!list.some((c) => c.ticker === d.investor)) list.push({ cik: d.investor, name: d.investorName, ticker: d.investor, industry: "", stakes: [] });
      setData(list);
      setDeals(ds);
      const want = new URLSearchParams(location.search).get("c")?.toUpperCase();
      const pick = list.find((c) => c.ticker === want || c.cik === want) ?? list[0];
      if (pick) setSel(pick.cik);
    });
  }, []);
  const choose = (cik: string) => { const c = data?.find((x) => x.cik === cik); if (!c) return; setSel(cik); history.replaceState(null, "", `?c=${c.ticker ?? c.cik}`); };

  const recentStakes = useMemo(() => (data ?? []).flatMap((c) => c.stakes.map((s) => ({ ...s, owner: c }))).sort((a, b) => b.filed.localeCompare(a.filed)).slice(0, 12), [data]);
  const sorted = useMemo(() => [...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [data]);

  if (data === null) return <section className="card"><p className="muted">Loading…</p></section>;
  if (!data.length) return <section className="card"><h1>Company stakes</h1><p className="muted">The first update is running.</p></section>;
  const c = data.find((x) => x.cik === sel) ?? data[0];
  const own = deals.filter((d) => d.investor === c.ticker);
  const side = c.top?.length ? "span4" : "span12";
  return (
    <div className="ov">
      <section className="card">
        <h1>Company stakes</h1>
        <label className="picker">
          <span className="muted small">Company</span>
          <select value={c.cik} onChange={(e) => choose(e.target.value)}>
            {sorted.map((x) => <option key={x.cik} value={x.cik}>{x.name}{x.ticker ? ` (${x.ticker})` : ""}</option>)}
          </select>
        </label>
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
            </dl>
          ) : null}
        </div>
      </section>

      {c.top?.length ? (
        <section className="card span8">
          <h2>What they own <span className="muted small">{q(c.period)}{c.filed ? `, filed ${day(c.filed)}` : ""}</span></h2>
          <HoldingRows items={c.top} max={25} maxPct={c.top[0]?.pct} />
          {c.prevPeriod ? <ChangeLines c={c} since={q(c.prevPeriod)} /> : null}
        </section>
      ) : null}

      {c.stakes.length || own.length ? <div className={`stack ${side}`} style={{ alignContent: "start" }}>
      {c.stakes.length ? (
        <section className="card">
          <h2>5%+ stakes <span className="muted small">filings in the last 12 months</span></h2>
          <ul className="rows">{c.stakes.map((s) => (
            <li key={s.accession} className="row-static">
              <div className="row-main"><div>{s.t ? <Link href={`/stock/${s.t}`}><strong>{s.t}</strong></Link> : null} <span className="muted">{s.issuer}</span></div><div className="small muted">{day(s.filed)} · <a href={s.url} target="_blank" rel="noreferrer">SEC filing ↗</a></div></div>
              <div className="row-value mono">{pctText(s.pct)}</div>
            </li>
          ))}</ul>
        </section>
      ) : null}

      {own.length ? (
        <section className="card">
          <h2>Private investments <span className="muted small">reported in press releases, not verified</span></h2>
          <DealRows deals={own} />
        </section>
      ) : null}
      </div> : null}

      {deals.length ? (
        <section className="card span6">
          <h2>Recent private investments <span className="muted small">press releases, not verified</span></h2>
          <DealRows deals={deals.slice(0, 12)} showInvestor />
        </section>
      ) : null}

      {recentStakes.length ? (
        <section className="card span6">
          <h2>Recent 5%+ stake filings <span className="muted small">all companies</span></h2>
          <ul className="rows">{recentStakes.map((s) => (
            <li key={s.accession} className="row-static">
              <div className="row-main">
                <div><strong>{s.owner.name}</strong> {s.pct === 0 ? <span className="muted">sold its stake in</span> : <><span className="muted">owns</span> <strong className="mono">{pctText(s.pct)}</strong> <span className="muted">of</span></>} {s.t ? <Link href={`/stock/${s.t}`}><strong>{s.t}</strong></Link> : null} <span className="muted">{s.issuer}</span></div>
                <div className="small muted">{isAmendment(s.form) ? "Updated stake" : "New stake filing"} · {day(s.filed)} · <a href={s.url} target="_blank" rel="noreferrer">SEC filing ↗</a></div>
              </div>
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
          <div className="h-name"><Link href={`/stakes?c=${r.ticker ?? ""}`}><strong>{r.name}</strong></Link><span className="muted small">{r.stake ? `${r.stake.pct === 0 ? "Sold its stake" : pctText(r.stake.pct) + " stake"}, filed ${day(r.stake.filed)}` : q(r.period)}</span></div>
          <div className="h-right">
            <div className="mono">{r.h && r.h.change !== "sold" ? `$${fmtBig(r.h.value)}` : r.h ? "—" : ""}</div>
            {r.h ? <Badge h={r.h} /> : null}
          </div>
        </li>
      ))}</ul>
    </section>
  );
}
