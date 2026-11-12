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
import { SectionIntro } from "@/components/SectionIntro";
import { KindsLine } from "@/components/KindsLine";
import { BoughtTogether, ByTrackRecord, Committees, Sectors, TrackRecord, type Committee, type Overlap, type SectorRow, type Track } from "@/components/CongressIntel";
const HOUSE_KINDS = "These are reported trades: what House members disclosed, often weeks after trading. None is a tested signal: in our test, no group of House trades clearly beat the market.";

export type CTrade = { r?: (number | null)[]; m: string; p: string | null; sd: string; f: string; d: string; o: string; t: string; a: string; y: string; x?: boolean; lo: number | null; hi: number | null; u: string; du?: boolean; ac?: string; am?: 1; jx?: 1 };
/** usd, buyUsd, sellUsd: estimated dollars traded (midpoints of the reported ranges). */
export type Member = { m: string; s: string; p: string | null; sd: string; current: boolean; n: number; buys: number; sells: number; usd?: number; buyUsd?: number; sellUsd?: number; last: string; ret?: { buys: RetSide; sells: RetSide }; w?: Record<string, [usd: number, n: number, buys: number, sells: number]>; tr?: Track; cm?: string[] };
/** What the member dropdown needs. */
export type PickerMember = Pick<Member, "m" | "p" | "sd" | "n" | "usd">;
type Ranked = { t: string; a: string; members: number; n: number; usd?: number };
export type Overview = {
  updated: string;
  stats: { trades30: number; members30: number; buys30: number; sells30: number; medianDelay: number | null; scannedSkipped: number; total: number };
  latest: CTrade[]; bought: Ranked[]; sold: Ranked[]; members: Member[];
  /** The same lists by trade date over 30, 90, 365 and 730 days. */
  windows?: Record<string, { bought: Ranked[]; sold: Ranked[] }>;
  overlap?: Overlap[]; sectors?: SectorRow[]; committees?: Record<string, string>;
};

const day = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.slice(0, 4) === String(new Date().getFullYear()) ? undefined : "numeric" });
const range = amountRange;
const OWNER: Record<string, string> = { SP: "spouse", JT: "joint", DC: "child" };
// Whose trade and which account: two otherwise identical rows are usually the same stock
// bought in two accounts (an IRA and a brokerage account), so the account is shown.
const whose = (t: CTrade) => [OWNER[t.o], t.ac, t.am ? "amended" : "", t.jx ? "committee sector" : ""].filter(Boolean).join(" · ");
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
        <thead><tr><th>Disclosed</th>{showMember ? <th>Member</th> : null}{showStock ? <th>Stock</th> : null}<th><span className="sr-only">Buy or sale</span></th><th className="r">Amount</th><th className="r">Traded</th>{showReturns ? <><th className="r" title="Stock change since the trade date, and the S&P 500 over the same days">Since trade</th><th className="r" title="Stock change since the first trading day after it was disclosed, and the S&P 500">Since public</th></> : null}</tr></thead>
        <tbody>{trades.map((t, i) => (
          <tr key={t.u + t.t + t.d + i}>
            <td className="mono"><a href={t.u} target="_blank" rel="noreferrer" className="muted" title="The member's report (PDF)">{day(t.f)} ↗</a></td>
            {showMember ? <td><Link className="linkish" href={`/congress/${memberSlug(t.m)}`}>{t.m}</Link> <Party p={t.p} sd={t.sd} /></td> : null}
            {showStock ? <td className="cstock"><Link href={`/stock/${t.t}`}><strong>{t.t}</strong> <span className="muted">{t.a.replace(/\s*-?\s*(Common Stock|Class [A-C] Common Stock|Ordinary Shares).*$/i, "")}</span></Link></td> : null}
            <td><span className={`side ${t.y === "P" ? "up" : "down"}`} title={t.x ? "Partial sale" : undefined}>{t.y === "P" ? "BUY" : "SELL"}</span></td>
            <td className="mono r">{range(t.lo, t.hi)}{whose(t) ? <div className="muted small">{whose(t)}</div> : null}</td>
            <td className="mono muted r">{traded(t)}{t.du ? null : <div className="small">reported {delay(t)} days later</div>}{!showReturns && pairs(t)[1] ? <div className="small" title="The stock since the first close after the disclosure, and the S&P 500 over the same days">since public <span className={pairs(t)[1]![0] > pairs(t)[1]![1] ? "up" : "down"}>{pctS(pairs(t)[1]![0])}</span> vs {pctS(pairs(t)[1]![1])}</div> : null}</td>
            {showReturns ? <><td className="r"><ReturnCell p={pairs(t)[0]} /></td><td className="r"><ReturnCell p={pairs(t)[1]} /></td></> : null}
          </tr>
        ))}</tbody>
      </table></div>
      <ul className="lrows m-only">{trades.slice(0, phoneMax).map((t, i) => (
        <li key={t.u + t.t + t.d + i} className="lrow-split"><Link href={`/stock/${t.t}`}>
          <span className={`side ${t.y === "P" ? "up" : "down"}`}>{t.y === "P" ? "BUY" : "SELL"}</span>
          <span className="lrow-main">{showMember
            ? <><span className="wraps"><strong>{t.m}</strong> <Party p={t.p} sd={t.sd} /></span><span className="muted small"><strong style={{ color: "var(--text)" }}>{t.t}</strong> · traded {traded(t)}{whose(t) ? ` · ${whose(t)}` : ""}</span></>
            : <><span><strong>{t.t}</strong></span><span className="muted small">traded {traded(t)}{whose(t) ? ` · ${whose(t)}` : ""}</span></>}
            {showReturns ? <span className="wraps"><ReturnLine trade={pairs(t)[0]} pub={pairs(t)[1]} sale={t.y !== "P"} /></span> : null}</span>
          <span className="lrow-v"><span className="mono">{range(t.lo, t.hi)}</span><span className="muted small">disclosed {day(t.f)}</span></span>
        </Link><a className="lrow-doc" href={t.u} target="_blank" rel="noreferrer" title="The member's disclosure report (PDF), from the House Clerk">Filing ↗</a></li>
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
export function MemberView({ member: sel, trades: shown, members, skipped, returnsAsOf, sectors = [], committees = [] }: { member: Member; trades: CTrade[]; members: PickerMember[]; skipped: number; returnsAsOf?: string | null; sectors?: SectorRow[]; committees?: Committee[] }) {
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
      <TrackRecord tr={sel.tr} who={`${sel.m}'s`} />
      <Committees list={committees} who={`${sel.m}'s`} />
      <Sectors rows={sectors} title={`What ${sel.m} trades, by sector`} note="Last two years." />
      <section className="card flush">
        <div className="card-title"><h2>{sel.m}&apos;s trades <span className="muted small">newest disclosures first{sel.n > shown.length ? ` · latest ${shown.length}` : ""}</span></h2><Link href="/congress" className="linkbtn">All members ›</Link></div>
        <KindsLine>{HOUSE_KINDS}</KindsLine>
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
  const [win, setWin] = useState("365"); // time window for the ranked lists
  const [rankBy, setRankBy] = useState<"usd" | "record">("usd"); // members by dollars traded (default) or track record
  useEffect(() => {
    // Old links (/congress?member=Name) go to the member's page.
    const m = new URLSearchParams(location.search).get("member");
    if (m) { router.replace(`/congress/${memberSlug(m)}`); return; }
    if (!initial) fetch("/data/congress-overview.json").then((r) => (r.ok ? r.json() : null)).then(setO).catch(() => setO(null));
  }, [router, initial]);

  if (o === undefined) return <section className="card"><p className="muted">Loading…</p></section>;
  if (!o) return <section className="card"><p className="muted">Congress trades aren&apos;t available right now.</p></section>;
  const s = o.stats;
  const w = o.windows?.[win];
  const bought = w?.bought ?? o.bought, sold = w?.sold ?? o.sold;
  const winLabel = w ? WINDOW_LABEL[win] : "last 90 days";
  const active = o.members.some((x) => x.w)
    ? [...o.members].filter((x) => (x.w?.[win]?.[1] ?? 0) > 0).sort((a, b) => (b.w![win][0] - a.w![win][0]) || (b.w![win][1] - a.w![win][1]))
    : o.members;
  return (
    <div className="ov">
      <CongressIntro o={o} />
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
        <KindsLine>{HOUSE_KINDS}</KindsLine>
        <TradeBrowser initial={o.latest} states={[...new Set(o.members.map((x) => x.sd.split("-")[0]))].sort()} />
      </section>

      <div className="stack span4" style={{ alignContent: "start" }}>
        {o.windows ? <WindowPick win={win} setWin={setWin} /> : null}
        {[["Most bought", bought, "up"], ["Most sold", sold, "down"]].map(([title, list, tone]) => (
          <section key={title as string} className="card flush">
            <div className="card-title"><h2>{title as string} <span className="muted small">{winLabel} · estimated $</span></h2></div>
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
        <div className="card-title"><h2>{rankBy === "usd" ? "Most active members" : "Members by track record"} <span className="muted small">{rankBy === "usd" ? `estimated $ traded, ${winLabel}${win !== "730" ? " · returns over 2 years" : ""}` : "purchases vs the S&P 500 since disclosure, 2 years"}</span></h2>
          <div className="winpick" role="group" aria-label="Rank members by"><button className={rankBy === "usd" ? "on" : ""} aria-pressed={rankBy === "usd"} onClick={() => setRankBy("usd")}>$ traded</button><button className={rankBy === "record" ? "on" : ""} aria-pressed={rankBy === "record"} onClick={() => setRankBy("record")}>Track record</button></div>
          {o.windows && rankBy === "usd" ? <WindowPick win={win} setWin={setWin} /> : null}</div>
        {rankBy === "record" ? <ByTrackRecord members={o.members} /> : <>
        {!active.length ? <p className="muted pad">No member reported a stock trade in this window.</p> : null}
        <ul className="lrows">{active.slice(0, 12).map((x) => (
          <li key={x.m}><Link href={`/congress/${memberSlug(x.m)}`}>
            <span className="lrow-main"><span className="wraps"><strong>{x.m}</strong> <Party p={x.p} sd={x.sd} />{x.current ? null : <span className="muted small"> · former</span>}</span><span className="muted small wraps">{(x.w ? x.w[win][1] : x.n).toLocaleString("en-US")} trades · latest {day(x.last)}{x.ret?.buys?.trade ? <> · buys {pctS(x.ret.buys.trade.stock)} vs S&amp;P {pctS(x.ret.buys.trade.spy)}</> : null}</span></span>
            <span className="lrow-v"><span className="mono">{x.w ? `~$${fmtBig(x.w[win][0])}` : x.usd != null ? `~$${fmtBig(x.usd)}` : `${x.n.toLocaleString("en-US")} trades`}</span><span className="muted small"><span className="up">{x.w ? x.w[win][2] : x.buys} buys</span> · <span className="down">{x.w ? x.w[win][3] : x.sells} sales</span></span></span>
          </Link></li>
        ))}</ul></>}
      </section>
      <BoughtTogether rows={o.overlap ?? []} />
      <Sectors rows={o.sectors ?? []} title="What House members trade, by sector" note="Last year, all members." />
      <Note skipped={s.scannedSkipped} />
    </div>
  );
}

const WINDOW_LABEL: Record<string, string> = { "30": "last 30 days", "90": "last 90 days", "365": "last year", "730": "last 2 years" };
/** Time window for the ranked lists (by trade date). */
function WindowPick({ win, setWin }: { win: string; setWin: (w: string) => void }) {
  return (
    <div className="winpick" role="group" aria-label="Time window">
      {[["30", "30d"], ["90", "90d"], ["365", "1y"], ["730", "2y"]].map(([k, l]) => (
        <button key={k} className={win === k ? "on" : ""} aria-pressed={win === k} onClick={() => setWin(k)}>{l}</button>
      ))}
    </div>
  );
}

/** The section's opening: what it is, the source, and what the returns show for the biggest traders. */
function CongressIntro({ o }: { o: Overview }) {
  const top = [...o.members].sort((a, b) => (b.usd ?? 0) - (a.usd ?? 0)).slice(0, 10).filter((m) => m.ret?.buys?.trade);
  const lagged = top.filter((m) => m.ret!.buys.trade!.stock < m.ret!.buys.trade!.spy).length;
  const updated = o.updated;
  return (
    <SectionIntro title="Congress trades (House)"
      lead="Stock trades that members of the House report under the STOCK Act, how late they reported them, and how the stocks did afterwards against the S&P 500. Sort and filter by size, party, date or state."
      source={<>U.S. House Clerk disclosures, checked each weekday evening{updated ? `; updated ${new Date(updated).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}. Every trade links to the member&apos;s filing. The Senate isn&apos;t included yet.</>}
      research={top.length ? <>Our papers cover company insiders, not Congress. What the returns show: for {lagged} of the {top.length} members who traded the most, the S&amp;P 500 beat their median buy since the trade.</> : "Our papers cover company insiders, not Congress; each member's page shows how their own trades did."}
      researchHref="/research" />
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
      <KindsLine>{HOUSE_KINDS}</KindsLine>
      <CongressTradesLinked trades={rows.slice(0, 12)} />
    </section>
  );
}
// On stock pages member names link to the member's page.
function CongressTradesLinked({ trades }: { trades: CTrade[] }) {
  return (
    <ul className="lrows">{trades.map((t, i) => (
      <li key={t.u + t.d + i} className="lrow-split"><Link href={`/congress/${memberSlug(t.m)}`}>
        <span className={`side ${t.y === "P" ? "up" : "down"}`}>{t.y === "P" ? "BUY" : "SELL"}</span>
        <span className="lrow-main"><span className="wraps"><strong>{t.m}</strong> <Party p={t.p} sd={t.sd} /></span><span className="muted small">traded {traded(t)} · disclosed {day(t.f)}{whose(t) ? ` · ${whose(t)}` : ""}</span></span>
        <span className="lrow-v mono">{range(t.lo, t.hi)}</span>
      </Link><a className="lrow-doc" href={t.u} target="_blank" rel="noreferrer" title="The member's disclosure report (PDF), from the House Clerk">Filing ↗</a></li>
    ))}</ul>
  );
}
