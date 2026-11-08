"use client";
// Stock trades by members of the House (STOCK Act reports): the latest disclosures, the
// most-bought and most-sold stocks, and the most active members; each member has a page
// (/congress/<slug>). Data: public/data/congress-overview.json, public/data/congress/<slug>.json,
// /api/congress for stock pages.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memberSlug, amountRange, estAmount } from "@/lib/congress.mjs";
import { Picker, type PickerItem } from "@/components/Picker";
import { fmtBig } from "@/lib/format";
import { ReturnCell, ReturnLine, ReturnsSummary, type RetSide, type Pair } from "@/components/Returns";
import { FollowButton } from "@/components/FollowButton";

export type CTrade = { r?: (number | null)[]; m: string; p: string | null; sd: string; f: string; d: string; o: string; t: string; a: string; y: string; x?: boolean; lo: number | null; hi: number | null; u: string; du?: boolean };
/** usd, buyUsd, sellUsd: estimated dollars traded (midpoints of the reported ranges). */
export type Member = { m: string; s: string; p: string | null; sd: string; current: boolean; n: number; buys: number; sells: number; usd?: number; buyUsd?: number; sellUsd?: number; last: string; ret?: { buys: RetSide; sells: RetSide } };
/** What the member dropdown needs. */
export type PickerMember = Pick<Member, "m" | "p" | "sd" | "n" | "usd">;
export type Overview = {
  updated: string;
  stats: { trades30: number; members30: number; buys30: number; sells30: number; medianDelay: number | null; scannedSkipped: number; total: number };
  latest: CTrade[]; bought: { t: string; a: string; members: number; n: number; usd?: number }[]; sold: { t: string; a: string; members: number; n: number; usd?: number }[]; members: Member[];
};

const day = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.slice(0, 4) === String(new Date().getFullYear()) ? undefined : "numeric" });
const range = amountRange;
const OWNER: Record<string, string> = { SP: "spouse", JT: "joint", DC: "child" };
const pctS = (x: number) => `${x > 0.0005 ? "+" : x < -0.0005 ? "−" : ""}${Math.abs(x * 100).toFixed(1)}%`;
const traded = (t: CTrade) => (t.du ? "date unclear" : day(t.d));
const delay = (t: CTrade) => Math.round((Date.parse(t.f) - Date.parse(t.d)) / 86_400_000);
export const Party = ({ p, sd }: { p: string | null; sd: string }) => <span className={`party${p === "R" ? " r" : p === "D" ? " d" : ""}`}>{p ? `${p}-` : ""}{sd}</span>;

/** Desktop table and phone list of trades (also used on stock pages). */
const pairs = (t: CTrade): [Pair, Pair] => [t.r && t.r[0] != null && t.r[1] != null ? [t.r[0], t.r[1]] : null, t.r && t.r[2] != null && t.r[3] != null ? [t.r[2], t.r[3]] : null];
export function CongressTrades({ trades, showMember = true, showStock = true, showReturns = false, phoneMax = 40 }: { trades: CTrade[]; showMember?: boolean; showStock?: boolean; showReturns?: boolean; phoneMax?: number }) {
  if (!trades.length) return <p className="muted pad">No trades.</p>;
  return (
    <>
      <div className="tscroll d-only"><table className="ttable">
        <thead><tr><th>Disclosed</th>{showMember ? <th>Member</th> : null}{showStock ? <th>Stock</th> : null}<th></th><th className="r">Amount</th><th className="r">Traded</th>{showReturns ? <><th className="r" title="Stock change since the trade date, and the S&P 500 over the same days">Since trade</th><th className="r" title="Stock change since the first trading day after it was disclosed, and the S&P 500">Since public</th></> : null}</tr></thead>
        <tbody>{trades.map((t, i) => (
          <tr key={t.u + t.t + t.d + i}>
            <td className="mono"><a href={t.u} target="_blank" rel="noreferrer" className="muted" title="The member's report (PDF)">{day(t.f)} ↗</a></td>
            {showMember ? <td><Link className="linkish" href={`/congress/${memberSlug(t.m)}`}>{t.m}</Link> <Party p={t.p} sd={t.sd} /></td> : null}
            {showStock ? <td className="cstock"><Link href={`/stock/${t.t}`}><strong>{t.t}</strong> <span className="muted">{t.a.replace(/\s*-?\s*(Common Stock|Class [A-C] Common Stock|Ordinary Shares).*$/i, "")}</span></Link></td> : null}
            <td><span className={`side ${t.y === "P" ? "up" : "down"}`} title={t.x ? "Partial sale" : undefined}>{t.y === "P" ? "BUY" : "SELL"}</span></td>
            <td className="mono r">{range(t.lo, t.hi)}{OWNER[t.o] ? <div className="muted small">{OWNER[t.o]}</div> : null}</td>
            <td className="mono muted r">{traded(t)}{t.du ? null : <div className="small">reported {delay(t)} days later</div>}</td>
            {showReturns ? <><td className="r"><ReturnCell p={pairs(t)[0]} /></td><td className="r"><ReturnCell p={pairs(t)[1]} /></td></> : null}
          </tr>
        ))}</tbody>
      </table></div>
      <ul className="lrows m-only">{trades.slice(0, phoneMax).map((t, i) => (
        <li key={t.u + t.t + t.d + i}><Link href={`/stock/${t.t}`}>
          <span className={`side ${t.y === "P" ? "up" : "down"}`}>{t.y === "P" ? "BUY" : "SELL"}</span>
          <span className="lrow-main">{showMember
            ? <><span className="wraps"><strong>{t.m}</strong> <Party p={t.p} sd={t.sd} /></span><span className="muted small"><strong style={{ color: "var(--text)" }}>{t.t}</strong> · traded {traded(t)}{OWNER[t.o] ? ` · ${OWNER[t.o]}` : ""}</span></>
            : <><span><strong>{t.t}</strong></span><span className="muted small">traded {traded(t)}{OWNER[t.o] ? ` · ${OWNER[t.o]}` : ""}</span></>}
            {showReturns ? <span className="wraps"><ReturnLine trade={pairs(t)[0]} pub={pairs(t)[1]} sale={t.y !== "P"} /></span> : null}</span>
          <span className="lrow-v"><span className="mono">{range(t.lo, t.hi)}</span><span className="muted small">disclosed {day(t.f)}</span></span>
        </Link></li>
      ))}</ul>
    </>
  );
}
const SIZES: [string, number][] = [["Any size", 0], ["$15K or more", 15_001], ["$50K or more", 50_001], ["$250K or more", 250_001], ["$1M or more", 1_000_001]];
const PERIODS: [string, number][] = [["Any date", 0], ["Traded in the last 30 days", 30], ["Last 90 days", 90], ["Last year", 365]];
const SORTS: Record<string, [string, (a: CTrade, b: CTrade) => number]> = {
  filed: ["Newest disclosed", (a, b) => b.f.localeCompare(a.f)],
  traded: ["Newest trade", (a, b) => b.d.localeCompare(a.d)],
  size: ["Largest", (a, b) => estAmount(b.lo, b.hi) - estAmount(a.lo, a.hi) || b.f.localeCompare(a.f)],
};
/** Latest trades, with filters (size, party, date, state) and sorting. The full list
 *  (congress-trades.json) is fetched the first time a filter or sort is used. */
function TradeBrowser({ initial, states }: { initial: CTrade[]; states: string[] }) {
  const [size, setSize] = useState(0), [party, setParty] = useState(""), [st, setSt] = useState(""), [days, setDays] = useState(0), [sort, setSort] = useState("filed");
  const [all, setAll] = useState<CTrade[] | null>(null), [shown, setShown] = useState(25);
  const active = size > 0 || party !== "" || st !== "" || days > 0 || sort !== "filed";
  useEffect(() => {
    if (active && !all) fetch("/data/congress-trades.json").then((r) => (r.ok ? r.json() : null)).then((d) => d && setAll(d.trades)).catch(() => {});
  }, [active, all]);
  useEffect(() => setShown(25), [size, party, st, days, sort]);
  const since = days ? new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10) : "";
  const list = (active && all ? all : initial)
    .filter((t) => (t.lo ?? 0) >= size && (!party || t.p === party) && (!st || t.sd.startsWith(st + "-") || t.sd === st) && (!since || t.d >= since))
    .sort(SORTS[sort][1]);
  const sel = (label: string, value: string | number, set: (v: string) => void, opts: [string, string | number][]) => (
    <label className="filt"><span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => set(e.target.value)} aria-label={label}>{opts.map(([l, v]) => <option key={String(v)} value={v}>{l}</option>)}</select>
    </label>
  );
  return (
    <>
      <div className="filters">
        {sel("Size", size, (v) => setSize(+v), SIZES)}
        {sel("Party", party, setParty, [["Any party", ""], ["Democrats", "D"], ["Republicans", "R"]])}
        {sel("Date", days, (v) => setDays(+v), PERIODS)}
        {sel("State", st, setSt, [["Any state", ""], ...states.map((x) => [x, x] as [string, string])])}
        {sel("Sort", sort, setSort, Object.entries(SORTS).map(([k, [l]]) => [l, k] as [string, string]))}
        {active ? <button className="linkbtn" onClick={() => { setSize(0); setParty(""); setSt(""); setDays(0); setSort("filed"); }}>Clear</button> : null}
      </div>
      {active && !all ? <p className="muted pad">Loading every trade…</p> : (
        <>
          {active ? <p className="muted small pad">{list.length.toLocaleString("en-US")} {list.length === 1 ? "trade" : "trades"}{size ? " · sizes are the ranges members report" : ""}</p> : null}
          <CongressTrades trades={list.slice(0, shown)} phoneMax={shown} />
          {list.length > shown ? <button className="btn more" onClick={() => setShown((n) => n + 50)}>Show more ({(list.length - shown).toLocaleString("en-US")} left)</button> : null}
        </>
      )}
    </>
  );
}

/** The member dropdown: picking one opens their page. */
export function MemberPicker({ members, current = "" }: { members: PickerMember[]; current?: string }) {
  const router = useRouter();
  const PARTY: Record<string, string> = { D: "democrat", R: "republican" };
  const items: PickerItem[] = [
    { value: "", label: "All members", sub: `${members.length} with stock trades` },
    ...[...members].sort((a, b) => a.m.localeCompare(b.m)).map((x) => ({ value: memberSlug(x.m), label: x.m, sub: `${x.p ? `${x.p}-` : "former · "}${x.sd} · ${x.n.toLocaleString("en-US")} ${x.n === 1 ? "trade" : "trades"}`, keywords: x.p ? PARTY[x.p] : "former" })),
  ];
  const featured = [...members].sort((a, b) => (b.usd ?? 0) - (a.usd ?? 0) || b.n - a.n).slice(0, 8).map((x) => memberSlug(x.m));
  return (
    <section className="card span12 cpick">
      <Picker label="Member of the House" items={items} value={current} featured={featured} placeholder="Search name, party or state (e.g. TX)"
        onChange={(v) => router.push(v ? `/congress/${v}` : "/congress")} />
    </section>
  );
}

const Note = ({ skipped }: { skipped: number }) => <p className="muted small span12">From House members&apos; STOCK Act reports (U.S. House Clerk), checked daily. Amounts are the ranges members report; trades can be disclosed up to 45 days later. {skipped} paper filings are scanned images and can&apos;t be read. Senate not included yet.</p>;

/** One member's page; rendered on the server so search engines can read it. */
export function MemberView({ member: sel, trades: shown, members, skipped, returnsAsOf }: { member: Member; trades: CTrade[]; members: PickerMember[]; skipped: number; returnsAsOf?: string | null }) {
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
      <section className="card span12"><FollowButton cik={`house:${memberSlug(sel.m)}`} name={sel.m} /></section>
      <ReturnsSummary buys={sel.ret?.buys} sells={sel.ret?.sells} asOf={returnsAsOf} who={`${sel.m}'s`} />
      <section className="card flush">
        <div className="card-title"><h2>{sel.m}&apos;s trades <span className="muted small">newest disclosures first{sel.n > shown.length ? ` · latest ${shown.length}` : ""}</span></h2><Link href="/congress" className="linkbtn">All members ›</Link></div>
        <CongressTrades trades={shown} showMember={false} showReturns />
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
        <div className="card-title"><h2>Trades <span className="muted small">House members, stocks only</span></h2></div>
        <TradeBrowser initial={o.latest} states={[...new Set(o.members.map((x) => x.sd.split("-")[0]))].sort()} />
      </section>

      <div className="stack span4" style={{ alignContent: "start" }}>
        {[["Most bought", o.bought, "up"], ["Most sold", o.sold, "down"]].map(([title, list, tone]) => (
          <section key={title as string} className="card flush">
            <div className="card-title"><h2>{title as string} <span className="muted small">last 90 days · estimated $</span></h2></div>
            <ul className="lrows">{(list as Overview["bought"]).slice(0, 6).map((x) => (
              <li key={x.t}><Link href={`/stock/${x.t}`}>
                <strong className="lrow-sym">{x.t}</strong>
                <span className="lrow-main"><span className="muted small">{x.a.replace(/\s*-?\s*(Common Stock|Ordinary Shares).*$/i, "")}</span></span>
                <span className="lrow-v"><span className={`mono ${tone}`}>{x.usd != null ? `~$${fmtBig(x.usd)}` : `${x.members} members`}</span><span className="muted small">{x.members} {x.members === 1 ? "member" : "members"} · {x.n} {x.n === 1 ? "trade" : "trades"}</span></span>
              </Link></li>
            ))}</ul>
          </section>
        ))}
      </div>

      <section className="card flush">
        <div className="card-title"><h2>Most active members <span className="muted small">estimated $ traded, last 2 years</span></h2></div>
        <ul className="lrows">{o.members.slice(0, 12).map((x) => (
          <li key={x.m}><Link href={`/congress/${memberSlug(x.m)}`}>
            <span className="lrow-main"><span className="wraps"><strong>{x.m}</strong> <Party p={x.p} sd={x.sd} />{x.current ? null : <span className="muted small"> · former</span>}</span><span className="muted small wraps">{x.n.toLocaleString("en-US")} trades · latest {day(x.last)}{x.ret?.buys?.trade ? <> · buys {pctS(x.ret.buys.trade.stock)} vs S&amp;P {pctS(x.ret.buys.trade.spy)}</> : null}</span></span>
            <span className="lrow-v"><span className="mono">{x.usd != null ? `~$${fmtBig(x.usd)}` : `${x.n.toLocaleString("en-US")} trades`}</span><span className="muted small"><span className="up">{x.buys} buys</span> · <span className="down">{x.sells} sales</span></span></span>
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
        <span className="lrow-main"><span className="wraps"><strong>{t.m}</strong> <Party p={t.p} sd={t.sd} /></span><span className="muted small">traded {traded(t)} · disclosed {day(t.f)}{OWNER[t.o] ? ` · ${OWNER[t.o]}` : ""}</span></span>
        <span className="lrow-v mono">{range(t.lo, t.hi)}</span>
      </Link></li>
    ))}</ul>
  );
}
