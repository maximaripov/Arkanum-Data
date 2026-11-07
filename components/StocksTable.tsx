"use client";
// Every US stock with SEC fundamentals (~4,600, from public/data/screener.json, built nightly):
// search, sector and sort. Figures come from filings, so there's no price: tapping a stock
// opens TradingView's quote box for it (price, P/E, market cap, dividend yield).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Picker } from "./Picker";
import { TradingView } from "./TradingView";
import { fmtBig } from "@/lib/format";
import { tvSymbol } from "@/lib/tv";
import { companyName } from "@/lib/people.mjs";
import { RANK_MIN_REVENUE } from "@/lib/fundamentals.mjs";

type Row = { t: string; n: string; x: string | null; rev: number | null; ni: number | null; margin: number | null; growth: number | null; roe: number | null; de: number | null; fcfMargin: number | null; payout: number | null; sector: string | null; basis: string | null };
type Key = "rev" | "growth" | "margin" | "roe" | "fcfMargin" | "de" | "payout" | "name";

const SORTS: { value: Key; label: string }[] = [
  { value: "rev", label: "Biggest revenue" },
  { value: "growth", label: "Fastest growing" },
  { value: "margin", label: "Most profitable" },
  { value: "roe", label: "Return on equity" },
  { value: "fcfMargin", label: "Most cash generated" },
  { value: "de", label: "Least debt" },
  { value: "payout", label: "Highest payout" },
  { value: "name", label: "A to Z" },
];
const PAGE = 50;
const pct = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`);
const money = (v: number | null) => (v == null ? "—" : `${v < 0 ? "−" : ""}$${fmtBig(Math.abs(v))}`);
const ratio = (v: number | null) => (v == null ? "—" : v.toFixed(2));
const tone = (v: number | null) => (v == null ? "" : v > 0 ? "up" : v < 0 ? "down" : "");

export function StocksTable() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("");
  const [sort, setSort] = useState<Key>("rev");
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/screener.json").then((r) => r.json()).then((d: { fields: string[]; rows: unknown[][] }) => {
      setRows(d.rows.map((r) => Object.fromEntries(d.fields.map((f, i) => [f, r[i]])) as Row));
    }).catch(() => setRows([]));
  }, []);
  useEffect(() => { setShown(PAGE); setOpen(null); }, [q, sector, sort]);

  const sectors = useMemo(() => [...new Set((rows ?? []).map((r) => r.sector).filter(Boolean) as string[])].sort(), [rows]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const hit = (rows ?? []).filter((r) => (!sector || r.sector === sector) && (!s || r.t.toLowerCase().startsWith(s) || r.n.toLowerCase().includes(s)));
    if (sort === "name") return hit.sort((a, b) => a.t.localeCompare(b.t));
    const dir = sort === "de" ? 1 : -1; // least debt first; everything else biggest first
    // Blanks always last; debt/equity below zero means negative equity, not "no debt", so it goes last too.
    // Companies with almost no sales make absurd ratios (a 160,000% margin), so ratio sorts put them last.
    const val = (r: Row) => { const v = r[sort]; return v == null || (sort === "de" && v < 0) || (sort !== "rev" && (r.rev ?? 0) < RANK_MIN_REVENUE) ? null : v; };
    return hit.sort((a, b) => { const x = val(a), y = val(b); return x == null ? (y == null ? 0 : 1) : y == null ? -1 : (x - y) * dir; });
  }, [rows, q, sector, sort]);

  return (
    <section className="card stocks">
      <div className="card-head"><h1>Stocks</h1><span className="muted small">{rows ? `${list.length.toLocaleString()} of ${rows.length.toLocaleString()}` : ""}</span></div>
      <p className="muted small">From each company&apos;s SEC filings, last four quarters. Tap a stock for its price, P/E and market cap.</p>
      <div className="stocks-controls">
        <input className="note" type="search" placeholder="Ticker or company" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search stocks" />
        <Picker label="Sector" items={[{ value: "", label: "All sectors" }, ...sectors.map((s) => ({ value: s, label: s }))]} value={sector} onChange={setSector} placeholder="Search sectors" />
        <Picker label="Sort by" items={SORTS} value={sort} onChange={(v) => setSort(v as Key)} placeholder="Search" />
      </div>
      {rows === null ? <p className="muted">Loading…</p> : !list.length ? <p className="muted">No stocks match.</p> : (
        <>
          <div className="stocks-head" aria-hidden>
            <span>Stock</span><span className="r">Revenue</span><span className="r">Growth</span><span className="r">Net margin</span><span className="r">ROE</span><span className="r">FCF margin</span><span className="r">Debt/equity</span><span className="r">Payout</span>
          </div>
          <ul className="stocks-list">{list.slice(0, shown).map((r) => (
            <li key={r.t} className={open === r.t ? "open" : ""}>
              <button className="stock-row" onClick={() => setOpen(open === r.t ? null : r.t)} aria-expanded={open === r.t}>
                <span className="stock-name"><strong>{r.t}</strong> <span className="muted">{companyName(r.n, r.t)}</span>{r.sector ? <span className="muted small stock-sector">{r.sector}</span> : null}</span>
                <span className="r mono" data-k="Revenue">{money(r.rev)}</span>
                <span className={`r mono ${tone(r.growth)}`} data-k="Growth">{pct(r.growth)}</span>
                <span className={`r mono ${tone(r.margin)}`} data-k="Net margin">{pct(r.margin)}</span>
                <span className={`r mono ${tone(r.roe)}`} data-k="ROE">{pct(r.roe)}</span>
                <span className={`r mono ${tone(r.fcfMargin)}`} data-k="FCF margin">{pct(r.fcfMargin)}</span>
                <span className="r mono" data-k="Debt/equity">{ratio(r.de)}</span>
                <span className="r mono" data-k="Payout">{r.payout ? pct(r.payout) : "—"}</span>
              </button>
              {open === r.t ? (
                <div className="stock-more">
                  <TradingView widget="symbol-info" height={190} config={{ symbol: tvSymbol(r.t, r.x), width: "100%" }} label="Quote by TradingView" />
                  <div className="small muted">{r.basis ? `Figures: ${r.basis}. ` : ""}<Link href={`/stock/${r.t}`}>Insider trades and more ›</Link></div>
                </div>
              ) : null}
            </li>
          ))}</ul>
          {list.length > shown ? <button className="linkbtn" onClick={() => setShown(shown + PAGE)}>Show {Math.min(PAGE, list.length - shown)} more</button> : null}
        </>
      )}
    </section>
  );
}
