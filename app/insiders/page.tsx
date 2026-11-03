"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { TradeList, personName, roleLabel } from "@/components/TradeList";
import { FundsView } from "@/components/FundsView";
import { HBars, VBars } from "@/components/Bars";
import { fmtBig } from "@/lib/format";
import { isExecOrDirector } from "@/lib/insider";
import type { InsiderTrade } from "@/lib/sec";

type Kind = "buys" | "sells" | "all";
type View = "overview" | "groups" | "trades" | "funds";
const VIEWS: [View, string][] = [["overview", "Overview"], ["groups", "Group buys"], ["trades", "All trades"], ["funds", "Big funds"]];
const SIZES = [[0, "Any size"], [100_000, "$100K+"], [1_000_000, "$1M+"]] as const;
const titleCase = (s: string) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
const shortDay = (d: string) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

type Cluster = { symbol: string; issuer: string; value: number; last: string; people: { name: string; role: string }[] };

function HowToRead() {
  return (
    <details className="howto">
      <summary>How to read this</summary>
      <ul>
        <li><strong>Insiders</strong> are a company&apos;s executives and board directors (plus anyone owning 10%+). They must report every trade in their own company&apos;s stock to the SEC within 2 business days.</li>
        <li><strong>Buys matter more than sells.</strong> Insiders sell for many reasons (taxes, a house, diversifying), but they usually buy for one: they expect the stock to rise.</li>
        <li><strong>Several insiders buying the same stock</strong> at around the same time is the strongest signal.</li>
        <li><strong>&quot;Planned&quot;</strong> trades were scheduled months in advance under a trading plan, so they say less about the insider&apos;s current view.</li>
        <li>Grants, option exercises and tax withholding are routine pay, so they&apos;re hidden unless you choose &quot;All&quot;.</li>
      </ul>
    </details>
  );
}

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
            <div className="muted small ellipsis-2">{titleCase(c.issuer)}</div>
            <div className="small"><span className="up">{c.people.length} insiders bought</span> · latest {shortDay(c.last)}</div>
            <div className="muted small ellipsis-2">{c.people.slice(0, 3).map((p) => `${p.name} (${p.role})`).join(", ")}{c.people.length > 3 ? `, +${c.people.length - 3} more` : ""}</div>
          </Link>
        ))}
      </div>
      {rest.length ? (
        all ? (
          <ul className="compact-list">{rest.map((c) => (
            <li key={c.symbol}><Link href={`/stock/${c.symbol}`}><strong>{c.symbol}</strong></Link> <span className="muted">{titleCase(c.issuer)}</span> · <span className="up">{c.people.length} insiders, ${fmtBig(c.value)}</span></li>
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

  // Filters live in the address bar, so a view can be shared or bookmarked. The first
  // run only reads them (writing first would wipe other parameters, like ?view=funds).
  const loaded = useRef(false);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (["buys", "sells", "all"].includes(p.get("show") ?? "")) setKind(p.get("show") as Kind);
    if (p.get("everyone") === "1") setExecOnly(false);
    if (p.get("min")) setMin(+p.get("min")!);
    if (p.get("q")) setQ(p.get("q")!);
  }, []);
  useEffect(() => {
    if (!loaded.current) { loaded.current = true; return; }
    const p = new URLSearchParams();
    if (view !== "overview") p.set("view", view);
    if (kind !== "buys") p.set("show", kind);
    if (!execOnly) p.set("everyone", "1");
    if (min) p.set("min", String(min));
    if (q.trim()) p.set("q", q.trim());
    history.replaceState(null, "", p.toString() ? `?${p}` : location.pathname);
  }, [view, kind, execOnly, min, q]);

  useEffect(() => {
    setTrades(null); setErr("");
    const url = source === "history" ? "/data/insiders.json" : "/api/insiders";
    fetch(url).then((r) => r.json()).then((d) => {
      if (source === "history") { setTrades(d.trades); setDays(Array.isArray(d.days) ? d.days : []); setUpdated(`Last 30 days · updated ${new Date(d.updated).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`); }
      else if (Array.isArray(d)) { setTrades(d.map((t: InsiderTrade) => ({ ...t, filed: t.filed || t.date }))); setUpdated("Newest filings on SEC EDGAR right now"); }
      else setErr(d.error);
    }).catch((e) => setErr(String(e)));
  }, [source]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (trades ?? []).filter((t) =>
      (kind === "buys" ? t.code === "P" : kind === "sells" ? t.code === "S" : true) &&
      (!execOnly || isExecOrDirector(t)) &&
      (t.value ?? 0) >= min &&
      !(hidePlanned && t.planned) &&
      (!day || (t.filed || t.date) === day) &&
      (!s || t.symbol.toLowerCase().startsWith(s) || t.issuer.toLowerCase().includes(s) || t.owner.toLowerCase().includes(s)));
  }, [trades, kind, execOnly, min, q, hidePlanned, day]);

  // Executive and director buys only: the trades that carry a signal.
  const buys = useMemo(() => (trades ?? []).filter((t) => t.code === "P" && isExecOrDirector(t) && t.value), [trades]);
  const byDay = useMemo(() => {
    const m = new Map<string, { value: number; people: Set<string>; cos: Set<string> }>();
    for (const d of days) m.set(d, { value: 0, people: new Set(), cos: new Set() });
    for (const t of buys) {
      const k = t.filed || t.date, x = m.get(k) ?? { value: 0, people: new Set<string>(), cos: new Set<string>() };
      x.value += t.value ?? 0; x.people.add(t.owner); x.cos.add(t.symbol); m.set(k, x);
    }
    return [...m].sort((a, b) => a[0].localeCompare(b[0])).map(([k, x]) => ({
      key: k, label: shortDay(k), value: x.value,
      detail: x.value ? `$${fmtBig(x.value)} bought by ${x.people.size} ${x.people.size === 1 ? "insider" : "insiders"} at ${x.cos.size} ${x.cos.size === 1 ? "company" : "companies"}` : "no insider buys",
    }));
  }, [buys, days]);
  const totals = useMemo(() => ({ value: buys.reduce((a, t) => a + (t.value ?? 0), 0), people: new Set(buys.map((t) => t.owner)).size, cos: new Set(buys.map((t) => t.symbol)).size }), [buys]);
  const topStocks = useMemo(() => {
    const m = new Map<string, { symbol: string; issuer: string; value: number; people: Set<string> }>();
    for (const t of buys) { const x = m.get(t.symbol) ?? { symbol: t.symbol, issuer: t.issuer, value: 0, people: new Set<string>() }; x.value += t.value ?? 0; x.people.add(personName(t.owner)); m.set(t.symbol, x); }
    return [...m.values()].sort((a, b) => b.value - a.value).slice(0, 10);
  }, [buys]);

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
          <button className={`toggle${execOnly ? " on" : ""}`} onClick={() => setExecOnly(!execOnly)} aria-pressed={execOnly}>{execOnly ? "✓ " : ""}Executives &amp; directors only</button>
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
  return (
    <>
      <section className="card">
        <h1>What insiders are buying</h1>
        <p className="muted">Executives and directors must report trades in their own company&apos;s stock within 2 business days. Here&apos;s what they bought in the last 30 days.</p>
        <HowToRead />
      </section>
      {trades === null ? <section className="card"><p className="muted">Loading…</p></section> : null}
      {source === "history" && buys.length ? (
        <div className="twocol">
          <section className="card chart-card">
            <h2>Insider buying by day</h2>
            <div className="bigstats">
              <div><span className="mono up">${fmtBig(totals.value)}</span><span className="muted small">bought in 30 days</span></div>
              <div><span className="mono">{totals.people}</span><span className="muted small">insiders</span></div>
              <div><span className="mono">{totals.cos}</span><span className="muted small">companies</span></div>
            </div>
            <VBars cols={byDay} selected={day} onPick={(k) => { setDay(k); if (k) { setKind("buys"); go("trades"); scrollTo({ top: 0 }); } }} />
          </section>
          <section className="card">
            <h2>Biggest buys by company <span className="muted small">last 30 days</span></h2>
            <HBars rows={topStocks.map((x) => ({ key: x.symbol, href: `/stock/${x.symbol}`, value: x.value, text: `$${fmtBig(x.value)}`,
              label: <><strong>{x.symbol}</strong> <span className="muted">{titleCase(x.issuer)}</span></>,
              sub: x.people.size > 1 ? `${x.people.size} insiders` : [...x.people][0] }))} />
          </section>
        </div>
      ) : null}

      <ClusterCards clusters={clusters} preview={3} more={() => { go("groups"); scrollTo({ top: 0 }); }} />
    </>
  );
}

export default function Insiders() {
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
