"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { TradeList, Signal, personName, roleLabel } from "@/components/TradeList";
import { loadInsiders } from "@/lib/insiderData";
import { FundsView } from "@/components/FundsView";
import { VBars } from "@/components/Bars";
import { fmtBig } from "@/lib/format";
import { isExecOrDirector } from "@/lib/insider";
import type { InsiderTrade } from "@/lib/sec";
import { buildOverview } from "@/lib/overview.mjs";

type Overview = {
  updated: string | null;
  totals: { value: number; buys: number; people: number; cos: number; strong: number; sales: number; salesValue: number; notableSales: number };
  hero: { t: InsiderTrade; recent: boolean } | null;
  strongest: InsiderTrade[];
  clusters: { symbol: string; issuer: string; value: number; last: string; people: number }[];
  clusterCount: number;
  byDay: { key: string; value: number; people: number; cos: number }[];
  latest: InsiderTrade[];
  notableSales: InsiderTrade[];
};
const buildOv = buildOverview as unknown as (d: { trades: InsiderTrade[]; days: string[]; updated: string | null }) => Overview;
import { companyName } from "@/lib/people.mjs";

type Kind = "buys" | "sells" | "all";
type View = "overview" | "groups" | "trades" | "funds";
const VIEWS: [View, string][] = [["overview", "Overview"], ["groups", "Group buys"], ["trades", "All trades"], ["funds", "Big funds"]];
const SIZES = [[0, "Any size"], [100_000, "$100K+"], [1_000_000, "$1M+"]] as const;
const titleCase = (s: string, sym?: string | null) => companyName(s, sym);
const shortDay = (d: string) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

type Cluster = { symbol: string; issuer: string; value: number; last: string; people: { name: string; role: string }[] };

function ClusterCards({ clusters, preview, more }: { clusters: Cluster[]; preview?: number; more?: () => void }) {
  const [all, setAll] = useState(false);
  if (!clusters.length) return null;
  const top = clusters.slice(0, preview ?? 6), rest = preview ? [] : clusters.slice(6);
  return (
    <section className="card">
      <h2>Several insiders buying <span className="muted small">2+ executives or directors, last 30 days</span></h2>
      <div className="cluster-grid">
        {top.map((c) => (
          <Link key={c.symbol} href={`/stock/${c.symbol}`} className="cluster">
            <div className="cluster-head"><strong>{c.symbol}</strong><span className="up mono">${fmtBig(c.value)}</span></div>
            <div className="muted small ellipsis-2">{titleCase(c.issuer, c.symbol)}</div>
            <div className="small"><span className="up">{c.people.length} insiders bought</span> · latest {shortDay(c.last)}</div>
            <div className="muted small ellipsis-2">{c.people.slice(0, 3).map((p) => `${p.name} (${p.role})`).join(", ")}{c.people.length > 3 ? `, +${c.people.length - 3} more` : ""}</div>
          </Link>
        ))}
      </div>
      {rest.length ? (
        all ? (
          <ul className="compact-list">{rest.map((c) => (
            <li key={c.symbol}><Link href={`/stock/${c.symbol}`}><strong>{c.symbol}</strong></Link> <span className="muted">{titleCase(c.issuer, c.symbol)}</span> · <span className="up">{c.people.length} insiders, ${fmtBig(c.value)}</span></li>
          ))}</ul>
        ) : <button className="btn wide" onClick={() => setAll(true)}>Show all {clusters.length}</button>
      ) : null}
      {preview && more && clusters.length > preview ? <button className="btn wide" onClick={more}>See all {clusters.length} group buys ›</button> : null}
    </section>
  );
}

function InsiderTrades({ view, go }: { view: Exclude<View, "funds">; go: (v: View) => void }) {
  const [trades, setTrades] = useState<InsiderTrade[] | null>(null);
  const [err, setErr] = useState("");
  const [updated, setUpdated] = useState("");
  const [source, setSource] = useState<"history" | "live">("history");
  const [kind, setKind] = useState<Kind>("buys");
  const [execOnly, setExecOnly] = useState(true);
  const [min, setMin] = useState(0);
  const [q, setQ] = useState("");
  const [hidePlanned, setHidePlanned] = useState(false);
  const [days, setDays] = useState<string[]>([]);
  const [day, setDay] = useState<string | null>(null);
  const [strongOnly, setStrongOnly] = useState(false);

  // Filters live in the address bar, so a view can be shared or bookmarked. The first
  // run only reads them (writing first would wipe other parameters, like ?view=funds).
  const loaded = useRef(false);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (["buys", "sells", "all"].includes(p.get("show") ?? "")) setKind(p.get("show") as Kind);
    if (p.get("everyone") === "1") setExecOnly(false);
    if (p.get("min")) setMin(+p.get("min")!);
    if (p.get("q")) setQ(p.get("q")!);
    if (p.get("signal") === "1") setStrongOnly(true);
  }, []);
  useEffect(() => {
    if (!loaded.current) { loaded.current = true; return; }
    const p = new URLSearchParams();
    if (view !== "overview") p.set("view", view);
    if (kind !== "buys") p.set("show", kind);
    if (!execOnly) p.set("everyone", "1");
    if (min) p.set("min", String(min));
    if (q.trim()) p.set("q", q.trim());
    if (strongOnly) p.set("signal", "1");
    history.replaceState(null, "", p.toString() ? `?${p}` : location.pathname);
  }, [view, kind, execOnly, min, q, strongOnly]);

  // The overview comes from the small overview.json; the full 30-day file loads only for
  // the trade lists (or if overview.json is unavailable).
  const [ov, setOv] = useState<Overview | null | undefined>(undefined);
  useEffect(() => {
    fetch("/data/overview.json").then((r) => (r.ok ? r.json() : null)).then((d) => setOv(d?.totals ? d : null)).catch(() => setOv(null));
  }, []);
  const needFull = view !== "overview" || ov === null;
  const loadedFrom = useRef<string | null>(null);
  useEffect(() => {
    if (!needFull || loadedFrom.current === source) return;
    loadedFrom.current = source;
    setTrades(null); setErr("");
    if (source === "history") {
      loadInsiders().then((d) => {
        setTrades(d.trades); setDays(d.days);
        setUpdated(`Last 30 days · updated hourly on weekdays, last ${d.updated ? new Date(d.updated).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }) : "—"}`);
      }).catch((e) => setErr(String(e)));
      return;
    }
    fetch("/api/insiders").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) { setTrades(d.map((t: InsiderTrade) => ({ ...t, filed: t.filed || t.date }))); setUpdated("Newest filings on SEC EDGAR right now"); }
      else setErr(d.error);
    }).catch((e) => setErr(String(e)));
  }, [source, needFull]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (trades ?? []).filter((t) =>
      (kind === "buys" ? t.code === "P" : kind === "sells" ? t.code === "S" : true) &&
      (!execOnly || isExecOrDirector(t)) &&
      (t.value ?? 0) >= min &&
      !(hidePlanned && t.planned) &&
      (!day || (t.filed || t.date) === day) &&
      (!strongOnly || (t.conv && t.conv.tier !== "routine")) &&
      (!s || t.symbol.toLowerCase().startsWith(s) || t.issuer.toLowerCase().includes(s) || t.owner.toLowerCase().includes(s)));
  }, [trades, kind, execOnly, min, q, hidePlanned, day, strongOnly]);

  const o = useMemo<Overview | null>(() => ov ?? (ov === null && trades && source === "history" ? buildOv({ trades, days, updated: null }) : null), [ov, trades, days, source]);
  const byDay = useMemo(() => (o?.byDay ?? []).map((d) => ({
    key: d.key, label: shortDay(d.key), value: d.value,
    detail: d.value ? `$${fmtBig(d.value)} bought by ${d.people} ${d.people === 1 ? "insider" : "insiders"} at ${d.cos} ${d.cos === 1 ? "company" : "companies"}` : "no insider buys",
  })), [o]);

  const clusters = useMemo<Cluster[]>(() => {
    const by = new Map<string, Cluster & { names: Set<string> }>();
    for (const t of trades ?? []) {
      if (t.code !== "P" || !isExecOrDirector(t)) continue;
      const c = by.get(t.symbol) ?? { symbol: t.symbol, issuer: t.issuer, value: 0, last: "", people: [], names: new Set<string>() };
      c.value += t.value ?? 0;
      if ((t.filed || t.date) > c.last) c.last = t.filed || t.date;
      if (!c.names.has(t.owner)) { c.names.add(t.owner); c.people.push({ name: personName(t.owner), role: roleLabel(t.role) }); }
      by.set(t.symbol, c);
    }
    // Under ~$25K per insider is usually an employee share-purchase plan, not conviction buying.
    return [...by.values()].filter((c) => c.people.length > 1 && c.value / c.people.length >= 25_000).sort((a, b) => b.people.length - a.people.length || b.value - a.value);
  }, [trades]);

  if (view === "groups") return (
    <>
      <p className="muted small section-note">Stocks that two or more executives or directors bought in the last 30 days: the strongest insider signal.</p>
      {trades === null ? <p className="muted">Loading…</p> : clusters.length ? <ClusterCards clusters={clusters} /> : <section className="card"><p className="muted">No stock had several insiders buying in the last 30 days.</p></section>}
    </>
  );
  if (view === "trades") return (
    <>
      <section className="card" id="trades">
        <h2>All trades</h2>
        {day ? <p className="daychip"><span className="chip on">Showing {shortDay(day)} <button className="icon" onClick={() => setDay(null)} aria-label="Show all days">×</button></span></p> : null}
        <div className="filterbar">
          <div className="seg">{(["buys", "sells", "all"] as Kind[]).map((k) => <button key={k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{k === "buys" ? "Buys" : k === "sells" ? "Sells" : "All"}</button>)}</div>
          <button className={`toggle${execOnly ? " on" : ""}`} onClick={() => setExecOnly(!execOnly)} aria-pressed={execOnly}>Executives &amp; directors only</button>
          <button className={`toggle${strongOnly ? " on" : ""}`} onClick={() => { setStrongOnly(!strongOnly); if (!strongOnly) setKind("buys"); }} aria-pressed={strongOnly}>Strong &amp; notable buys only</button>
          <div className="seg">{SIZES.map(([v, l]) => <button key={v} className={min === v ? "on" : ""} onClick={() => setMin(v)}>{l}</button>)}</div>
          <input className="filter-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by ticker, company or name" aria-label="Filter trades" />
        </div>
        <details className="small muted more">
          <summary>More options</summary>
          <div className="filterbar">
            <div className="seg"><button className={source === "history" ? "on" : ""} onClick={() => setSource("history")}>Last 30 days</button><button className={source === "live" ? "on" : ""} onClick={() => setSource("live")}>Newest filings (live)</button></div>
            <label><input type="checkbox" checked={hidePlanned} onChange={(e) => setHidePlanned(e.target.checked)} /> Hide planned trades</label>
          </div>
          {kind !== "buys" ? <p>The 30-day list keeps every buy but only sales over $250K; choose &quot;Newest filings&quot; to see everything filed today.</p> : null}
        </details>
        <p className="muted small">{err ? <span className="down">Couldn&apos;t reach SEC: {err}</span> : trades === null ? (source === "live" ? "Reading the newest filings from SEC (about 10 seconds)…" : "Loading…") : `${shown.length.toLocaleString()} ${shown.length === 1 ? "trade" : "trades"} · ${updated}`}</p>
        {trades ? <TradeList trades={shown} empty="No trades match these filters. Try “Any size” or turning off “Executives & directors only”." /> : null}
      </section>
    </>
  );
  const allStrong = () => { setStrongOnly(true); setKind("buys"); go("trades"); scrollTo({ top: 0 }); };
  return (
    <>
      <h1 className="sr-only">What insiders are buying</h1>
      {!o ? <section className="card"><p className="muted">{err ? <span className="down">Couldn&apos;t load the data: {err}</span> : "Loading…"}</p></section> : null}
      {o ? (
        <div className="ov">
          {o.hero ? (
            <Link href={`/stock/${o.hero.t.symbol}`} className="hero m-only">
              <span className="hero-tag">{o.hero.recent ? "Strongest buy this week" : "Strongest buy, last 30 days"}</span>
              <span className="hero-big mono">${fmtBig(o.hero.t.value ?? 0)}</span>
              <span className="hero-sym"><strong>{o.hero.t.symbol}</strong> · {titleCase(o.hero.t.issuer, o.hero.t.symbol)}</span>
              <span className="muted">{personName(o.hero.t.owner)}, {roleLabel(o.hero.t.role)} · {shortDay(o.hero.t.date)}{o.hero.t.price ? ` · $${o.hero.t.price.toFixed(2)}/share` : ""}</span>
              {o.hero.t.conv ? <span className="hero-chips"><span>Signal {o.hero.t.conv.score}</span>{o.hero.t.conv.reasons.filter((r) => !r.neg).slice(0, 3).map((r) => <span key={r.text}>{r.text}</span>)}</span> : null}
            </Link>
          ) : null}

          <section className="kpis">
            <div className="kpi"><small>Bought · 30d</small><span className="mono up">${fmtBig(o.totals.value)}</span><em>{o.totals.buys.toLocaleString()} buys</em></div>
            <div className="kpi"><small>Insiders buying</small><span className="mono">{o.totals.people}</span><em>officers &amp; directors</em></div>
            <div className="kpi"><small>Strong signals</small><span className="mono up">{o.totals.strong}</span><em>score 60+</em></div>
            <div className="kpi"><small>Large sales · 30d</small><span className="mono down">${fmtBig(o.totals.salesValue)}</span><em>{o.totals.sales.toLocaleString()} sales of $250K+</em></div>
            <div className="kpi d-only"><small>Companies</small><span className="mono">{o.totals.cos}</span><em>with insider buys</em></div>
          </section>

          <section className="card flush span8">
            <div className="card-title"><h2>Strongest buys <span className="muted small">last 30 days</span></h2><button className="linkbtn" onClick={allStrong}>All strong buys ›</button></div>
            <table className="ttable d-only">
              <thead><tr><th>Stock</th><th>Insider</th><th>Signal</th><th>Why</th><th className="r">Value</th></tr></thead>
              <tbody>{o.strongest.slice(0, 8).map((t) => (
                <tr key={t.accession}>
                  <td><Link href={`/stock/${t.symbol}`}><strong>{t.symbol}</strong> <span className="muted">{titleCase(t.issuer, t.symbol)}</span></Link></td>
                  <td>{t.ownerCik ? <Link href={`/insider/${t.ownerCik}`} className="person">{personName(t.owner)}</Link> : personName(t.owner)} <span className="muted">· {roleLabel(t.role).split(/ & |, /)[0]}</span></td>
                  <td className="nowrap">{t.conv ? <><Meter score={t.conv.score} /> <span className="mono muted">{t.conv.score}</span></> : null}</td>
                  <td>{t.conv?.reasons.filter((r) => !r.neg && !/^(CEO|CFO|President|Chair|COO)$/.test(r.text)).slice(0, 1).map((r) => <span key={r.text} className="why">{r.text}</span>)}</td>
                  <td className="r"><span className="mono up"><strong>${fmtBig(t.value ?? 0)}</strong></span><div className="muted small mono">{shortDay(t.date)}</div></td>
                </tr>
              ))}</tbody>
            </table>
            <ul className="lrows m-only">{o.strongest.filter((t) => t.accession !== o.hero?.t.accession).slice(0, 5).map((t) => (
              <li key={t.accession}><Link href={`/stock/${t.symbol}`}>
                <Ring score={t.conv?.score ?? 0} />
                <span className="lrow-main"><span><strong>{t.symbol}</strong> <span className="muted">{titleCase(t.issuer, t.symbol)}</span></span><span className="muted small">{personName(t.owner)} · {t.conv?.reasons.find((r) => !r.neg && !/^(CEO|CFO|President|Chair|COO)$/.test(r.text))?.text ?? roleLabel(t.role)}</span></span>
                <span className="lrow-v"><span className="mono up">${fmtBig(t.value ?? 0)}</span><span className="muted small">{shortDay(t.date)}</span></span>
              </Link></li>
            ))}</ul>
          </section>

          <section className="card flush span4">
            <div className="card-title"><h2>Buying together <span className="muted small">2+ insiders</span></h2>{o.clusterCount > 6 ? <button className="linkbtn" onClick={() => { go("groups"); scrollTo({ top: 0 }); }}>All {o.clusterCount} ›</button> : null}</div>
            {o.clusters.length ? <ul className="lrows">{o.clusters.map((c) => (
              <li key={c.symbol}><Link href={`/stock/${c.symbol}`}>
                <strong className="lrow-sym">{c.symbol}</strong>
                <span className="dots" aria-label={`${c.people} insiders`}>{Array.from({ length: Math.min(c.people, 10) }, (_, i) => <i key={i} />)}</span>
                <span className="lrow-v"><span className="mono">${fmtBig(c.value)}</span><span className="muted small">{c.people} insiders</span></span>
              </Link></li>
            ))}</ul> : <p className="muted pad">No stock had several insiders buying in the last 30 days.</p>}
          </section>

          <section className="card span7 daycard">
            <h2>Insider buying by day</h2>
            <VBars cols={byDay} height={170} selected={day} onPick={(k) => { setDay(k); if (k) { setKind("buys"); go("trades"); scrollTo({ top: 0 }); } }} />
          </section>

          <section className="card flush span5">
            <div className="card-title"><h2>Latest filings</h2><button className="linkbtn" onClick={() => { setKind("all"); go("trades"); scrollTo({ top: 0 }); }}>All trades ›</button></div>
            <ul className="lrows">{o.latest.map((t, i) => (
              <li key={t.accession + t.code + i}><Link href={`/stock/${t.symbol}`}>
                <span className={`side ${t.code === "P" ? "up" : "down"}`}>{t.code === "P" ? "BUY" : "SELL"}</span>
                <span className="lrow-main"><strong>{t.symbol}</strong><span className="muted small">{personName(t.owner)} · {shortDay(t.filed || t.date)}</span></span>
                <span className={`lrow-v mono ${t.code === "P" ? "up" : "down"}`}>${fmtBig(t.value ?? 0)}</span>
              </Link></li>
            ))}</ul>
          </section>

          {o.notableSales.length ? (
            <section className="card flush">
              <div className="card-title"><h2>Notable sales <span className="muted small">not pre-planned · a top executive or half the stake · last 30 days</span></h2><button className="linkbtn" onClick={() => { setKind("sells"); go("trades"); scrollTo({ top: 0 }); }}>All sales ›</button></div>
              <table className="ttable d-only">
                <thead><tr><th>Stock</th><th>Insider</th><th>What stands out</th><th className="r">Value</th></tr></thead>
                <tbody>{o.notableSales.map((t) => (
                  <tr key={t.accession + t.code}>
                    <td><Link href={`/stock/${t.symbol}`}><strong>{t.symbol}</strong> <span className="muted">{titleCase(t.issuer, t.symbol)}</span></Link></td>
                    <td>{t.ownerCik ? <Link href={`/insider/${t.ownerCik}`} className="person">{personName(t.owner)}</Link> : personName(t.owner)} <span className="muted">· {roleLabel(t.role).split(/ & |, /)[0]}</span></td>
                    <td>{t.sale?.flags.filter((f) => !/^(CEO|CFO|President|Chair)$/.test(f.text)).map((f) => <span key={f.text} className="why">{f.text}</span>)}</td>
                    <td className="r"><span className="mono down"><strong>${fmtBig(t.value ?? 0)}</strong></span><div className="muted small mono">{shortDay(t.filed || t.date)}</div></td>
                  </tr>
                ))}</tbody>
              </table>
              <ul className="lrows m-only">{o.notableSales.slice(0, 5).map((t) => (
                <li key={t.accession + t.code}><Link href={`/stock/${t.symbol}`}>
                  <span className="side down">SELL</span>
                  <span className="lrow-main"><span><strong>{t.symbol}</strong> <span className="muted">{titleCase(t.issuer, t.symbol)}</span></span><span className="muted small">{personName(t.owner)} · {t.sale?.flags.find((f) => /Sold/.test(f.text))?.text ?? roleLabel(t.role)}</span></span>
                  <span className="lrow-v"><span className="mono down">${fmtBig(t.value ?? 0)}</span><span className="muted small">{shortDay(t.filed || t.date)}</span></span>
                </Link></li>
              ))}</ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/** Signal strength as ten small bars (desktop tables). */
function Meter({ score }: { score: number }) {
  return <span className="meter" aria-label={`Signal ${score} of 100`}>{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < Math.round(score / 10) ? "on" : ""} />)}</span>;
}
/** Signal strength as a ring with the score inside (phone lists). */
function Ring({ score }: { score: number }) {
  return <span className="ring" style={{ background: `conic-gradient(var(--accent) ${score}%, var(--meter-off) 0)` }} aria-label={`Signal ${score} of 100`}><b className="mono">{score}</b></span>;
}

export default function InsidersView() {
  const [view, setView] = useState<View>("overview");
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const v = p.get("view") as View | null;
    if (v && VIEWS.some(([k]) => k === v)) setView(v);
    else if (p.get("show") || p.get("q") || p.get("min") || p.get("everyone")) setView("trades");
  }, []);
  const go = (v: View) => { setView(v); history.replaceState(null, "", v === "overview" ? location.pathname : `?view=${v}`); };
  return (
    <div className="stack">
      <div className="tabs scroll-tabs" role="tablist">
        {VIEWS.map(([k, l]) => <button key={k} role="tab" aria-selected={view === k} className={view === k ? "on" : ""} onClick={() => go(k)}>{l}</button>)}
      </div>
      {view === "funds" ? <FundsView /> : <InsiderTrades view={view} go={go} />}
    </div>
  );
}
