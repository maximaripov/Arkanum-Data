"use client";
// Under a stock's price chart: when executives and directors bought (green) and sold (red),
// on a timeline matching the chart's range, so you can see whether insiders bought near
// the lows. One mark per day and side, growing with the dollar amount; tap or hover for details.
import { useState } from "react";
import { fmtBig } from "@/lib/format";
import { isExecOrDirector } from "@/lib/insider";
import { personName, roleLabel } from "@/lib/people.mjs";
import type { InsiderTrade } from "@/lib/sec";

const DAYS: Record<string, number> = { "1M": 31, "6M": 183, "1Y": 365, "5Y": 1826 };
const at = (d: string) => Date.parse(d + "T12:00:00Z");
const axis = (ms: number, year: boolean) => new Date(ms).toLocaleDateString(undefined, year ? { month: "short", year: "numeric" } : { month: "short", day: "numeric" });
const full = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
type Mark = { key: string; buy: boolean; date: string; value: number; trades: InsiderTrade[] };

export function InsiderStrip({ trades, range }: { trades: InsiderTrade[] | null; range: string }) {
  const [pick, setPick] = useState<string | null>(null);
  const days = DAYS[range];
  if (!days || !trades) return null;
  const end = Date.now(), start = end - days * 86_400_000;

  // One mark per day and side, so same-day trades don't hide each other.
  const byKey = new Map<string, Mark>();
  for (const t of trades) {
    if ((t.code !== "P" && t.code !== "S") || !t.value || !isExecOrDirector(t) || at(t.date) < start) continue;
    const key = `${t.date}${t.code}`;
    const m = byKey.get(key) ?? { key, buy: t.code === "P", date: t.date, value: 0, trades: [] };
    m.value += t.value; m.trades.push(t); byKey.set(key, m);
  }
  const marks = [...byKey.values()].sort((a, b) => a.value - b.value); // big ones drawn last, on top
  // The page has the latest 25 filings; say so when they don't reach back the whole range.
  const oldest = trades.length >= 25 ? trades.map((t) => t.date).sort()[0] : null;
  const partial = !!oldest && at(oldest) > start;
  const max = Math.max(...marks.map((m) => m.value), 1);
  const shown = marks.find((m) => m.key === pick);
  const who = (m: Mark) => {
    const people = [...new Set(m.trades.map((t) => personName(t.owner)))];
    return people.length === 1 ? `${people[0]} (${roleLabel(m.trades[0].role)})` : `${people.length} insiders`;
  };

  return (
    <div className="istrip">
      <div className="istrip-read small">
        {shown ? (
          <><span className={shown.buy ? "up" : "down"}>{shown.buy ? "Bought" : "Sold"} ${fmtBig(shown.value)}</span>{shown.trades.length > 1 ? ` · ${shown.trades.length} trades` : ""} · {who(shown)} · {full(at(shown.date))}{shown.trades.length === 1 && shown.trades[0].price ? ` at $${shown.trades[0].price.toFixed(2)}` : ""}</>
        ) : marks.length ? (
          <span className="muted">Insider buys <span className="up">▲</span> and sales <span className="down">▼</span> by executives and directors · tap one</span>
        ) : (
          <span className="muted">No buys or sales by executives or directors in this period{partial ? " (in the filings loaded)" : ""}.</span>
        )}
      </div>
      <div className="istrip-track" onPointerLeave={() => setPick(null)}>
        {marks.map((m) => {
          const size = 8 + 12 * Math.sqrt(m.value / max);
          return (
            <button key={m.key} className={`imark ${m.buy ? "buy" : "sell"}${m.key === pick ? " on" : ""}`}
              style={{ left: `calc(12px + (100% - 24px) * ${(at(m.date) - start) / (end - start)})`, width: size, height: size }}
              onPointerEnter={(e) => e.pointerType === "mouse" && setPick(m.key)} onClick={() => setPick(m.key === pick ? null : m.key)}
              aria-label={`${m.buy ? "Bought" : "Sold"} $${fmtBig(m.value)}, ${who(m)}, ${m.date}`} />
          );
        })}
      </div>
      <div className="istrip-axis muted small">
        <span>{axis(start, days > 200)}</span>
        {partial ? <span>filings loaded go back to {full(at(oldest!))}</span> : null}
        <span>Today</span>
      </div>
    </div>
  );
}
