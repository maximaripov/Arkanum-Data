"use client";
// Insider buying (up, green) and selling (down, red) by month, as one small chart. Bars are
// scaled together; a month with both shows both. Used on stock and insider pages.
import { fmtBig } from "@/lib/format";
import { monthly } from "@/lib/context.mjs";
import type { InsiderTrade } from "@/lib/sec";

const label = (m: string) => new Date(m + "-15T12:00:00Z").toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });

export function MonthBars({ trades, months = 12, note }: { trades: InsiderTrade[]; months?: number; note?: string }) {
  const rows = monthly(trades, months) as { month: string; buy: number; sell: number }[];
  const max = Math.max(1, ...rows.map((r) => Math.max(r.buy, r.sell)));
  if (!rows.some((r) => r.buy || r.sell)) return null;
  const w = 100 / rows.length;
  const total = (k: "buy" | "sell") => rows.reduce((a, r) => a + r[k], 0);
  return (
    <figure className="mbars">
      <svg viewBox="0 0 100 44" preserveAspectRatio="none" role="img"
        aria-label={`Insider buying and selling by month, last ${months} months: $${fmtBig(total("buy"))} bought, $${fmtBig(total("sell"))} sold.`}>
        <line x1="0" x2="100" y1="22" y2="22" className="mb-axis" />
        {rows.map((r, i) => (
          <g key={r.month}>
            <title>{`${label(r.month)} ${r.month.slice(0, 4)}: bought $${fmtBig(r.buy)}, sold $${fmtBig(r.sell)}`}</title>
            {r.buy ? <rect x={i * w + w * 0.18} width={w * 0.64} y={22 - (20 * r.buy) / max} height={(20 * r.buy) / max} className="mb-buy" /> : null}
            {r.sell ? <rect x={i * w + w * 0.18} width={w * 0.64} y={22} height={(20 * r.sell) / max} className="mb-sell" /> : null}
          </g>
        ))}
      </svg>
      <div className="mb-labels" aria-hidden>{rows.map((r) => <span key={r.month}>{label(r.month).slice(0, 1)}</span>)}</div>
      <figcaption className="muted small"><span className="up">▲ bought ${fmtBig(total("buy"))}</span> · <span className="down">▼ sold ${fmtBig(total("sell"))}</span> by month, last {months} months{note ? ` · ${note}` : ""}</figcaption>
    </figure>
  );
}
