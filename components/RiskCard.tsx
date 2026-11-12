"use client";
// Risk on a stock page: every flag the data supports, grouped (events, leadership, finances,
// the stock itself, insiders), each with where it comes from. Red flags (warn) are counted;
// the rest is context. Facts, not a rating or a forecast.
import Link from "next/link";

export type Risk = { tone: string; kind: string; text: string; why?: string; link?: string };
const ORDER = ["Events", "Leadership", "Finances", "Stock", "Insiders"];

export const redFlags = (risks: Risk[]) => risks.filter((r) => r.tone === "warn").length;

/** "3 red flags" next to the company name, linking to the card. */
export function RiskBadge({ risks }: { risks: Risk[] }) {
  const n = redFlags(risks);
  return <a href="#risk" className={`risk-badge ${n ? "warn" : "ok"}`}>{n ? `${n} red flag${n === 1 ? "" : "s"}` : "No red flags"}</a>;
}

export function RiskCard({ risks, checked }: { risks: Risk[]; checked: string[] }) {
  const n = redFlags(risks);
  const groups = ORDER.map((k) => [k, risks.filter((r) => r.kind === k)] as const).filter(([, l]) => l.length);
  return (
    <section className="card risk-card" id="risk" aria-labelledby="risk-title">
      <h2 id="risk-title">Risk <span className="muted small">{n ? `${n} red flag${n === 1 ? "" : "s"}` : "no red flags in the data we have"}{risks.length > n ? `, ${risks.length - n} to know` : ""}</span></h2>
      {groups.length ? (
        <dl className="risk-groups">{groups.map(([k, list]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd><ul>{list.map((r) => (
              <li key={r.text} className={r.tone}>
                <span className={`risk-dot ${r.tone}`} aria-label={r.tone === "warn" ? "Red flag" : "To know"} />
                <span>{r.link ? <a href={r.link} target="_blank" rel="noreferrer">{r.text}</a> : <strong>{r.text}</strong>}{r.why ? <span className="muted small"> {r.why}</span> : null}</span>
              </li>
            ))}</ul></dd>
          </div>
        ))}</dl>
      ) : null}
      <p className="muted small">Checked: {checked.join(", ")}. From SEC filings and this page&apos;s data; a fact to weigh, not a rating or a forecast. Only the under-$5 flag comes from our <Link href="/research">research</Link>; the rest is untested context.</p>
    </section>
  );
}
