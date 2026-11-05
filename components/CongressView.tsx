"use client";
// Stock trades by members of the House (STOCK Act reports): the latest disclosures, the
// most-bought and most-sold stocks, and the most active members; each member has a page
// (/congress/<slug>). Data: public/data/congress-overview.json, public/data/congress/<slug>.json,
// /api/congress for stock pages.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memberSlug, amountRange } from "@/lib/congress.mjs";

export type CTrade = { m: string; p: string | null; sd: string; f: string; d: string; o: string; t: string; a: string; y: string; x?: boolean; lo: number | null; hi: number | null; u: string };
export type Member = { m: string; s: string; p: string | null; sd: string; current: boolean; n: number; buys: number; sells: number; last: string };
/** What the member dropdown needs. */
export type PickerMember = Pick<Member, "m" | "p" | "sd" | "n">;
export type Overview = {
  updated: string;
  stats: { trades30: number; members30: number; buys30: number; sells30: number; medianDelay: number | null; scannedSkipped: number; total: number };
  latest: CTrade[]; bought: { t: string; a: string; members: number; n: number }[]; sold: { t: string; a: string; members: number; n: number }[]; members: Member[];
};

const day = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.slice(0, 4) === String(new Date().getFullYear()) ? undefined : "numeric" });
const range = amountRange;
const OWNER: Record<string, string> = { SP: "spouse", JT: "joint", DC: "child" };
const delay = (t: CTrade) => Math.round((Date.parse(t.f) - Date.parse(t.d)) / 86_400_000);
export const Party = ({ p, sd }: { p: string | null; sd: string }) => <span className={`party${p === "R" ? " r" : p === "D" ? " d" : ""}`}>{p ? `${p}-` : ""}{sd}</span>;

/** Desktop table and phone list of trades (also used on stock pages). */
export function CongressTrades({ trades, showMember = true, showStock = true }: { trades: CTrade[]; showMember?: boolean; showStock?: boolean }) {
  if (!trades.length) return <p className="muted pad">No trades.</p>;
  return (
    <>
      <table className="ttable d-only">
        <thead><tr><th>Disclosed</th>{showMember ? <th>Member</th> : null}{showStock ? <th>Stock</th> : null}<th></th><th className="r">Amount</th><th className="r">Traded</th></tr></thead>
        <tbody>{trades.map((t, i) => (
          <tr key={t.u + t.t + t.d + i}>
            <td className="mono"><a href={t.u} target="_blank" rel="noreferrer" className="muted" title="The member's report (PDF)">{day(t.f)} ↗</a></td>
            {showMember ? <td><Link className="linkish" href={`/congress/${memberSlug(t.m)}`}>{t.m}</Link> <Party p={t.p} sd={t.sd} /></td> : null}
            {showStock ? <td className="cstock"><Link href={`/stock/${t.t}`}><strong>{t.t}</strong> <span className="muted">{t.a.replace(/\s*-?\s*(Common Stock|Class [A-C] Common Stock|Ordinary Shares).*$/i, "")}</span></Link></td> : null}
            <td><span className={`side ${t.y === "P" ? "up" : "down"}`} title={t.x ? "Partial sale" : undefined}>{t.y === "P" ? "BUY" : "SELL"}</span></td>
            <td className="mono r">{range(t.lo, t.hi)}{OWNER[t.o] ? <div className="muted small">{OWNER[t.o]}</div> : null}</td>
            <td className="mono muted r">{day(t.d)}<div className="small">reported {delay(t)} days later</div></td>
          </tr>
        ))}</tbody>
      </table>
      <ul className="lrows m-only">{trades.slice(0, 40).map((t, i) => (
        <li key={t.u + t.t + t.d + i}><Link href={`/stock/${t.t}`}>
          <span className={`side ${t.y === "P" ? "up" : "down"}`}>{t.y === "P" ? "BUY" : "SELL"}</span>
          <span className="lrow-main"><span><strong>{t.t}</strong>{showMember ? <span className="muted"> · {t.m}</span> : null}</span><span className="muted small">{showMember ? <Party p={t.p} sd={t.sd} /> : null} traded {day(t.d)}{OWNER[t.o] ? ` · ${OWNER[t.o]}` : ""}</span></span>
          <span className="lrow-v"><span className="mono">{range(t.lo, t.hi)}</span><span className="muted small">disclosed {day(t.f)}</span></span>
        </Link></li>
      ))}</ul>
    </>
  );
}
/** The member dropdown: picking one opens their page. */
export function MemberPicker({ members, current = "" }: { members: PickerMember[]; current?: string }) {
  const router = useRouter();
  return (
    <section className="card span12 cpick">
      <label className="picker">
        <span className="muted small">Member of the House</span>
        <select value={current} onChange={(e) => router.push(e.target.value ? `/congress/${e.target.value}` : "/congress")}>
          <option value="">All members</option>
          {[...members].sort((a, b) => a.m.localeCompare(b.m)).map((x) => <option key={x.m} value={memberSlug(x.m)}>{x.m} ({x.p ?? "former"}-{x.sd}) · {x.n} trades</option>)}
        </select>
      </label>
    </section>
  );
}

const Note = ({ skipped }: { skipped: number }) => <p className="muted small span12">From House members&apos; STOCK Act reports (U.S. House Clerk), checked daily. Amounts are the ranges members report; trades can be disclosed up to 45 days later. {skipped} paper filings are scanned images and can&apos;t be read. Senate not included yet.</p>;

/** One member's page; rendered on the server so search engines can read it. */
export function MemberView({ member: sel, trades: shown, members, skipped }: { member: Member; trades: CTrade[]; members: PickerMember[]; skipped: number }) {
  return (
    <div className="ov">
      <h1 className="sr-only">{sel.m} stock trades</h1>
      <MemberPicker members={members} current={memberSlug(sel.m)} />
      <section className="kpis">
        <div className="kpi"><small>Member</small><span>{sel.m}</span><em><Party p={sel.p} sd={sel.sd} />{sel.current ? "" : " · former member"}</em></div>
        <div className="kpi"><small>Stock trades · 2 yrs</small><span className="mono">{sel.n.toLocaleString("en-US")}</span><em>reported</em></div>
        <div className="kpi"><small>Buys</small><span className="mono up">{sel.buys.toLocaleString("en-US")}</span><em>purchases</em></div>
        <div className="kpi"><small>Sales</small><span className="mono down">{sel.sells.toLocaleString("en-US")}</span><em>full or partial</em></div>
        <div className="kpi d-only"><small>Latest trade</small><span className="mono">{day(sel.last)}</span><em>trade date</em></div>
      </section>
      <section className="card flush">
        <div className="card-title"><h2>{sel.m}&apos;s trades <span className="muted small">newest disclosures first{sel.n > shown.length ? ` · latest ${shown.length}` : ""}</span></h2><Link href="/congress" className="linkbtn">All members ›</Link></div>
        <CongressTrades trades={shown} showMember={false} />
      </section>
      <Note skipped={skipped} />
    </div>
  );
}

/** The overview arrives from the server (so search engines read it); the browser fetches it only if that failed. */
export function CongressView({ initial }: { initial?: Overview | null }) {
  const router = useRouter();
  const [o, setO] = useState<Overview | null | undefined>(initial ?? undefined);
  useEffect(() => {
    // Old links (/congress?member=Name) go to the member's page.
    const m = new URLSearchParams(location.search).get("member");
    if (m) { router.replace(`/congress/${memberSlug(m)}`); return; }
    if (!initial) fetch("/data/congress-overview.json").then((r) => (r.ok ? r.json() : null)).then(setO).catch(() => setO(null));
  }, [router, initial]);

  if (o === undefined) return <section className="card"><p className="muted">Loading…</p></section>;
  if (!o) return <section className="card"><p className="muted">Congress trades aren&apos;t available right now.</p></section>;
  const s = o.stats;
  return (
    <div className="ov">
      <h1 className="sr-only">Congress stock trades</h1>
      <MemberPicker members={o.members} />
      <section className="kpis">
        <div className="kpi"><small>Trades · 30d</small><span className="mono">{s.trades30}</span><em>disclosed</em></div>
        <div className="kpi"><small>Members trading</small><span className="mono">{s.members30}</span><em>last 30 days</em></div>
        <div className="kpi"><small>Buys</small><span className="mono up">{s.buys30}</span><em>last 30 days</em></div>
        <div className="kpi"><small>Sales</small><span className="mono down">{s.sells30}</span><em>last 30 days</em></div>
        <div className="kpi d-only"><small>Days to disclose</small><span className="mono">{s.medianDelay ?? "—"}</span><em>median; the law allows 45</em></div>
      </section>

      <section className="card flush span8">
        <div className="card-title"><h2>Latest disclosed trades <span className="muted small">House members, stocks only</span></h2></div>
        <CongressTrades trades={o.latest.slice(0, 25)} />
      </section>

      <div className="stack span4" style={{ alignContent: "start" }}>
        {[["Most bought", o.bought, "up"], ["Most sold", o.sold, "down"]].map(([title, list, tone]) => (
          <section key={title as string} className="card flush">
            <div className="card-title"><h2>{title as string} <span className="muted small">last 90 days</span></h2></div>
            <ul className="lrows">{(list as Overview["bought"]).slice(0, 6).map((x) => (
              <li key={x.t}><Link href={`/stock/${x.t}`}>
                <strong className="lrow-sym">{x.t}</strong>
                <span className="lrow-main"><span className="muted small">{x.a.replace(/\s*-?\s*(Common Stock|Ordinary Shares).*$/i, "")}</span></span>
                <span className="lrow-v"><span className={`mono ${tone}`}>{x.members} {x.members === 1 ? "member" : "members"}</span><span className="muted small">{x.n} trades</span></span>
              </Link></li>
            ))}</ul>
          </section>
        ))}
      </div>

      <section className="card flush">
        <div className="card-title"><h2>Most active members <span className="muted small">stock trades, last 2 years</span></h2></div>
        <ul className="lrows">{o.members.slice(0, 12).map((x) => (
          <li key={x.m}><Link href={`/congress/${memberSlug(x.m)}`}>
            <span className="lrow-main"><span><strong>{x.m}</strong> <Party p={x.p} sd={x.sd} />{x.current ? null : <span className="muted small"> · former</span>}</span><span className="muted small">latest trade {day(x.last)}</span></span>
            <span className="lrow-v"><span className="mono">{x.n.toLocaleString("en-US")} trades</span><span className="muted small"><span className="up">{x.buys} buys</span> · <span className="down">{x.sells} sales</span></span></span>
          </Link></li>
        ))}</ul>
      </section>
      <Note skipped={s.scannedSkipped} />
    </div>
  );
}

/** "Congress trades in X" on stock pages. */
export function CongressFor({ symbol }: { symbol: string }) {
  const [rows, setRows] = useState<CTrade[] | null>(null);
  useEffect(() => { fetch(`/api/congress?symbol=${encodeURIComponent(symbol)}`).then((r) => r.json()).then((d) => setRows(d.trades ?? [])).catch(() => setRows([])); }, [symbol]);
  if (!rows?.length) return null;
  return (
    <section className="card flush">
      <div className="card-title"><h2>Congress trades in {symbol} <span className="muted small">House members, last 2 years</span></h2><Link href="/congress" className="linkbtn">All ›</Link></div>
      <CongressTradesLinked trades={rows.slice(0, 12)} />
    </section>
  );
}
// On stock pages member names link to the member's page.
function CongressTradesLinked({ trades }: { trades: CTrade[] }) {
  return (
    <ul className="lrows">{trades.map((t, i) => (
      <li key={t.u + t.d + i}><Link href={`/congress/${memberSlug(t.m)}`}>
        <span className={`side ${t.y === "P" ? "up" : "down"}`}>{t.y === "P" ? "BUY" : "SELL"}</span>
        <span className="lrow-main"><span><strong>{t.m}</strong> <Party p={t.p} sd={t.sd} /></span><span className="muted small">traded {day(t.d)} · disclosed {day(t.f)}{OWNER[t.o] ? ` · ${OWNER[t.o]}` : ""}</span></span>
        <span className="lrow-v mono">{range(t.lo, t.hi)}</span>
      </Link></li>
    ))}</ul>
  );
}
