"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fmtBig, fmtPct, fmtPrice, tone } from "@/lib/format";
import { execBuysBySymbol, matchesFilter } from "@/lib/screen.mjs";
import { useScreens, type SavedScreen } from "@/components/useScreens";

type Row = {
  t: string; n: string; x: string; p: number; chg: number | null; mcap: number | null; pe: number | null; ps: number | null;
  margin: number | null; growth: number | null; roe: number | null; ret1y: number | null; offHigh: number | null; ins: number | null;
  sector: string | null; ind: string | null; basis: string | null; dy: number | null; de: number | null; fcfy: number | null;
};
type Range = [number | "", number | ""];
type Key = "mcap" | "pe" | "ps" | "margin" | "growth" | "roe" | "dy" | "de" | "fcfy" | "ret1y" | "offHigh" | "chg" | "ins";

const num = (v: any) => (v ?? "—").toString();
const COLS: { k: Key; label: string; fmt: (v: any) => string; unit: string; tip?: string }[] = [
  { k: "mcap", label: "Market cap", fmt: fmtBig, unit: "$B" },
  { k: "pe", label: "P/E", fmt: num, unit: "" },
  { k: "ps", label: "P/S", fmt: num, unit: "" },
  { k: "margin", label: "Net margin", fmt: (v) => fmtPct(v, 1), unit: "%" },
  { k: "growth", label: "Rev growth", fmt: (v) => fmtPct(v, 1), unit: "%" },
  { k: "roe", label: "ROE", fmt: (v) => fmtPct(v, 1), unit: "%" },
  { k: "dy", label: "Div yield", fmt: (v) => (v == null ? "—" : `${v.toFixed(2)}%`), unit: "%", tip: "Dividends paid in the last fiscal year ÷ market cap" },
  { k: "de", label: "Debt/equity", fmt: num, unit: "", tip: "Debt ÷ shareholders' equity, latest balance sheet. Not shown for banks, insurers and funds." },
  { k: "fcfy", label: "FCF yield", fmt: (v) => fmtPct(v, 1), unit: "%", tip: "(Operating cash flow − capital spending) in the last fiscal year ÷ market cap" },
  { k: "ret1y", label: "1Y return", fmt: (v) => fmtPct(v, 1), unit: "%" },
  { k: "offHigh", label: "From 52W high", fmt: (v) => fmtPct(v, 1), unit: "%" },
  { k: "chg", label: "Day", fmt: (v) => fmtPct(v), unit: "%" },
  { k: "ins", label: "Exec buys 30d", fmt: (v) => (v ? "$" + fmtBig(v) : "—"), unit: "$K" },
];
const empty = (): Record<Key, Range> => Object.fromEntries(COLS.map((c) => [c.k, ["", ""]])) as Record<Key, Range>;
const PRESETS: Record<string, Partial<Record<Key, Range>>> = {
  "Profitable growers": { growth: [20, ""], margin: [10, ""], mcap: [2, ""] },
  "Value": { pe: [0, 15], roe: [12, ""], mcap: [1, ""] },
  "Dividend payers": { dy: [3, ""], fcfy: [4, ""], de: ["", 1.5], mcap: [2, ""] },
  "Cash machines": { fcfy: [6, ""], margin: [10, ""], mcap: [5, ""] },
  "Near 52-week high": { offHigh: [-3, ""], mcap: [1, ""] },
  "Beaten down quality": { offHigh: ["", -30], margin: [15, ""], mcap: [5, ""] },
  "Mega caps": { mcap: [200, ""] },
  "Insider buying": { ins: [100, ""] },
};

export default function Screener() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [meta, setMeta] = useState<{ updated: string } | null>(null);
  const [f, setF] = useState(empty);
  const [exch, setExch] = useState("All");
  const [sector, setSector] = useState("All");
  const [industry, setIndustry] = useState("All");
  const [text, setText] = useState("");
  const [sort, setSort] = useState<{ k: Key; dir: 1 | -1 }>({ k: "mcap", dir: -1 });
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

  const changed = () => { setPage(0); setActive(null); };
  const set = (k: Key, i: 0 | 1, v: string) => { changed(); setF((p) => ({ ...p, [k]: (i ? [p[k][0], v === "" ? "" : +v] : [v === "" ? "" : +v, p[k][1]]) as Range })); };
  const apply = (s: SavedScreen) => {
    setF({ ...empty(), ...(s.filter.ranges as Record<Key, Range>) });
    setExch(s.filter.exch ?? "All"); setSector(s.filter.sector ?? "All"); setIndustry(s.filter.industry ?? "All"); setText(s.filter.text ?? "");
    setPage(0); setActive(s.id);
  };
  const reset = () => { setF(empty()); setExch("All"); setSector("All"); setIndustry("All"); setText(""); changed(); };
  const PAGE = 100;

  return (
    <div className="stack">
      <section className="card">
        <h1>Stock screener</h1>
        <p className="muted small">
          {rows ? `${rows.length.toLocaleString()} US stocks` : "Loading…"}
          {meta ? ` · prices from ${new Date(meta.updated).toLocaleString()} · fundamentals from SEC filings: the last 4 reported quarters where available, otherwise the last fiscal year; dividends and free cash flow use the last fiscal year` : ""}
        </p>
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
          {Object.keys(PRESETS).map((p) => <button key={p} className="chip" onClick={() => { reset(); setF({ ...empty(), ...PRESETS[p] }); }}>{p}</button>)}
          <button className="chip" onClick={reset}>Reset</button>
        </div>
        <div className="filters">
          <label>Name or ticker<input value={text} onChange={(e) => { changed(); setText(e.target.value); }} placeholder="e.g. bank" /></label>
          <label>Sector<select value={sector} onChange={(e) => { changed(); setSector(e.target.value); setIndustry("All"); }}><option>All</option>{sectors.map((x) => <option key={x}>{x}</option>)}</select></label>
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
        <p className="muted small">Saved screens sync to your devices with the passcode, and the 4 PM briefing tells you when new stocks start matching one.</p>
      </section>
      <section className="card">
        <h2>{result.length.toLocaleString()} matches</h2>
        <p className="muted small">P/E, margin and growth use reported net income, so a one-time gain or loss (an asset sale, an investment revaluation) can make a stock look much cheaper or pricier than its business is. Check the stock page before acting.</p>
        <div className="tablewrap">
          <table className="table">
            <thead><tr>
              <th>Symbol</th><th>Sector</th><th className="r">Price</th>
              {COLS.map((c) => <th key={c.k} title={c.tip} className="r sortable" onClick={() => setSort((s) => ({ k: c.k, dir: s.k === c.k ? (-s.dir as 1 | -1) : -1 }))}>{c.label}{sort.k === c.k ? (sort.dir < 0 ? " ↓" : " ↑") : ""}</th>)}
            </tr></thead>
            <tbody>
              {result.slice(page * PAGE, (page + 1) * PAGE).map((r) => (
                <tr key={r.t}>
                  <td><Link href={`/stock/${r.t}`}><strong>{r.t}</strong></Link><div className="muted small ellipsis">{r.n}</div></td>
                  <td><div className="ellipsis small">{r.sector ?? "—"}</div><div className="muted small ellipsis" title={r.ind ?? ""}>{r.ind ?? ""}</div></td>
                  <td className="r mono">{fmtPrice(r.p)}</td>
                  {COLS.map((c) => <td key={c.k} className={`r mono ${["chg", "ret1y", "growth"].includes(c.k) ? tone(r[c.k]) : ""}`}>{c.fmt(r[c.k])}</td>)}
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
    </div>
  );
}
