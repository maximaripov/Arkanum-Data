"use client";
// Foresight's own data on the Markets page: this week's biggest officer/director buys
// and cluster buys (SEC Form 4).
import { useEffect, useState } from "react";
import Link from "next/link";
import { fmtBig } from "@/lib/format";
import { isExecOrDirector } from "@/lib/insider";
import type { InsiderTrade } from "@/lib/sec";

export function InsiderHighlights() {
  const [rows, setRows] = useState<{ symbol: string; issuer: string; value: number; insiders: string[] }[] | null>(null);
  useEffect(() => {
    fetch("/data/insiders.json").then((r) => r.json()).then((d) => {
      const since = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
      const by = new Map<string, { symbol: string; issuer: string; value: number; insiders: Set<string> }>();
      for (const t of d.trades as InsiderTrade[]) {
        if (t.code !== "P" || !isExecOrDirector(t) || t.filed < since || !t.value) continue;
        const x = by.get(t.symbol) ?? { symbol: t.symbol, issuer: t.issuer, value: 0, insiders: new Set<string>() };
        x.value += t.value; x.insiders.add(t.owner); by.set(t.symbol, x);
      }
      // Several insiders averaging under ~$25K each is usually an employee share-purchase plan.
      const strong = (x: { value: number; insiders: Set<string> }) => x.insiders.size < 2 || x.value / x.insiders.size >= 25_000;
      setRows([...by.values()].filter(strong).sort((a, b) => b.insiders.size - a.insiders.size || b.value - a.value).slice(0, 8).map((x) => ({ ...x, insiders: [...x.insiders] })));
    }).catch(() => setRows([]));
  }, []);
  return (
    <section className="card">
      <h2>Insiders buying this week <span className="muted small">officers &amp; directors, SEC Form 4</span></h2>
      {rows === null ? <p className="muted">Loading…</p> : !rows.length ? <p className="muted">No open-market buys filed in the last 7 days.</p> : (
        <ul className="news">{rows.map((r) => (
          <li key={r.symbol}>
            <Link href={`/stock/${r.symbol}`}><strong>{r.symbol}</strong></Link> <span className="muted small">{r.issuer}</span>
            <div className="small">{r.insiders.length > 1 ? <span className="up">{r.insiders.length} insiders</span> : r.insiders[0]} bought ${fmtBig(r.value)}</div>
          </li>
        ))}</ul>
      )}
      <Link href="/insiders" className="small muted">All insider trades and big-fund moves →</Link>
    </section>
  );
}
