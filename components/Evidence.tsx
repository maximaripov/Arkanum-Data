// One line under a buy or sale: what trades like it were followed by in our research.
// Wording describes, never predicts: these are past medians, not forecasts.
import Link from "next/link";
import { evidenceFor } from "@/lib/evidence";
import { MIN_MONTHS } from "@/lib/researchClaims.mjs";
import type { InsiderTrade } from "@/lib/sec";

const pct = (x: number) => `${x > 0.05 ? "+" : x < -0.05 ? "−" : ""}${Math.abs(x).toFixed(1)}%`;

export function EvidenceLine({ t }: { t: InsiderTrade }) {
  const e = evidenceFor(t);
  if (!e) return null;
  const [m, share, n] = e.main;
  const other = e.sale ? "other insider sales that month (not the market)" : "other insider buys that month (not the market)";
  return (
    <div className="evline small" title="Six-month return against the median insider trade filed the same month. A description of the past, not a forecast.">
      <span className="evtag">Trades like this</span>{" "}
      <span className="muted">{e.label}, 2023–25: median <span className={`mono ${m > 0.05 ? "up" : m < -0.05 ? "down" : ""}`}>{pct(m)}</span> vs {other} after 6 months
        {" "}({Math.round(share)}% {e.sale ? "did worse" : "did better"}, {n.toLocaleString("en-US")} trades)
        {e.oos ? <>; 2026 so far <span className="mono">{pct(e.oos[0])}</span>{(e.oos[3] ?? 0) < MIN_MONTHS ? " (too early to judge)" : ""}</> : null}.</span>{" "}
      <Link href={e.paper} className="evlink">Evidence ›</Link>
    </div>
  );
}
