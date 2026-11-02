"use client";
import Link from "next/link";
import { fmtPct } from "@/lib/format";
import type { Dividends, Earnings } from "@/lib/calendar";

export type CalendarInfo = { earnings: Earnings | null; dividends: Dividends | null };
type Info = CalendarInfo;

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
export const daysUntil = (d: string) => Math.round((Date.parse(d + "T12:00:00Z") - Date.parse(today() + "T12:00:00Z")) / 86_400_000);
export const when = (d: string) => {
  const n = daysUntil(d);
  const label = new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return n === 0 ? `Today · ${label}` : n === 1 ? `Tomorrow · ${label}` : n < 0 ? label : `${label} · in ${n} days`;
};
/** Beat/miss vs the estimate. Near-zero estimates make percentages explode (a 4-cent
 *  miss on a 5-cent estimate is "−80%"), so small estimates show the dollar gap instead. */
function surprise(h: { eps: number | null; estimate: number | null; surprisePct: number | null }) {
  if (h.eps == null || h.estimate == null) return h.surprisePct == null ? "—" : `${h.surprisePct >= 0 ? "beat" : "missed"} ${Math.abs(h.surprisePct).toFixed(1)}%`;
  const diff = h.eps - h.estimate;
  if (Math.abs(h.estimate) < 0.1 || h.surprisePct == null) return diff === 0 ? "met" : `${diff > 0 ? "beat" : "missed"} by $${Math.abs(diff).toFixed(2)}`;
  return `${h.surprisePct >= 0 ? "beat" : "missed"} ${Math.abs(h.surprisePct).toFixed(1)}%`;
}

export const money = (v: number | null | undefined) => (v == null ? "—" : `$${v.toFixed(2)}`);

export function CalendarCard({ symbol, info }: { symbol: string; info: Info }) {
  const e = info.earnings, d = info.dividends;
  return (
    <section className="card">
      <h2><Link href={`/stock/${encodeURIComponent(symbol)}`}>{symbol}</Link></h2>
      {e ? (
        <>
          <p className="small">
            <strong>Next earnings:</strong>{" "}
            {e.next ? <>{when(e.next.date)}{e.next.time ? `, ${e.next.time}` : ""}{e.next.confirmed ? "" : " (estimated date)"}{e.next.epsEstimate != null ? ` · EPS estimate ${money(e.next.epsEstimate)}` : ""}</> : "not announced"}
          </p>
          {e.history.length ? (
            <table className="table compact">
              <thead><tr><th>Quarter</th><th className="r">EPS</th><th className="r">Estimate</th><th className="r">Surprise</th></tr></thead>
              <tbody>{e.history.map((h) => (
                <tr key={h.quarter}><td>{h.quarter}</td><td className="r mono">{money(h.eps)}</td><td className="r mono">{money(h.estimate)}</td>
                  <td className={`r mono ${h.surprisePct == null ? "" : h.surprisePct >= 0 ? "up" : "down"}`}>{surprise(h)}</td></tr>
              ))}</tbody>
            </table>
          ) : null}
        </>
      ) : <p className="small muted">No earnings reports (funds and ETFs don&apos;t report earnings).</p>}
      {d ? (
        <p className="small">
          <strong>Dividends:</strong> {d.frequency ?? "irregular"}{d.ttm ? `, ${money(d.ttm)} per share over 12 months` : ""}{d.yieldPct != null ? ` (${d.yieldPct.toFixed(2)}% yield)` : ""}.
          {d.next ? <> Next ex-dividend: {when(d.next.ex)}{d.next.amount ? `, ~${money(d.next.amount)}` : ""}{d.next.estimated ? " (estimated from past payments)" : d.next.pay ? `, paid ${new Date(d.next.pay + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}.</> : null}
        </p>
      ) : e ? <p className="small muted">No dividends.</p> : null}
    </section>
  );
}

