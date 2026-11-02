"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { InsiderTable } from "@/components/InsiderTable";
import { fmtBig } from "@/lib/format";
import type { InsiderTrade } from "@/lib/sec";

const FILTERS = { buys: "Open-market buys", sales: "Sales", all: "All transactions" } as const;

export default function Insiders() {
  const [trades, setTrades] = useState<InsiderTrade[] | null>(null);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<keyof typeof FILTERS>("buys");
  const [minValue, setMinValue] = useState(0);
  const [hidePlanned, setHidePlanned] = useState(false);
  const [source, setSource] = useState<"history" | "live">("history");
  const [updated, setUpdated] = useState("");

  useEffect(() => {
    setTrades(null); setErr("");
    if (source === "history") {
      fetch("/data/insiders.json").then((r) => r.json()).then((d) => { setTrades(d.trades); setUpdated(`${d.days.length} trading days, updated ${new Date(d.updated).toLocaleString()}`); }).catch((e) => setErr(String(e)));
    } else {
      fetch("/api/insiders").then((r) => r.json()).then((d) => { if (Array.isArray(d)) { setTrades(d); setUpdated("latest filings on EDGAR right now"); } else setErr(d.error); }).catch((e) => setErr(String(e)));
    }
  }, [source]);

  const shown = useMemo(() => (trades ?? [])
    .filter((t) => (filter === "buys" ? t.code === "P" : filter === "sales" ? t.code === "S" : true))
    .filter((t) => (t.value ?? 0) >= minValue && !(hidePlanned && t.planned))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)), [trades, filter, minValue, hidePlanned]);

  // Several different insiders buying the same stock is a stronger signal than one.
  const clusters = useMemo(() => {
    const by = new Map<string, { owners: Set<string>; value: number; issuer: string }>();
    for (const t of trades ?? []) {
      if (t.code !== "P") continue;
      const c = by.get(t.symbol) ?? { owners: new Set(), value: 0, issuer: t.issuer };
      c.owners.add(t.owner); c.value += t.value ?? 0; by.set(t.symbol, c);
    }
    return [...by].filter(([, c]) => c.owners.size > 1).sort((a, b) => b[1].value - a[1].value);
  }, [trades]);

  return (
    <div className="stack">
      <section className="card">
        <h1>Insider trades</h1>
        <p className="muted">Form 4 filings from SEC EDGAR. &quot;Last 30 days&quot; holds every open-market buy and sales over $250K, rebuilt nightly; &quot;Live&quot; reads the newest filings directly. Open-market buys (code P) are the meaningful signal: awards, option exercises and tax withholding are mostly routine. &quot;Plan&quot; means the trade was scheduled in advance under Rule 10b5-1.</p>
        <div className="toolbar">
          <div className="seg"><button className={source === "history" ? "on" : ""} onClick={() => setSource("history")}>Last 30 days</button><button className={source === "live" ? "on" : ""} onClick={() => setSource("live")}>Live</button></div>
          <div className="seg">{Object.entries(FILTERS).map(([k, v]) => <button key={k} className={k === filter ? "on" : ""} onClick={() => setFilter(k as keyof typeof FILTERS)}>{v}</button>)}</div>
          <label className="small">Min value <select value={minValue} onChange={(e) => setMinValue(+e.target.value)}>{[0, 10_000, 100_000, 1_000_000].map((v) => <option key={v} value={v}>{v ? "$" + fmtBig(v) : "Any"}</option>)}</select></label>
          <label className="small"><input type="checkbox" checked={hidePlanned} onChange={(e) => setHidePlanned(e.target.checked)} /> Hide pre-planned trades</label>
        </div>
        <p className="muted small">{updated}</p>
      </section>
      {clusters.length ? (
        <section className="card">
          <h2>Cluster buys <span className="muted small">2+ insiders buying the same stock</span></h2>
          <div className="chips">{clusters.map(([s, c]) => <Link key={s} href={`/stock/${s}`} className="chip"><strong>{s}</strong> {c.owners.size} insiders · ${fmtBig(c.value)}</Link>)}</div>
        </section>
      ) : null}
      <section className="card">
        {err ? <p className="down">Couldn&apos;t reach SEC: {err}</p> : trades === null ? <p className="muted">Reading the latest filings from SEC (takes ~10 seconds)…</p> : <InsiderTable trades={shown} showSymbol />}
      </section>
    </div>
  );
}
