"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fmtBig, fmtPct, fmtPrice, tone } from "@/lib/format";

type Row = { t: string; n: string; x: string; p: number; chg: number | null; mcap: number | null; pe: number | null; ps: number | null; margin: number | null; growth: number | null; roe: number | null; ret1y: number | null; offHigh: number | null; ins: number | null };
type Range = [number | "", number | ""];
type Key = "ins" | "mcap" | "pe" | "ps" | "margin" | "growth" | "roe" | "ret1y" | "offHigh" | "chg";

const COLS: { k: Key; label: string; fmt: (v: any) => string; unit: string }[] = [
  { k: "mcap", label: "Market cap", fmt: fmtBig, unit: "$B" },
  { k: "pe", label: "P/E", fmt: (v) => (v ?? "—").toString(), unit: "" },
  { k: "ps", label: "P/S", fmt: (v) => (v ?? "—").toString(), unit: "" },
  { k: "margin", label: "Net margin", fmt: (v) => fmtPct(v, 1), unit: "%" },
  { k: "growth", label: "Rev growth", fmt: (v) => fmtPct(v, 1), unit: "%" },
  { k: "roe", label: "ROE", fmt: (v) => fmtPct(v, 1), unit: "%" },
  { k: "ret1y", label: "1Y return", fmt: (v) => fmtPct(v, 1), unit: "%" },
  { k: "offHigh", label: "From 52W high", fmt: (v) => fmtPct(v, 1), unit: "%" },
  { k: "chg", label: "Day", fmt: (v) => fmtPct(v), unit: "%" },
  { k: "ins", label: "Insider buys 30d", fmt: (v) => (v ? "$" + fmtBig(v) : "—"), unit: "$K" },
];
const empty = (): Record<Key, Range> => Object.fromEntries(COLS.map((c) => [c.k, ["", ""]])) as Record<Key, Range>;
const PRESETS: Record<string, Partial<Record<Key, Range>>> = {
  "Profitable growers": { growth: [20, ""], margin: [10, ""], mcap: [2, ""] },
  "Value": { pe: [0, 15], roe: [12, ""], mcap: [1, ""] },
  "Near 52-week high": { offHigh: [-3, ""], mcap: [1, ""] },
  "Beaten down quality": { offHigh: ["", -30], margin: [15, ""], mcap: [5, ""] },
  "Mega caps": { mcap: [200, ""] },
  "Insider buying": { ins: [100, ""] },
};

export default function Screener() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [meta, setMeta] = useState<{ updated: string; fiscalYear: number } | null>(null);
  const [f, setF] = useState(empty);
  const [exch, setExch] = useState("All");
  const [text, setText] = useState("");
  const [sort, setSort] = useState<{ k: Key; dir: 1 | -1 }>({ k: "mcap", dir: -1 });
  const [page, setPage] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/data/screener.json").then((r) => r.json()),
      fetch("/data/insiders.json").then((r) => r.json()).catch(() => ({ trades: [] })),
    ]).then(([d, ins]) => {
      const buys = new Map<string, number>();
      for (const t of ins.trades) if (t.code === "P" && t.value) buys.set(t.symbol, (buys.get(t.symbol) ?? 0) + t.value);
      setMeta({ updated: d.updated, fiscalYear: d.fiscalYear });
      setRows(d.rows.map((r: any[]) => {
        const row = Object.fromEntries(d.fields.map((k: string, i: number) => [k, r[i]]));
        return { ...row, ins: buys.get(row.t) ?? null };
      }));
    });
  }, []);

  const result = useMemo(() => {
    if (!rows) return [];
    const q = text.trim().toLowerCase();
    return rows.filter((r) => {
      if (exch !== "All" && r.x !== exch) return false;
      if (q && !r.t.toLowerCase().startsWith(q) && !r.n.toLowerCase().includes(q)) return false;
      for (const c of COLS) {
        const [lo, hi] = f[c.k];
        if (lo === "" && hi === "") continue;
        let v = r[c.k];
        if (v == null) return false;
        if (c.k === "mcap") v = v / 1e9;
        if (c.k === "ins") v = v / 1e3;
        if (lo !== "" && v < lo) return false;
        if (hi !== "" && v > hi) return false;
      }
      return true;
    }).sort((a, b) => ((a[sort.k] ?? -Infinity) - (b[sort.k] ?? -Infinity)) * sort.dir);
  }, [rows, f, exch, text, sort]);

  const set = (k: Key, i: 0 | 1, v: string) => { setPage(0); setF((p) => ({ ...p, [k]: (i ? [p[k][0], v === "" ? "" : +v] : [v === "" ? "" : +v, p[k][1]]) as Range })); };
  const PAGE = 100;

  return (
    <div className="stack">
      <section className="card">
        <h1>Stock screener</h1>
        <p className="muted small">
          {rows ? `${rows.length.toLocaleString()} US stocks` : "Loading…"}
          {meta ? ` · prices from ${new Date(meta.updated).toLocaleString()} · fundamentals from fiscal ${meta.fiscalYear} SEC filings` : ""}
        </p>
        <div className="chips">
          {Object.keys(PRESETS).map((p) => <button key={p} className="chip" onClick={() => { setPage(0); setF({ ...empty(), ...PRESETS[p] }); }}>{p}</button>)}
          <button className="chip" onClick={() => { setF(empty()); setExch("All"); setText(""); }}>Reset</button>
        </div>
        <div className="filters">
          <label>Name or ticker<input value={text} onChange={(e) => { setPage(0); setText(e.target.value); }} placeholder="e.g. bank" /></label>
          <label>Exchange<select value={exch} onChange={(e) => { setPage(0); setExch(e.target.value); }}>{["All", "Nasdaq", "NYSE", "CBOE"].map((x) => <option key={x}>{x}</option>)}</select></label>
          {COLS.map((c) => (
            <label key={c.k}>{c.label}{c.unit ? ` (${c.unit})` : ""}
              <span className="minmax">
                <input inputMode="decimal" placeholder="min" value={f[c.k][0]} onChange={(e) => set(c.k, 0, e.target.value)} />
                <input inputMode="decimal" placeholder="max" value={f[c.k][1]} onChange={(e) => set(c.k, 1, e.target.value)} />
              </span>
            </label>
          ))}
        </div>
      </section>
      <section className="card">
        <h2>{result.length.toLocaleString()} matches</h2>
        <div className="tablewrap">
          <table className="table">
            <thead><tr>
              <th>Symbol</th><th className="r">Price</th>
              {COLS.map((c) => <th key={c.k} className="r sortable" onClick={() => setSort((s) => ({ k: c.k, dir: s.k === c.k ? (-s.dir as 1 | -1) : -1 }))}>{c.label}{sort.k === c.k ? (sort.dir < 0 ? " ↓" : " ↑") : ""}</th>)}
            </tr></thead>
            <tbody>
              {result.slice(page * PAGE, (page + 1) * PAGE).map((r) => (
                <tr key={r.t}>
                  <td><Link href={`/stock/${r.t}`}><strong>{r.t}</strong></Link><div className="muted small ellipsis">{r.n}</div></td>
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
