"use client";
// Insider trades as plain sentences ("James Healy (Director) bought 10,000 shares at $25.10"),
// grouped by the day they became public. Used on the Insiders page and stock pages.
import { plausibleReason } from "@/lib/insider";
import { useState } from "react";
import Link from "next/link";
import type { InsiderTrade } from "@/lib/sec";
import { fmtBig } from "@/lib/format";
import { TIER_LABEL } from "@/lib/conviction.mjs";
import { personName, roleLabel, companyName } from "@/lib/people.mjs";

export { personName, roleLabel };

const VERB: Record<string, string> = { P: "bought", S: "sold", A: "was awarded", M: "exercised options for", X: "exercised options for", F: "had withheld for taxes", G: "gave away", D: "returned", C: "converted" };

const dayLabel = (d: string) => {
  const today = new Date().toISOString().slice(0, 10);
  const y = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  // The year only for other years, so long histories (insider pages) read in order.
  const otherYear = d.slice(0, 4) !== today.slice(0, 4);
  return d === today ? "Today" : d === y ? "Yesterday" : new Date(d + "T12:00:00").toLocaleDateString(undefined, otherYear ? { month: "short", day: "numeric", year: "numeric" } : { weekday: "short", month: "short", day: "numeric" });
};

/** Buy label plus the reasons behind it ("CEO · Stake +40% · First buy in 3 years"). */
export function Signal({ c, compact = false }: { c: NonNullable<InsiderTrade["conv"]>; compact?: boolean }) {
  const reasons = (compact ? c.reasons.filter((r) => !r.neg) : c.reasons).filter(plausibleReason).slice(0, compact ? 3 : undefined);
  return (
    <div className="signal">
      <span className={`tier tier-${c.tier}`} title={`Score ${c.score}/100: how unusual this buy is (who bought, how much of their own stake, how long since they last bought, whether other insiders are buying too). Not a prediction of returns.`}>{TIER_LABEL[c.tier]}</span>
      {reasons.map((r) => <span key={r.text} className={`why${r.neg ? " neg" : ""}`}>{r.text}</span>)}
    </div>
  );
}

function Trade({ t, showCompany }: { t: InsiderTrade; showCompany: boolean }) {
  const buy = t.code === "P", sell = t.code === "S";
  return (
    <li className="trade">
      <div className="trade-main">
        {showCompany ? (
          <div className="trade-co"><Link href={`/stock/${t.symbol}`}><strong>{t.symbol}</strong></Link> <span className="muted">{companyName(t.issuer, t.symbol)}</span></div>
        ) : null}
        <div>
          {t.ownerCik ? <Link href={`/insider/${t.ownerCik}`} className="person"><strong>{personName(t.owner)}</strong></Link> : <strong>{personName(t.owner)}</strong>} <span className="muted">({roleLabel(t.role)})</span>{" "}
          <span className={buy ? "up" : sell ? "down" : ""}>{VERB[t.code] ?? "traded"}</span>{" "}
          {t.shares ? `${Math.round(t.shares).toLocaleString()} shares` : "shares"}{t.price ? ` at $${t.price.toFixed(2)}` : ""}
        </div>
        {t.conv ? <Signal c={t.conv} /> : null}
        {t.sale && (t.sale.notable || t.sale.flags.some((f) => f.text !== "Not pre-planned")) ? (
          <div className="signal">
            {t.sale.notable ? <span className="tier tier-sale" title="Not under a pre-set trading plan, and either a top executive selling a large share or $1M+, or anyone selling half or more of the holding.">Notable sale</span> : null}
            {t.sale.flags.map((f) => <span key={f.text} className="why">{f.text}</span>)}
          </div>
        ) : null}
        <div className="muted small">
          {t.planned && !t.conv ? <span className="badge" title="Scheduled in advance under a trading plan (Rule 10b5-1), so it says less about the insider's current view.">Planned</span> : null}
          {t.date && t.date !== t.filed ? `traded ${dayLabel(t.date)} · ` : ""}
          {/* Forms often report direct and indirect (trust, fund) holdings separately; skip a "now owns" smaller than the trade itself. */}
          {t.ownedAfter != null && t.ownedAfter >= t.shares ? `now owns ${fmtBig(t.ownedAfter)} shares · ` : ""}
          <a href={t.url} target="_blank" rel="noreferrer">SEC filing ↗</a>
        </div>
      </div>
      <div className={`trade-value mono ${buy ? "up" : sell ? "down" : "muted"}`}>{t.value ? "$" + fmtBig(t.value) : "—"}</div>
    </li>
  );
}

export function TradeList({ trades, showCompany = true, pageSize = 40, empty = "No insider trades match." }: { trades: InsiderTrade[]; showCompany?: boolean; pageSize?: number; empty?: string }) {
  const [shown, setShown] = useState(pageSize);
  if (!trades.length) return <p className="muted">{empty}</p>;
  // Group by the day the trade became public (filing date), newest first; biggest first within a day.
  const groups = new Map<string, InsiderTrade[]>();
  for (const t of [...trades].sort((a, b) => (b.filed || b.date).localeCompare(a.filed || a.date) || (b.value ?? 0) - (a.value ?? 0)).slice(0, shown)) {
    const k = t.filed || t.date;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(t);
  }
  return (
    <>
      {[...groups].map(([d, list]) => (
        <div key={d}>
          <h3 className="dayhead">{dayLabel(d)}</h3>
          <ul className="trades">{list.map((t, i) => <Trade key={t.accession + t.code + i} t={t} showCompany={showCompany} />)}</ul>
        </div>
      ))}
      {trades.length > shown ? <button className="btn wide" onClick={() => setShown(shown + pageSize)}>Show more ({(trades.length - shown).toLocaleString()} left)</button> : null}
    </>
  );
}
