"use client";
// House trades read together: a member's track record with its 90% range, their committees and
// the sectors those cover, the sectors they trade, stocks several members bought at the same
// time, and members ranked by track record with how many "beat" verdicts chance alone would
// give. Built by scripts/lib/congress-intel.mjs; facts, never accusations or forecasts.
import Link from "next/link";
import { HBars } from "@/components/Bars";
import { RangeBar } from "@/components/TradeAnalysis";
import { fmtBig } from "@/lib/format";
import { memberSlug } from "@/lib/congress.mjs";

export type Track = { n: number; months: number; med: number; lo: number | null; hi: number | null; verdict: "beat" | "trailed" | "no clear edge" | "too few" };
export type SectorRow = { sector: string; buy: number; sell: number; n: number };
export type Overlap = { t: string; a: string; members: string[]; first: string; last: string; n: number; usd: number };
export type Committee = { id: string; name: string; sectors: string[] };

const pct = (x: number) => `${x > 0.0005 ? "+" : x < -0.0005 ? "−" : ""}${Math.abs(x * 100).toFixed(1)}%`;
const day = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const VERDICT: Record<Track["verdict"], string> = {
  beat: "Beat the S&P 500 (range above zero)", trailed: "Trailed the S&P 500 (range below zero)",
  "no clear edge": "No clear edge (range includes zero)", "too few": "Too few trades to judge",
};
const MIN = "10 purchases over 6 filing months";

/** A member's purchases, from when each became public to the latest close, against the S&P 500. */
export function TrackRecord({ tr, who }: { tr?: Track; who: string }) {
  return (
    <section className="card">
      <h2>Track record <span className="muted small">{who} purchases vs the S&amp;P 500, since each was disclosed</span></h2>
      {!tr ? <p className="muted">No priced purchases yet.</p> : <>
        <p className={`tr-verdict ${tr.verdict === "beat" ? "up" : tr.verdict === "trailed" ? "down" : ""}`}><strong>{VERDICT[tr.verdict]}</strong></p>
        <div className="rf-fig">
          <span className={`mono ${tr.med > 0 ? "up" : tr.med < 0 ? "down" : ""}`}>{pct(tr.med)}</span>
          <RangeBar median={tr.med * 100} lo={tr.lo != null ? tr.lo * 100 : null} hi={tr.hi != null ? tr.hi * 100 : null} />
          <span className="muted small">{tr.lo != null && tr.hi != null ? `90% range ${pct(tr.lo)} to ${pct(tr.hi)}, ` : ""}{tr.n} purchases over {tr.months} filing months</span>
        </div>
        <p className="muted small">The median of each purchase&apos;s own gap to the S&amp;P 500, from the first close after disclosure to the latest close (the figures above compare the median stock with the median S&amp;P move instead, so they differ). Recent trades count for less time than old ones. A verdict needs at least {MIN}. Past results, not a forecast; our test of all House trades found no group that clearly beat the market (<Link href="/research/house-trades">paper no. 4</Link>).</p>
      </>}
    </section>
  );
}

/** The member's committees and the sectors Arkanum counts as each one's area. */
export function Committees({ list, who }: { list: Committee[]; who: string }) {
  if (!list.length) return null;
  return (
    <section className="card">
      <h2>Committees <span className="muted small">{who} seats in the current Congress</span></h2>
      <ul className="cm-list">{list.map((c) => (
        <li key={c.id}><strong>{c.name}</strong>{c.sectors.length ? <span className="muted small"> · covers {c.sectors.join(", ")}</span> : null}</li>
      ))}</ul>
      <p className="muted small">Trades in a sector one of these committees covers are marked &ldquo;committee sector&rdquo;. A committee seat can give early sight of rules and contracts that move an industry, which is why it&apos;s shown; it is not evidence that any trade used such information. The sector for each committee is Arkanum&apos;s reading of its jurisdiction.</p>
    </section>
  );
}

/** Estimated dollars bought and sold, by sector. */
export function Sectors({ rows, title, note }: { rows: SectorRow[]; title: string; note?: string }) {
  if (!rows.length) return null;
  return (
    <section className="card">
      <h2>{title} <span className="muted small">estimated $, from reported ranges</span></h2>
      <HBars rows={rows.slice(0, 10).map((r) => ({ key: r.sector, label: <strong>{r.sector}</strong>, sub: `bought ~$${fmtBig(r.buy)} · sold ~$${fmtBig(r.sell)}`, value: r.buy + r.sell, text: `~$${fmtBig(r.buy + r.sell)}`, tone: r.buy >= r.sell ? "up" : "down" }))} />
      <p className="muted small">Sectors from SEC industry codes; foreign companies and funds without one are under &ldquo;Other or foreign&rdquo;.{note ? ` ${note}` : ""}</p>
    </section>
  );
}

/** Stocks two or more members bought within 30 days of each other. */
export function BoughtTogether({ rows }: { rows: Overlap[] }) {
  if (!rows.length) return null;
  return (
    <section className="card flush">
      <div className="card-title"><h2>Bought by several members <span className="muted small">within 30 days of each other, last year</span></h2></div>
      <ul className="lrows">{rows.slice(0, 10).map((x) => (
        <li key={x.t}><Link href={`/stock/${x.t}`}>
          <strong className="lrow-sym">{x.t}</strong>
          <span className="lrow-main"><span className="small wraps">{x.members.join(", ")}</span><span className="muted small">{day(x.first)} to {day(x.last)}</span></span>
          <span className="lrow-v"><span className="mono">{x.members.length} members</span><span className="muted small">~${fmtBig(x.usd)}</span></span>
        </Link></li>
      ))}</ul>
      <p className="muted small pad">Members of Congress often buy the same large companies independently; buying together is a pattern, not evidence of coordination.</p>
    </section>
  );
}

type RankMember = { m: string; tr?: Track };
/** Members ranked by track record, only those with enough trades, with the chance baseline. */
export function ByTrackRecord({ members }: { members: RankMember[] }) {
  const judged = members.filter((x) => x.tr && x.tr.verdict !== "too few").sort((a, b) => b.tr!.med - a.tr!.med);
  const beat = judged.filter((x) => x.tr!.verdict === "beat").length, trailed = judged.filter((x) => x.tr!.verdict === "trailed").length;
  const chance = Math.round(judged.length * 0.05);
  if (!judged.length) return <p className="muted pad">No member has {MIN} yet, so there&apos;s nothing to rank.</p>;
  return (
    <>
      <p className="muted small pad">Of {judged.length} members with at least {MIN}, {beat} beat the S&amp;P 500 and {trailed} trailed it, with ranges that exclude zero. Testing {judged.length} members, about {chance || "one"} would land on each side by chance alone, so a few &ldquo;beat&rdquo; verdicts are expected even if nobody has an edge.</p>
      <ul className="lrows">{judged.slice(0, 15).map((x) => (
        <li key={x.m}><Link href={`/congress/${memberSlug(x.m)}`}>
          <span className="lrow-main"><strong>{x.m}</strong><span className="muted small">{VERDICT[x.tr!.verdict]} · {x.tr!.n} purchases</span></span>
          <span className="lrow-v tr-cell"><span className={`mono ${x.tr!.med > 0 ? "up" : "down"}`}>{pct(x.tr!.med)}</span>
            <RangeBar median={x.tr!.med * 100} lo={x.tr!.lo != null ? x.tr!.lo * 100 : null} hi={x.tr!.hi != null ? x.tr!.hi * 100 : null} /></span>
        </Link></li>
      ))}</ul>
    </>
  );
}
