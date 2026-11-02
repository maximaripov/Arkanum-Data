"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { TradeList, personName, roleLabel } from "@/components/TradeList";
import { FundsView } from "@/components/FundsView";
import { fmtBig } from "@/lib/format";
import { isExecOrDirector } from "@/lib/insider";
import type { InsiderTrade } from "@/lib/sec";

type Kind = "buys" | "sells" | "all";
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

function ClusterCards({ clusters }: { clusters: Cluster[] }) {
  const [all, setAll] = useState(false);
  if (!clusters.length) return null;
  const top = clusters.slice(0, 6), rest = clusters.slice(6);
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
    </section>
  );
}

function InsiderTrades() {
  const [trades, setTrades] = useState<InsiderTrade[] | null>(null);
  const [err, setErr] = useState("");
  const [updated, setUpdated] = useState("");
  const [source, setSource] = useState<"history" | "live">("history");
  const [kind, setKind] = useState<Kind>("buys");
  const [execOnly, setExecOnly] = useState(true);
  const [min, setMin] = useState(0);
  const [q, setQ] = useState("");
  const [hidePlanned, setHidePlanned] = useState(false);

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
    if (kind !== "buys") p.set("show", kind);
    if (!execOnly) p.set("everyone", "1");
    if (min) p.set("min", String(min));
    if (q.trim()) p.set("q", q.trim());
    history.replaceState(null, "", p.toString() ? `?${p}` : location.pathname);
  }, [kind, execOnly, min, q]);

  useEffect(() => {
    setTrades(null); setErr("");
    const url = source === "history" ? "/data/insiders.json" : "/api/insiders";
    fetch(url).then((r) => r.json()).then((d) => {
      if (source === "history") { setTrades(d.trades); setUpdated(`Last 30 days · updated ${new Date(d.updated).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`); }
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
      (!s || t.symbol.toLowerCase().startsWith(s) || t.issuer.toLowerCase().includes(s) || t.owner.toLowerCase().includes(s)));
  }, [trades, kind, execOnly, min, q, hidePlanned]);

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

  return (
    <>
      <section className="card">
        <h1>What insiders are buying</h1>
        <p className="muted">Every trade company executives and directors made in their own company&apos;s stock, from official SEC filings.</p>
        <HowToRead />
      </section>

      {source === "history" ? <ClusterCards clusters={clusters} /> : null}

      <section className="card">
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
}

export default function Insiders() {
  const [view, setView] = useState<"trades" | "funds">("trades");
  useEffect(() => { if (new URLSearchParams(location.search).get("view") === "funds") setView("funds"); }, []);
  const go = (v: "trades" | "funds") => { setView(v); history.replaceState(null, "", v === "funds" ? "?view=funds" : location.pathname); };
  return (
    <div className="stack">
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={view === "trades"} className={view === "trades" ? "on" : ""} onClick={() => go("trades")}>Insider trades</button>
        <button role="tab" aria-selected={view === "funds"} className={view === "funds" ? "on" : ""} onClick={() => go("funds")}>Big funds</button>
      </div>
      {view === "trades" ? <InsiderTrades /> : <FundsView />}
    </div>
  );
}
