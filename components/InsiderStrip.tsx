"use client";
// Under a stock's price chart: when executives and directors bought (green) and sold (red),
// on a timeline matching the chart's range, so you can see whether insiders bought near
// the lows. Marks grow with the dollar amount; tap or hover one for details.
import { useState } from "react";
import { fmtBig } from "@/lib/format";
import { isExecOrDirector } from "@/lib/insider";
import { personName, roleLabel } from "@/lib/people.mjs";
import type { InsiderTrade } from "@/lib/sec";

const DAYS: Record<string, number> = { "1M": 31, "6M": 183, "1Y": 365, "5Y": 1826 };
const fmt = (ms: number, year: boolean) => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", ...(year ? { year: "2-digit" } : {}) });

export function InsiderStrip({ trades, range }: { trades: InsiderTrade[] | null; range: string }) {
  const [pick, setPick] = useState<string | null>(null);
  const days = DAYS[range];
  if (!days || !trades) return null;
  const end = Date.now(), start = end - days * 86_400_000;
  const all = trades.filter((t) => (t.code === "P" || t.code === "S") && t.value && isExecOrDirector(t));
  const marks = all.filter((t) => Date.parse(t.date + "T12:00:00Z") >= start);
  // The page has the latest 25 filings; say so when they don't reach back the whole range.
  const oldest = trades.length >= 25 ? trades.map((t) => t.date).sort()[0] : null;
  const partial = oldest && Date.parse(oldest + "T12:00:00Z") > start;
  const max = Math.max(...marks.map((t) => t.value ?? 0), 1);
  const shown = marks.find((t) => t.accession + t.code === pick);
  const year = days > 200;
  return (
    <div className="istrip">
      <div className="istrip-read small">
        {shown ? (
          <><span className={shown.code === "P" ? "up" : "down"}>{shown.code === "P" ? "Bought" : "Sold"} ${fmtBig(shown.value ?? 0)}</span> · {personName(shown.owner)} ({roleLabel(shown.role)}) · {fmt(Date.parse(shown.date + "T12:00:00Z"), true)}{shown.price ? ` at $${shown.price.toFixed(2)}` : ""}</>
        ) : marks.length ? (
          <span className="muted">Insider buys <span className="up">▲</span> and sales <span className="down">▼</span> by executives and directors · tap one</span>
        ) : (
          <span className="muted">No buys or sales by executives or directors in this period{partial ? " (in the filings loaded)" : ""}.</span>
        )}
      </div>
      <div className="istrip-track" onPointerLeave={() => setPick(null)}>
        {marks.map((t) => {
          const left = ((Date.parse(t.date + "T12:00:00Z") - start) / (end - start)) * 100;
          const size = 8 + 12 * Math.sqrt((t.value ?? 0) / max);
          const k = t.accession + t.code;
          return (
            <button key={k} className={`imark ${t.code === "P" ? "buy" : "sell"}${k === pick ? " on" : ""}`}
              style={{ left: `${left}%`, width: size, height: size }}
              onPointerEnter={(e) => e.pointerType === "mouse" && setPick(k)} onClick={() => setPick(k === pick ? null : k)}
              aria-label={`${t.code === "P" ? "Bought" : "Sold"} $${fmtBig(t.value ?? 0)}, ${personName(t.owner)}, ${t.date}`} />
          );
        })}
      </div>
      <div className="istrip-axis muted small"><span>{fmt(start, year)}</span>{partial ? <span>filings loaded go back to {fmt(Date.parse(oldest! + "T12:00:00Z"), true)}</span> : null}<span>Today</span></div>
    </div>
  );
}
