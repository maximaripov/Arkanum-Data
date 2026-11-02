"use client";
// Foresight's own data on the Markets page: stocks executives and directors bought this
// week, strongest first (several insiders, then size). SEC Form 4.
import { useEffect, useState } from "react";
import Link from "next/link";
import { fmtBig } from "@/lib/format";
import { isExecOrDirector } from "@/lib/insider";
import { personName, roleLabel } from "./TradeList";
import type { InsiderTrade } from "@/lib/sec";

const titleCase = (s: string) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
type Row = { symbol: string; issuer: string; value: number; people: string[] };

export function InsiderHighlights() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    fetch("/data/insiders.json").then((r) => r.json()).then((d) => {
      const since = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
      const by = new Map<string, Row & { owners: Set<string> }>();
      for (const t of d.trades as InsiderTrade[]) {
        if (t.code !== "P" || !isExecOrDirector(t) || t.filed < since || !t.value) continue;
        const x = by.get(t.symbol) ?? { symbol: t.symbol, issuer: t.issuer, value: 0, people: [], owners: new Set<string>() };
        x.value += t.value;
        if (!x.owners.has(t.owner)) { x.owners.add(t.owner); x.people.push(`${personName(t.owner)} (${roleLabel(t.role)})`); }
        by.set(t.symbol, x);
      }
      // Several insiders averaging under ~$25K each is usually an employee share-purchase plan.
      const strong = (x: Row) => x.people.length < 2 || x.value / x.people.length >= 25_000;
      setRows([...by.values()].filter(strong).sort((a, b) => b.people.length - a.people.length || b.value - a.value).slice(0, 6));
    }).catch(() => setRows([]));
  }, []);
  return (
    <section className="card">
      <div className="card-head"><h2>Insiders buying this week</h2><Link href="/insiders" className="small">See all ›</Link></div>
      <p className="muted small">Executives and directors buying their own company&apos;s stock with their own money.</p>
      {rows === null ? <p className="muted">Loading…</p> : !rows.length ? <p className="muted">No open-market buys filed in the last 7 days.</p> : (
        <ul className="rows">{rows.map((r) => (
          <li key={r.symbol}>
            <Link href={`/stock/${r.symbol}`} className="row-link">
              <div className="row-main">
                <div><strong>{r.symbol}</strong> <span className="muted">{titleCase(r.issuer)}</span></div>
                <div className="small muted ellipsis-1">{r.people.length > 1 ? <span className="up">{r.people.length} insiders · </span> : null}{r.people.slice(0, 2).join(", ")}{r.people.length > 2 ? "…" : ""}</div>
              </div>
              <div className="row-value up mono">${fmtBig(r.value)}</div>
            </Link>
          </li>
        ))}</ul>
      )}
    </section>
  );
}
