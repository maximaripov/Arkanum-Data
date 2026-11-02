"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fmtBig, fmtPct } from "@/lib/format";

type Holding = { cusip: string; t: string | null; name: string; cls: string; value: number; shares: number; pct: number; change: string; chgPct: number | null };
type Fund = { cik: number; name: string; who: string; period: string; filed: string; prevPeriod: string | null; total: number; count: number; top: Holding[]; new: Holding[]; added: Holding[]; reduced: Holding[]; sold: Holding[] };

const q = (d: string) => { const [y, m] = d.split("-"); return `Q${Math.ceil(+m / 3)} ${y}`; };
const label = (h: Holding) => (h.t ? <Link href={`/stock/${h.t}`}><strong>{h.t}</strong></Link> : <strong>{h.name}</strong>);
const share = (pct: number) => (pct < 0.1 ? "under 0.1%" : `${pct.toFixed(1)}%`);
const CHANGE: Record<string, string> = { new: "New", added: "Added", reduced: "Cut", sold: "Sold all", same: "Unchanged" };

function HoldingList({ items, show }: { items: Holding[]; show: "pct" | "chg" }) {
  if (!items.length) return <p className="muted small">None.</p>;
  return (
    <ul className="news">{items.slice(0, 10).map((h) => (
      <li key={h.cusip}>
        {label(h)} <span className="muted small">{h.t ? h.name : h.cls}</span>
        <div className="muted small">
          ${fmtBig(h.value)}{h.change !== "sold" ? ` · ${share(h.pct)} of portfolio` : ""}
          {show === "chg" && h.chgPct != null && h.change !== "sold" ? ` · shares ${fmtPct(h.chgPct, 0)}` : ""}
          {show === "pct" && h.change !== "same" ? ` · ${CHANGE[h.change]}${h.chgPct != null && h.change !== "new" ? ` ${fmtPct(h.chgPct, 0)}` : ""}` : ""}
        </div>
      </li>
    ))}</ul>
  );
}

export function FundsView() {
  const [funds, setFunds] = useState<Fund[] | null>(null);
  const [sel, setSel] = useState(0);
  useEffect(() => { fetch("/data/funds.json").then((r) => r.json()).then((d) => setFunds(d.funds)).catch(() => setFunds([])); }, []);
  if (funds === null) return <section className="card"><p className="muted">Loading…</p></section>;
  if (!funds.length) return <section className="card"><p className="muted">Fund data isn&apos;t available yet.</p></section>;
  const f = funds[sel];
  return (
    <>
      <section className="card">
        <p className="muted small">From each fund&apos;s quarterly SEC 13F filing: US stocks they held at quarter end. Filings are due 45 days after each quarter, so these positions are 6–20 weeks old, and short positions aren&apos;t reported.</p>
        <div className="chips">{funds.map((x, i) => <button key={x.cik} className={`chip${i === sel ? " on" : ""}`} onClick={() => setSel(i)}>{x.name}</button>)}</div>
      </section>
      <section className="card">
        <h2>{f.name} <span className="muted small">{f.who}</span></h2>
        <p className="small">{q(f.period)} filing (filed {new Date(f.filed + "T12:00:00").toLocaleDateString()}): {f.count.toLocaleString()} stocks worth ${fmtBig(f.total)}{f.prevPeriod ? `, compared with ${q(f.prevPeriod)}` : ""}.</p>
      </section>
      <div className="grid">
        <section className="card"><h2>Largest holdings</h2><HoldingList items={f.top} show="pct" /></section>
        <section className="card"><h2>New positions</h2><HoldingList items={f.new} show="chg" /></section>
        <section className="card"><h2>Added to</h2><HoldingList items={f.added} show="chg" /></section>
        <section className="card"><h2>Cut</h2><HoldingList items={f.reduced} show="chg" /></section>
        <section className="card"><h2>Sold completely</h2><HoldingList items={f.sold} show="chg" /></section>
      </div>
    </>
  );
}

/** Which of the tracked funds hold a given stock (stock page). */
export function FundHolders({ symbol }: { symbol: string }) {
  const [rows, setRows] = useState<{ fund: string; period: string; h: Holding }[] | null>(null);
  useEffect(() => {
    fetch("/data/funds.json").then((r) => r.json()).then((d) => {
      const out: { fund: string; period: string; h: Holding }[] = [];
      for (const f of d.funds as Fund[]) {
        const h = [...f.top, ...f.new, ...f.added, ...f.reduced].find((x) => x.t === symbol);
        const s = f.sold.find((x) => x.t === symbol);
        if (h) out.push({ fund: f.name, period: f.period, h });
        else if (s) out.push({ fund: f.name, period: f.period, h: s });
      }
      setRows(out);
    }).catch(() => setRows([]));
  }, [symbol]);
  if (!rows?.length) return null;
  return (
    <section className="card">
      <h2>Big funds <span className="muted small">13F filings, positions 6–20 weeks old</span></h2>
      <ul className="news">{rows.map(({ fund, period, h }) => (
        <li key={fund}><strong>{fund}</strong>{" "}
          {h.change === "sold" ? <span className="down">sold its entire stake</span> : <>holds ${fmtBig(h.value)} ({share(h.pct)} of its portfolio)</>}
          {h.change === "new" ? <span className="up"> · new position</span> : h.change === "added" ? <span className="up"> · added {fmtPct(h.chgPct, 0)}</span> : h.change === "reduced" ? <span className="down"> · cut {fmtPct(h.chgPct, 0)}</span> : null}
          <div className="muted small">{q(period)}</div></li>
      ))}</ul>
      <Link href="/insiders?view=funds" className="small muted">See all funds →</Link>
    </section>
  );
}
