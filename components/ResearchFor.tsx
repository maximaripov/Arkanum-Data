"use client";
// "What the research says" on a stock page: the research groups this company's recent insider
// buys and sales fall into, each with its six-month median, 90% range and count. The groups
// come from the same rule as each trade's "Trades like this" line (lib/evidence.ts).
import Link from "next/link";
import { evidenceFor, type Evidence } from "@/lib/evidence";
import { MIN_MONTHS } from "@/lib/researchClaims.mjs";
import { RangeBar } from "@/components/TradeAnalysis";
import type { InsiderTrade } from "@/lib/sec";

const pct = (x: number) => `${x > 0.05 ? "+" : x < -0.05 ? "−" : ""}${Math.abs(x).toFixed(1)}%`;

export function ResearchFor({ trades }: { trades: InsiderTrade[] | null }) {
  const groups = new Map<string, { e: Evidence; n: number }>();
  for (const t of trades ?? []) {
    const e = evidenceFor(t);
    if (!e) continue;
    const k = `${e.sale}|${e.label}`;
    groups.set(k, { e, n: (groups.get(k)?.n ?? 0) + 1 });
  }
  const rows = [...groups.values()].sort((a, b) => Number(a.e.sale) - Number(b.e.sale) || b.n - a.n);
  return (
    <section className="card">
      <h2>Trades like this company&apos;s <span className="muted small">research groups and results</span></h2>
      {!rows.length ? <p className="muted">No open-market buys or sales by officers or directors in the filings loaded, so there&apos;s nothing to compare. <Link href="/research">The research ›</Link></p> : <>
        <p className="muted small">Each of this company&apos;s recent insider trades belongs to a group we tested on 2023–25 filings. Six months after the filing, against other insider trades filed that month (not the market), with the 90% range: a range that crosses zero means no clear difference.</p>
        <ul className="rf-list">{rows.map(({ e, n }) => (
          <li key={`${e.sale}${e.label}`}>
            <div className="rf-head"><strong>{e.label}</strong> <span className="muted small">{n} trade{n === 1 ? "" : "s"} here</span></div>
            <div className="rf-fig">
              <span className={`mono ${e.main[0] > 0.05 ? "up" : e.main[0] < -0.05 ? "down" : ""}`}>{pct(e.main[0])}</span>
              <RangeBar median={e.main[0]} lo={e.main[4]} hi={e.main[5]} />
              <span className="muted small">{e.main[4] != null && e.main[5] != null ? `${pct(e.main[4])} to ${pct(e.main[5])}, ` : ""}{e.main[2].toLocaleString("en-US")} trades{e.oos ? `; 2026: ${pct(e.oos[0])}${(e.oos[3] ?? 0) < MIN_MONTHS ? " (too early)" : ""}` : ""}</span>
            </div>
          </li>
        ))}</ul>
        <p className="muted small">Past results for groups of trades, not a forecast for this one. Against the S&amp;P 500, every kind of insider purchase we tested trailed. <Link href="/research/methodology">How we test ›</Link></p>
      </>}
    </section>
  );
}
