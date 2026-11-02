"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fmtBig, fmtPct, tone } from "@/lib/format";
import { execBuysBySymbol, matchesFilter } from "@/lib/screen.mjs";
import { useScreens, type SavedScreen } from "@/components/useScreens";
import { TradingView } from "@/components/TradingView";

type Row = {
  t: string; n: string; x: string; rev: number | null; ni: number | null; margin: number | null; growth: number | null; roe: number | null;
  de: number | null; fcf: number | null; fcfMargin: number | null; div: number | null; payout: number | null; ins: number | null;
  sector: string | null; ind: string | null; basis: string | null;
};
type Range = [number | "", number | ""];
type Key = "rev" | "ni" | "margin" | "growth" | "roe" | "de" | "fcf" | "fcfMargin" | "payout" | "ins";

const num = (v: any) => (v ?? "—").toString();
const COLS: { k: Key; label: string; fmt: (v: any) => string; unit: string; tip?: string }[] = [
  { k: "rev", label: "Revenue", fmt: (v) => (v == null ? "—" : "$" + fmtBig(v)), unit: "$M", tip: "Last 4 quarters where available, else last fiscal year" },
  { k: "ni", label: "Net income", fmt: (v) => (v == null ? "—" : "$" + fmtBig(v)), unit: "$M" },
  { k: "margin", label: "Net margin", fmt: (v) => fmtPct(v, 1), unit: "%" },
  { k: "growth", label: "Rev growth", fmt: (v) => fmtPct(v, 1), unit: "%", tip: "Versus the same period a year earlier" },
  { k: "roe", label: "ROE", fmt: (v) => fmtPct(v, 1), unit: "%", tip: "Net income ÷ shareholders' equity" },
  { k: "de", label: "Debt/equity", fmt: num, unit: "", tip: "Debt ÷ shareholders' equity, latest balance sheet. Not shown for banks, insurers and funds." },
  { k: "fcf", label: "Free cash flow", fmt: (v) => (v == null ? "—" : "$" + fmtBig(v)), unit: "$M", tip: "Operating cash flow − capital spending, last fiscal year" },
  { k: "fcfMargin", label: "FCF margin", fmt: (v) => fmtPct(v, 1), unit: "%", tip: "Free cash flow ÷ revenue, last fiscal year" },
  { k: "payout", label: "Payout ratio", fmt: (v) => (v == null ? "—" : `${v}%`), unit: "%", tip: "Dividends paid ÷ net income, last fiscal year (0 = pays no dividend)" },
  { k: "ins", label: "Exec buys 30d", fmt: (v) => (v ? "$" + fmtBig(v) : "—"), unit: "$K", tip: "Officers' and directors' open-market purchases, last 30 days" },
];
const empty = (): Record<Key, Range> => Object.fromEntries(COLS.map((c) => [c.k, ["", ""]])) as Record<Key, Range>;
const PRESETS: Record<string, Partial<Record<Key, Range>>> = {
  "Profitable growers": { growth: [20, ""], margin: [10, ""], rev: [500, ""] },
  "Quality": { roe: [20, ""], margin: [15, ""], de: ["", 1], rev: [1000, ""] },
  "Dividend payers": { payout: [20, 75], fcfMargin: [10, ""], de: ["", 1.5], rev: [1000, ""] },
  "Cash machines": { fcfMargin: [20, ""], margin: [10, ""], rev: [1000, ""] },
  "Fast growers": { growth: [50, ""], rev: [100, ""] },
  "Insider buying": { ins: [100, ""] },
};

const PRESET_HELP: Record<string, string> = {
  "Profitable growers": "Revenue up 20%+ a year with at least 10% net margin.",
  "Quality": "High return on equity, solid margins and modest debt.",
  "Dividend payers": "Pays out 20–75% of profit, generates cash, not over-borrowed.",
  "Cash machines": "Turns 20%+ of sales into free cash flow.",
  "Fast growers": "Revenue up 50%+ a year (often unprofitable).",
  "Insider buying": "Executives or directors bought $100K+ on the open market in the last 30 days.",
};

export default function Screener() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [meta, setMeta] = useState<{ updated: string } | null>(null);
  const [f, setF] = useState(empty);
  const [exch, setExch] = useState("All");
  const [sector, setSector] = useState("All");
  const [industry, setIndustry] = useState("All");
  const [text, setText] = useState("");
  const [sort, setSort] = useState<{ k: Key; dir: 1 | -1 }>({ k: "rev", dir: -1 });
  const [tab, setTab] = useState<"sec" | "tv">("sec");
  const [page, setPage] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  const [saveName, setSaveName] = useState("");
  const { screens, save, remove } = useScreens();

  useEffect(() => {
    Promise.all([
      fetch("/data/screener.json").then((r) => r.json()),
      fetch("/data/insiders.json").then((r) => r.json()).catch(() => ({ trades: [] })),
    ]).then(([d, ins]) => {
      const buys = execBuysBySymbol(ins.trades);
      setMeta({ updated: d.updated });
      setRows(d.rows.map((r: any[]) => {
        const row = Object.fromEntries(d.fields.map((k: string, i: number) => [k, r[i]]));
        return { ...row, ins: buys.get(row.t) ?? null };
      }));
    });
  }, []);

  const filter = { text, exch, sector, industry, ranges: f };
  const result = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => matchesFilter(r, filter)).sort((a, b) => ((a[sort.k] ?? -Infinity) - (b[sort.k] ?? -Infinity)) * sort.dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, f, exch, sector, industry, text, sort]);

  const sectors = useMemo(() => [...new Set((rows ?? []).map((r) => r.sector).filter(Boolean) as string[])].sort(), [rows]);
  const industries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows ?? []) if (r.ind && (sector === "All" || r.sector === sector)) counts.set(r.ind, (counts.get(r.ind) ?? 0) + 1);
    return [...counts].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows, sector]);

  const [preset, setPreset] = useState<string | null>(null);
  const activeCount = Object.values(f).filter(([lo, hi]) => lo !== "" || hi !== "").length + (industry !== "All" ? 1 : 0) + (exch !== "All" ? 1 : 0);
  const changed = () => { setPage(0); setActive(null); setPreset(null); };
  const set = (k: Key, i: 0 | 1, v: string) => { changed(); setF((p) => ({ ...p, [k]: (i ? [p[k][0], v === "" ? "" : +v] : [v === "" ? "" : +v, p[k][1]]) as Range })); };
  const apply = (s: SavedScreen) => {
    setF({ ...empty(), ...(s.filter.ranges as Record<Key, Range>) });
    setExch(s.filter.exch ?? "All"); setSector(s.filter.sector ?? "All"); setIndustry(s.filter.industry ?? "All"); setText(s.filter.text ?? "");
    setPage(0); setActive(s.id); setPreset(null);
  };
  const reset = () => { setF(empty()); setExch("All"); setSector("All"); setIndustry("All"); setText(""); changed(); };
  const PAGE = 100;

  return (
    <div className="stack">
      <section className="card">
        <h1>Stock screener</h1>
        <p className="muted">Find companies by how their business is doing: growth, profits, debt and cash, from their official filings.</p>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === "sec"} className={tab === "sec" ? "on" : ""} onClick={() => setTab("sec")}>Business fundamentals</button>
          <button role="tab" aria-selected={tab === "tv"} className={tab === "tv" ? "on" : ""} onClick={() => setTab("tv")}>Price &amp; valuation</button>
        </div>
      </section>
      {tab === "tv" ? (
        <section className="card">
          <p className="muted small">TradingView&apos;s screener filters on price-based measures: market cap, P/E, dividend yield, performance and more. Prices are delayed 15 minutes.</p>
          <TradingView widget="screener" height={720} config={{ width: "100%", height: "100%", defaultColumn: "overview", defaultScreen: "most_capitalized", market: "america", showToolbar: true }} label="Screener by TradingView" />
        </section>
      ) : (<>
      <section className="card">
        <h2>Quick screens</h2>
        {screens.length ? (
          <div className="chips">
            <span className="small muted">Your screens:</span>
            {screens.map((s) => (
              <span key={s.id} className={`chip saved${active === s.id ? " on" : ""}`}>
                <button onClick={() => apply(s)}>{s.name}</button>
                <button onClick={() => { remove(s.id); if (active === s.id) setActive(null); }} aria-label={`Delete screen ${s.name}`}>×</button>
              </span>
            ))}
          </div>
        ) : null}
        <div className="chips">
          {Object.keys(PRESETS).map((p) => <button key={p} className={`chip${preset === p ? " on" : ""}`} title={PRESET_HELP[p]} onClick={() => { reset(); setF({ ...empty(), ...PRESETS[p] }); setPreset(p); }}>{p}</button>)}
          {preset || activeCount || sector !== "All" || text ? <button className="chip" onClick={() => { reset(); setPreset(null); }}>Clear</button> : null}
        </div>
        {preset ? <p className="small muted">{PRESET_HELP[preset]}</p> : null}
        <div className="filterbar">
          <input className="filter-input" value={text} onChange={(e) => { changed(); setText(e.target.value); }} placeholder="Name or ticker, e.g. bank" aria-label="Name or ticker" />
          <select className="filter-input" style={{ flex: "0 1 14rem" }} value={sector} onChange={(e) => { changed(); setSector(e.target.value); setIndustry("All"); }} aria-label="Sector"><option value="All">All sectors</option>{sectors.map((x) => <option key={x}>{x}</option>)}</select>
        </div>
        <details className="more">
          <summary>Custom filters{activeCount ? ` (${activeCount} active)` : ""}</summary>
        <div className="filters">
          <label>Industry<select value={industry} onChange={(e) => { changed(); setIndustry(e.target.value); }}><option>All</option>{industries.map(([x, n]) => <option key={x} value={x}>{x} ({n})</option>)}</select></label>
          <label>Exchange<select value={exch} onChange={(e) => { changed(); setExch(e.target.value); }}>{["All", "Nasdaq", "NYSE", "CBOE"].map((x) => <option key={x}>{x}</option>)}</select></label>
          {COLS.map((c) => (
            <label key={c.k} title={c.tip}>{c.label}{c.unit ? ` (${c.unit})` : ""}
              <span className="minmax">
                <input inputMode="decimal" placeholder="min" value={f[c.k][0]} onChange={(e) => set(c.k, 0, e.target.value)} />
                <input inputMode="decimal" placeholder="max" value={f[c.k][1]} onChange={(e) => set(c.k, 1, e.target.value)} />
              </span>
            </label>
          ))}
        </div>
        <form className="levelform" onSubmit={(e) => {
          e.preventDefault();
          const name = saveName.trim();
          if (!name) return;
          setActive(save(name, filter)); setSaveName("");
        }}>
          <input className="note" placeholder="Name this screen to save it" value={saveName} onChange={(e) => setSaveName(e.target.value)} maxLength={30} aria-label="Screen name" />
          <button type="submit">Save screen</button>
        </form>
        <p className="muted small">Saved screens stay on this device. With notifications on, your daily digest tells you when new companies start matching one.</p>
        </details>
      </section>
      <section className="card">
        <h2>{result.length.toLocaleString()} matches</h2>
        <p className="muted small">{rows ? `Out of ${rows.length.toLocaleString()} US companies` : "Loading…"}{meta ? ` · from SEC filings, updated ${new Date(meta.updated).toLocaleDateString()}. Figures cover the last 4 reported quarters where available, otherwise the last fiscal year. Tap a column to sort.` : ""}</p>
        <p className="muted small">Margins and ROE use reported net income, so a one-time gain or loss (an asset sale, an investment revaluation) can distort them. Check the stock page before drawing conclusions.</p>
        <div className="tablewrap">
          <table className="table">
            <thead><tr>
              <th>Symbol</th><th>Sector</th>
              {COLS.map((c) => <th key={c.k} title={c.tip} className="r sortable" onClick={() => setSort((s) => ({ k: c.k, dir: s.k === c.k ? (-s.dir as 1 | -1) : -1 }))}>{c.label}{sort.k === c.k ? (sort.dir < 0 ? " ↓" : " ↑") : ""}</th>)}
            </tr></thead>
            <tbody>
              {result.slice(page * PAGE, (page + 1) * PAGE).map((r) => (
                <tr key={r.t}>
                  <td><Link href={`/stock/${r.t}`}><strong>{r.t}</strong></Link><div className="muted small ellipsis">{r.n}</div></td>
                  <td><div className="ellipsis small">{r.sector ?? "—"}</div><div className="muted small ellipsis" title={r.ind ?? ""}>{r.ind ?? ""}</div></td>
                  {COLS.map((c) => <td key={c.k} className={`r mono ${["growth"].includes(c.k) ? tone(r[c.k]) : ""}`}>{c.fmt(r[c.k])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.length > PAGE ? (
          <div className="toolbar">
            <button disabled={page === 0} onClick={() => setPage(page - 1)}>← Prev</button>
            <span className="small muted">Page {page + 1} of {Math.ceil(result.length / PAGE)}</span>
            <button disabled={(page + 1) * PAGE >= result.length} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        ) : null}
      </section>
      </>)}
    </div>
  );
}
