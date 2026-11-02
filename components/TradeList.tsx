"use client";
// Insider trades as plain sentences ("James Healy (Director) bought 10,000 shares at $25.10"),
// grouped by the day they became public. Used on the Insiders page and stock pages.
import { useState } from "react";
import Link from "next/link";
import type { InsiderTrade } from "@/lib/sec";
import { fmtBig } from "@/lib/format";

const ORG = /\b(LLC|L\.?P\.?|INC|CORP|FUND|TRUST|HOLDINGS?|CAPITAL|PARTNERS|MANAGEMENT|ADVISORS?|GROUP|LTD|LIMITED|FOUNDATION|VENTURES|INVESTMENTS?|ASSOCIATES|PLC|SA|AG|NV|CO)\b/i;
const titleCase = (s: string) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\bIi\b/g, "II").replace(/\bIii\b/g, "III");

/** SEC lists people surname-first in capitals ("HEALY JAMES"); show "James Healy". */
export function personName(raw: string) {
  const first = raw.split(",")[0].trim(); // several filers on one form → the first one
  const more = raw.includes(",") ? " and others" : "";
  if (ORG.test(first)) return titleCase(first) + more;
  const parts = first.split(/\s+/);
  const suffix = /^(JR|SR|II|III|IV)\.?$/i.test(parts.at(-1) ?? "") ? " " + parts.pop() : "";
  const name = parts.length > 1 ? [...parts.slice(1), parts[0]].join(" ") : first;
  return titleCase(name) + titleCase(suffix) + more;
}

/** Titles: keep ones already in mixed case; in ALL-CAPS ones keep short abbreviations
 *  (SVP, EVP, GC, VP) and lowercase small words ("and", "of"). */
function niceTitle(p: string) {
  if (/[a-z]/.test(p)) return p;
  return p.split(/\s+/).map((w) => (/^[A-Z&]{1,4}$/.test(w) && !/^(AND|OF|THE|FOR)$/.test(w) ? w : /^(AND|OF|THE|FOR)$/.test(w) ? w.toLowerCase() : titleCase(w))).join(" ");
}

const SHORT: [RegExp, string][] = [
  [/chief executive officer|\bceo\b/i, "CEO"], [/chief financial officer|\bcfo\b/i, "CFO"], [/chief operating officer|\bcoo\b/i, "COO"],
  [/chief technology officer|\bcto\b/i, "CTO"], [/general counsel/i, "General Counsel"], [/chair(man|woman|person)?/i, "Chair"], [/president/i, "President"],
];
/** "Chief Executive Officer, Director, 10% owner" → "CEO & director, major shareholder" */
export function roleLabel(role: string) {
  // The role string is "<officer title>, Director, 10% owner", but titles can contain
  // commas themselves ("SVP, GC and Government Affairs"), so rejoin the title fragments.
  const raw = role.split(",").map((p) => p.trim()).filter(Boolean);
  const parts: string[] = [];
  for (const p of raw) {
    if (["Director", "10% owner", "Other"].includes(p) || !parts.length || ["Director", "10% owner", "Other"].includes(parts.at(-1)!)) parts.push(p);
    else parts[parts.length - 1] += ", " + p;
  }
  const out: string[] = [];
  for (const p of parts) {
    if (p === "Other") continue;
    if (p === "Director") { out.push("director"); continue; }
    if (p === "10% owner") { out.push("major shareholder"); continue; }
    const hit = SHORT.find(([re]) => re.test(p));
    out.push(hit ? hit[1] : p.length > 34 ? "Officer" : niceTitle(p));
  }
  return out.length ? out.join(", ").replace(/, director/, " & director") : "insider";
}

const VERB: Record<string, string> = { P: "bought", S: "sold", A: "was awarded", M: "exercised options for", X: "exercised options for", F: "had withheld for taxes", G: "gave away", D: "returned", C: "converted" };

const dayLabel = (d: string) => {
  const today = new Date().toISOString().slice(0, 10);
  const y = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  return d === today ? "Today" : d === y ? "Yesterday" : new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

function Trade({ t, showCompany }: { t: InsiderTrade; showCompany: boolean }) {
  const buy = t.code === "P", sell = t.code === "S";
  return (
    <li className="trade">
      <div className="trade-main">
        {showCompany ? (
          <div className="trade-co"><Link href={`/stock/${t.symbol}`}><strong>{t.symbol}</strong></Link> <span className="muted">{titleCase(t.issuer)}</span></div>
        ) : null}
        <div>
          <strong>{personName(t.owner)}</strong> <span className="muted">({roleLabel(t.role)})</span>{" "}
          <span className={buy ? "up" : sell ? "down" : ""}>{VERB[t.code] ?? "traded"}</span>{" "}
          {t.shares ? `${Math.round(t.shares).toLocaleString()} shares` : "shares"}{t.price ? ` at $${t.price.toFixed(2)}` : ""}
        </div>
        <div className="muted small">
          {t.planned ? <span className="badge" title="Scheduled in advance under a trading plan (Rule 10b5-1), so it says less about the insider's current view.">Planned</span> : null}
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
