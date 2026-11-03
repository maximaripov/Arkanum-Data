"use client";
// Form4's own data on the Markets page: stocks executives and directors bought this
// week, as a bar chart by amount. SEC Form 4.
import { useEffect, useState } from "react";
import Link from "next/link";
import { fmtBig } from "@/lib/format";
import { HBars } from "./Bars";
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
        const who = personName(t.owner); // one filer can appear under slightly different names
        if (!x.owners.has(who)) { x.owners.add(who); x.people.push(`${who} (${roleLabel(t.role)})`); }
        by.set(t.symbol, x);
      }
      // Several insiders averaging under ~$25K each is usually an employee share-purchase plan.
      const strong = (x: Row) => x.people.length < 2 || x.value / x.people.length >= 25_000;
      setRows([...by.values()].filter(strong).sort((a, b) => b.value - a.value).slice(0, 8));
    }).catch(() => setRows([]));
  }, []);
  return (
    <section className="card">
      <div className="card-head"><h2>Insiders buying this week</h2><Link href="/insiders" className="small">See all ›</Link></div>
      <p className="muted small">Executives and directors buying their own company&apos;s stock with their own money, last 7 days.</p>
      {rows === null ? <p className="muted">Loading…</p> : !rows.length ? <p className="muted">No open-market buys filed in the last 7 days.</p> : (
        <HBars rows={rows.map((r) => ({ key: r.symbol, href: `/stock/${r.symbol}`, value: r.value, text: `$${fmtBig(r.value)}`,
          label: <><strong>{r.symbol}</strong> <span className="muted">{titleCase(r.issuer)}</span></>,
          sub: r.people.length > 1 ? `${r.people.length} insiders` : r.people[0] }))} />
      )}
    </section>
  );
}
