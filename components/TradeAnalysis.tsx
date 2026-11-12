"use client";
// "Analysis" under an insider buy or sale: how strong the insider's commitment looks, who else
// traded, the company's finances, what the company announced around the trade, how trades like
// it did in the research (with the 90% range drawn), and notes that change how to read it.
// Everything is a fact or a past result; nothing is a forecast. Collapsed by default.
import Link from "next/link";
import { evidenceFor } from "@/lib/evidence";
import { MIN_MONTHS } from "@/lib/researchClaims.mjs";
import { eventsAround, health, othersAround, tradeNotes } from "@/lib/context.mjs";
import type { InsiderTrade } from "@/lib/sec";
import type { Announcement } from "@/lib/news";

export type TradeContext = { trades?: InsiderTrade[]; news?: Announcement[] | null; fund?: Record<string, any> | null };

const pct = (x: number) => `${x > 0.05 ? "+" : x < -0.05 ? "−" : ""}${Math.abs(x).toFixed(1)}%`;

/** The median and its 90% range on a scale around zero, so "does the range include zero?" is visible. */
export function RangeBar({ median, lo, hi }: { median: number; lo?: number | null; hi?: number | null }) {
  const span = Math.max(8, Math.abs(lo ?? median), Math.abs(hi ?? median)) * 1.15;
  const x = (v: number) => 50 + (v / span) * 50;
  const tone = (lo ?? median) > 0 ? "up" : (hi ?? median) < 0 ? "down" : "";
  return (
    <svg className={`rangebar ${tone}`} viewBox="0 0 100 14" preserveAspectRatio="none" role="img" aria-label={`Median ${pct(median)}${lo != null && hi != null ? `, 90% range ${pct(lo)} to ${pct(hi)}` : ""}`}>
      <line x1="50" x2="50" y1="0" y2="14" className="rb-zero" />
      {lo != null && hi != null ? <rect x={x(lo)} width={Math.max(0.8, x(hi) - x(lo))} y="5" height="4" className="rb-range" /> : null}
      <circle cx={x(median)} cy="7" r="2.6" className="rb-mid" />
    </svg>
  );
}

const ago = (gap: number) => (gap === 0 ? "same day" : gap < 0 ? `${-gap} day${gap === -1 ? "" : "s"} before` : `${gap} day${gap === 1 ? "" : "s"} after`);

export function TradeAnalysis({ t, ctx }: { t: InsiderTrade; ctx?: TradeContext }) {
  const buy = t.code === "P", sale = t.code === "S";
  if (!buy && !sale) return null;
  const e = evidenceFor(t);
  const notes = tradeNotes(t);
  const others = ctx?.trades ? othersAround(t, ctx.trades) : null;
  const fromReasons = Number((t.conv?.reasons ?? []).map((r) => /^(\d+) insiders buying$/.exec(r.text)?.[1]).find(Boolean) ?? 0);
  const events = ctx?.news ? eventsAround(t, ctx.news) : null;
  const fin = ctx?.fund ? health(ctx.fund) : null;
  return (
    <details className="analysis">
      <summary>Analysis</summary>
      <dl className="an-rows">
        <div>
          <dt>Conviction</dt>
          <dd>
            {buy && t.conv ? <>
              <span className="an-meter" role="img" aria-label={`Insider Activity Score ${t.conv.score} of 100`}><span style={{ width: `${t.conv.score}%` }} /></span>
              <span className="mono">{t.conv.score}/100</span> Insider Activity Score{t.conv.reasons.length ? ` (${t.conv.reasons.map((r) => r.text).join(" · ")})` : ""}.
              <span className="muted"> How out of the ordinary the buy is for this person; higher scores didn&apos;t do better in our research.</span>
            </> : sale && t.sale ? <>
              {t.sale.notable ? "Large unplanned sale" : "Not flagged as a large unplanned sale"}{t.sale.flags.length ? ` (${t.sale.flags.map((f) => f.text).join(" · ")})` : ""}.
            </> : <span className="muted">Not scored.</span>}
          </dd>
        </div>
        <div>
          <dt>Other insiders</dt>
          <dd>{others != null
            ? others ? `${others} other insider${others === 1 ? "" : "s"} ${buy ? "bought" : "sold"} within 30 days, in the filings on this page.` : `No other insider ${buy ? "bought" : "sold"} within 30 days, in the filings on this page.`
            : fromReasons ? `${fromReasons} insiders buying at the same time.` : <span className="muted">See the stock page for the company&apos;s other filings.</span>}</dd>
        </div>
        {fin ? (
          <div>
            <dt>Company finances</dt>
            <dd>{fin.length ? <span className="an-chips">{fin.map((h) => <span key={h.text} className={`an-chip ${h.tone}`}>{h.text}</span>)}</span> : <span className="muted">No figures in SEC&apos;s data.</span>}
              <span className="muted small"> Latest SEC figures; not tested in our research.</span></dd>
          </div>
        ) : null}
        {events ? (
          <div>
            <dt>Around this trade</dt>
            <dd>{events.length ? <ul className="an-events">{events.map((a: Announcement & { gap: number }) => <li key={a.link}><a href={a.link} target="_blank" rel="noreferrer">{a.items.join(" · ")}</a> <span className="muted">({ago(a.gap)})</span></li>)}</ul>
              : <span className="muted">No 8-K announcements within 30 days.</span>}</dd>
          </div>
        ) : null}
        {e ? (
          <div>
            <dt>Trades like this</dt>
            <dd>
              {e.label}, 2023–25: median <span className={`mono ${e.main[0] > 0.05 ? "up" : e.main[0] < -0.05 ? "down" : ""}`}>{pct(e.main[0])}</span> after six months vs other insider {e.sale ? "sales" : "buys"} that month (not the market)
              {e.main[4] != null && e.main[5] != null ? <>, 90% range {pct(e.main[4])} to {pct(e.main[5])}</> : null}; {Math.round(e.main[1])}% {e.sale ? "did worse" : "did better"} ({e.main[2].toLocaleString("en-US")} trades).
              <RangeBar median={e.main[0]} lo={e.main[4]} hi={e.main[5]} />
              {e.oos ? <span className="muted"> Filed since January 2026: {pct(e.oos[0])}{(e.oos[3] ?? 0) < MIN_MONTHS ? ", too early to judge" : ""}.</span> : null}{" "}
              <Link href={e.paper}>Evidence ›</Link>
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Notes</dt>
          <dd>{notes.length ? <ul className="an-notes">{notes.map((n) => <li key={n.text} className={n.tone}><strong>{n.text}</strong> <span className="muted">{n.why}</span></li>)}</ul> : <span className="muted">Nothing unusual about the filing itself.</span>}</dd>
        </div>
      </dl>
    </details>
  );
}
