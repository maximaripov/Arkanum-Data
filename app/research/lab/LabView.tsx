"use client";
// The research lab: choose rules for which insider purchases to follow, and see what happened
// after every purchase that matched, from the first close after the filing, against the
// S&P 500. Two strategies side by side; 2023-25 or filings since January 2026. Runs in the
// browser on the table the backtest writes (public/data/lab), so it costs no server time.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { applyRules, decode, DEFAULT_RULES, HORIZONS, summarize, verdict } from "@/lib/lab.mjs";
import { RangeBar } from "@/components/TradeAnalysis";
import { MAX_SAVED, useStrategies, type Saved } from "@/components/useStrategies";
import { notificationsOn } from "@/lib/device";

type Rules = typeof DEFAULT_RULES;
type Row = ReturnType<typeof decode>[number];
type Period = "2023-25" | "2026";
const FILES: Record<Period, string> = { "2023-25": "/data/lab/buys-2023-25.json", "2026": "/data/lab/buys-2026.json" };
const pct = (x: number) => `${x > 0.0005 ? "+" : x < -0.0005 ? "−" : ""}${Math.abs(x * 100).toFixed(1)}%`;
const VERDICT: Record<string, string> = { beat: "Beat the S&P 500", trailed: "Trailed the S&P 500", "no clear edge": "No clear edge", "too few": "Too few to judge" };

const PRESETS: [string, Rules][] = [
  ["All purchases", { ...DEFAULT_RULES }],
  ["CEOs, $100K+, not pre-planned", { ...DEFAULT_RULES, ceoOnly: true, minValue: 100_000, noPlanned: true }],
  ["3+ insiders buying", { ...DEFAULT_RULES, minInsiders: 3 }],
  ["Top executives, $2B+ companies", { ...DEFAULT_RULES, topOnly: true, minCapM: 2000 }],
];

/** A strategy's rules in words, for its default name and the saved list. */
function describe(r: Rules) {
  const parts = [r.ceoOnly ? "CEOs" : r.topOnly ? "Top executives" : "All insiders"];
  if (r.minInsiders > 1) parts.push(`${r.minInsiders}+ buying`);
  if (r.minValue) parts.push(`$${r.minValue >= 1e6 ? `${r.minValue / 1e6}M` : `${r.minValue / 1e3}K`}+`);
  if (r.minCapM) parts.push(`$${r.minCapM >= 1000 ? `${r.minCapM / 1000}B` : `${r.minCapM}M`}+ companies`);
  if (r.noPlanned) parts.push("not pre-planned");
  if (r.noUnder5) parts.push("$5+ stocks");
  return parts.join(", ");
}

/** Save a strategy for alerts: a name, with its tested six-month result kept alongside. */
function SaveStrategy({ rules, rows, period, label }: { rules: Rules; rows: Row[] | null; period: string; label: string }) {
  const { list, save } = useStrategies();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [on, setOn] = useState(true);
  useEffect(() => setOn(notificationsOn()), []);
  const s = useMemo(() => (rows ? summarize(rows, "m6") : null), [rows]);
  const dup = list.some((x) => JSON.stringify(x.rules) === JSON.stringify(rules));
  const id = `save-${label.replace(/\W/g, "")}`;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = save({ name: (name.trim() || describe(rules)).slice(0, 60), rules, med: s?.med ?? null, period });
    setMsg(ok ? "Saved. You'll get an alert when a new purchase meets every rule." : `You can save up to ${MAX_SAVED} strategies; remove one first.`);
    setName("");
  };
  return (
    <form className="lab-save" onSubmit={submit}>
      <label htmlFor={id} className="small">Get an alert when a new purchase meets every rule</label>
      <div className="lab-save-row">
        <input id={id} placeholder={describe(rules)} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        <button className="btn" type="submit" disabled={dup}>{dup ? "Saved" : "Save and alert me"}</button>
      </div>
      {s ? <p className="muted small">In {period === "2026" ? "2026 so far" : "2023 to 2025"} this strategy did {pct(s.med)} against the S&amp;P 500 over six months ({VERDICT[verdict(s)].charAt(0).toLowerCase() + VERDICT[verdict(s)].slice(1)}). An alert means a purchase meets your rules, not that it will do well.</p> : null}
      {msg ? <p className="small" role="status">{msg}</p> : null}
      {!on ? <p className="small">Alerts need notifications on this device: <Link href="/briefing#notify">turn them on</Link>.</p> : null}
    </form>
  );
}

/** The strategies saved on this device, with their tested result; open one in A or remove it. */
function SavedList({ load }: { load: (r: Rules) => void }) {
  const { list, remove } = useStrategies();
  if (!list.length) return null;
  return (
    <section className="card">
      <h2>Your saved strategies <span className="muted small">alerts on this device, {list.length} of {MAX_SAVED}</span></h2>
      <ul className="lab-saved">{list.map((x: Saved) => (
        <li key={x.id}>
          <div><strong>{x.name}</strong><span className="muted small">{describe(x.rules)}{x.med != null ? ` · tested ${x.period === "2026" ? "2026" : "2023-25"}: ${pct(x.med)} vs S&P 500, 6 months` : ""}</span></div>
          <div className="lab-saved-act"><button className="linkbtn" onClick={() => load(x.rules)}>Open in A</button><button className="linkbtn" onClick={() => remove(x.id)} aria-label={`Stop alerts for ${x.name}`}>Remove</button></div>
        </li>
      ))}</ul>
    </section>
  );
}

function RuleForm({ rules, set, label }: { rules: Rules; set: (r: Rules) => void; label: string }) {
  const up = (k: keyof Rules, v: Rules[keyof Rules]) => set({ ...rules, [k]: v });
  const id = label.replace(/\W/g, "");
  return (
    <fieldset className="lab-rules">
      <legend>{label}</legend>
      <div className="lab-presets">{PRESETS.map(([n, r]) => <button key={n} type="button" className="chip" onClick={() => set(r)}>{n}</button>)}</div>
      <label className="check"><input type="checkbox" checked={rules.ceoOnly} onChange={(e) => set({ ...rules, ceoOnly: e.target.checked, topOnly: e.target.checked ? false : rules.topOnly })} /> CEO purchases only</label>
      <label className="check"><input type="checkbox" checked={rules.topOnly} onChange={(e) => set({ ...rules, topOnly: e.target.checked, ceoOnly: e.target.checked ? false : rules.ceoOnly })} /> Top executives only (CEO, CFO, President, Chair)</label>
      <label className="sel" htmlFor={`${id}-ins`}>Insiders buying the same stock (30 days)
        <select id={`${id}-ins`} value={rules.minInsiders} onChange={(e) => up("minInsiders", +e.target.value)}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n === 1 ? "Any" : `${n} or more`}</option>)}</select></label>
      <label className="sel" htmlFor={`${id}-val`}>Purchase size
        <select id={`${id}-val`} value={rules.minValue} onChange={(e) => up("minValue", +e.target.value)}>{[[0, "Any"], [10_000, "$10K or more"], [100_000, "$100K or more"], [1_000_000, "$1M or more"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label className="sel" htmlFor={`${id}-cap`}>Company size (market cap at entry)
        <select id={`${id}-cap`} value={rules.minCapM} onChange={(e) => up("minCapM", +e.target.value)}>{[[0, "Any"], [300, "$300M or more"], [2000, "$2B or more"], [10000, "$10B or more"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label className="check"><input type="checkbox" checked={rules.noPlanned} onChange={(e) => up("noPlanned", e.target.checked)} /> Leave out pre-planned purchases (10b5-1)</label>
      <label className="check"><input type="checkbox" checked={rules.noUnder5} onChange={(e) => up("noUnder5", e.target.checked)} /> Leave out stocks under $5</label>
    </fieldset>
  );
}

function Results({ rows, title }: { rows: Row[] | null; title: string }) {
  const stats = useMemo(() => (rows ? HORIZONS.map(([h, l]) => [l, summarize(rows, h)] as const) : null), [rows]);
  return (
    <div className="lab-results" aria-live="polite">
      <h3>{title} <span className="muted small">{rows ? `${rows.length.toLocaleString("en-US")} purchases matched` : ""}</span></h3>
      {!stats ? <p className="muted">Loading…</p> : (
        <ul className="lab-list">{stats.map(([l, s]) => (
          <li key={l}>
            <div className="lab-line"><strong>{l}</strong>
              {!s ? <span className="muted">no purchases with returns yet</span> : <>
                <span className={`mono ${s.med > 0 ? "up" : s.med < 0 ? "down" : ""}`}>{pct(s.med)} vs S&amp;P 500</span>
                <span className="muted small">{Math.round(s.beat * 100)}% beat it</span>
                <span className={`small lab-verdict ${verdict(s) === "beat" ? "up" : verdict(s) === "trailed" ? "down" : ""}`}>{VERDICT[verdict(s)]}</span>
              </>}
            </div>
            {s ? <>
              <RangeBar median={s.med * 100} lo={s.lo != null ? s.lo * 100 : null} hi={s.hi != null ? s.hi * 100 : null} />
              <span className="muted small">90% range {s.lo != null && s.hi != null ? `${pct(s.lo)} to ${pct(s.hi)}` : "—"} · {s.n.toLocaleString("en-US")} purchases over {s.months} months</span>
            </> : null}
          </li>
        ))}</ul>
      )}
    </div>
  );
}

/** A against B at six months, by the papers' rule: different only when the ranges don't overlap. */
function Compare({ a, b }: { a: Row[] | null; b: Row[] | null }) {
  const sa = useMemo(() => (a ? summarize(a, "m6") : null), [a]), sb = useMemo(() => (b ? summarize(b, "m6") : null), [b]);
  if (!sa || !sb || sa.lo == null || sa.hi == null || sb.lo == null || sb.hi == null) return null;
  const apart = sa.lo > sb.hi || sb.lo > sa.hi;
  const better = sa.med > sb.med ? "A" : "B";
  return (
    <p className={`lab-compare ${apart ? "apart" : ""}`}>
      <strong>A against B, six months:</strong> {pct(sa.med)} against {pct(sb.med)}.{" "}
      {apart ? <>The ranges don&apos;t overlap: strategy {better} did better over this period. Check it holds in the other period before trusting it.</> : <>The ranges overlap, so the data can&apos;t tell the two strategies apart.</>}
    </p>
  );
}

export function LabView() {
  const [period, setPeriod] = useState<Period>("2023-25");
  const [data, setData] = useState<Partial<Record<Period, { rows: Row[]; from: string; to: string; unknownCap: number } | null>>>({});
  const [a, setA] = useState<Rules>(PRESETS[1][1]);
  const [b, setB] = useState<Rules>(PRESETS[0][1]);
  // How many different rule sets this visit has tried: the more you try, the likelier one looks good by luck.
  const tried = useRef(new Set<string>());
  const [nTried, setNTried] = useState(0);
  useEffect(() => { for (const r of [a, b]) tried.current.add(JSON.stringify(r)); setNTried(tried.current.size); }, [a, b]);

  useEffect(() => {
    if (period in data) return;
    fetch(FILES[period]).then((r) => (r.ok ? r.json() : null)).then((f) => {
      const rows = f ? decode(f) : null;
      setData((d) => ({ ...d, [period]: rows ? { rows, from: f.from, to: f.to, unknownCap: rows.filter((x) => x.c < 0).length / Math.max(1, rows.length) } : null }));
    }).catch(() => setData((d) => ({ ...d, [period]: null })));
  }, [period, data]);
  const d = data[period];
  const rowsA = useMemo(() => (d ? applyRules(d.rows, a) : null), [d, a]);
  const rowsB = useMemo(() => (d ? applyRules(d.rows, b) : null), [d, b]);
  const usesCap = a.minCapM > 0 || b.minCapM > 0;

  return (
    <article className="paper lab">
      <header className="paper-head">
        <p className="paper-series">Arkanum Data Research · Backtester</p>
        <h1 className="paper-title">Test an insider-buying strategy</h1>
        <p className="paper-authors">Pick rules, and see what happened after every officer and director purchase that matched, bought at the first close after the filing became public, against the S&amp;P 500.</p>
      </header>
      <div className="lab-period" role="group" aria-label="Period">
        {(["2023-25", "2026"] as Period[]).map((p) => <button key={p} className={period === p ? "on" : ""} aria-pressed={period === p} onClick={() => setPeriod(p)}>{p === "2026" ? "Filed since Jan 2026" : "2023 to 2025"}</button>)}
      </div>
      {d === null ? <p className="muted">The {period} table isn&apos;t published yet; it&apos;s written by the research backtest.</p> : null}
      <div className="lab-grid">
        <section className="card"><RuleForm rules={a} set={setA} label="Strategy A" /><Results rows={rowsA} title="Strategy A" /><SaveStrategy rules={a} rows={rowsA} period={period} label="A" /></section>
        <section className="card"><RuleForm rules={b} set={setB} label="Strategy B" /><Results rows={rowsB} title="Strategy B" /><SaveStrategy rules={b} rows={rowsB} period={period} label="B" /></section>
      </div>
      <Compare a={rowsA} b={rowsB} />
      <SavedList load={setA} />
      <section className="paper-body lab-notes">
        <h2>Reading the results</h2>
        <ul>
          <li><strong>Median vs S&amp;P 500</strong> is the middle purchase&apos;s return minus the S&amp;P 500&apos;s over the same days. <strong>Beat it</strong> is the share of purchases that did better than the index.</li>
          <li><strong>The 90% range</strong> comes from resampling whole filing months, because purchases filed in the same month move together. A verdict says &ldquo;beat&rdquo; or &ldquo;trailed&rdquo; only when the whole range is on one side of zero. When the two strategies&apos; ranges overlap, the data can&apos;t tell them apart.</li>
          <li><strong>You have tried {nTried} rule set{nTried === 1 ? "" : "s"} this visit.</strong> Each try is another chance for a rule to look good by luck: try twenty, and about one will clear a 90% range by chance alone. A rule worth trusting holds in both 2023 to 2025 and 2026.</li>
          {usesCap && d ? <li><strong>Market cap</strong> is the entry price times shares outstanding from SEC filings. It is unknown for {Math.round(d.unknownCap * 100)}% of purchases (mostly foreign companies), which drop out when a minimum is set.</li> : null}
          <li>Returns are before trading costs and taxes, and stocks that stopped trading are left out, which flatters the results somewhat. Past results, not a forecast. <Link href="/research/methodology">Methodology ›</Link></li>
        </ul>
        {d ? <p className="muted small">Filings from {d.from.slice(0, 4)} to the end of {d.to.replace(/^(\d{4})q(\d)$/i, "Q$2 $1")}. Returns against the S&amp;P 500 only; no prices are published.</p> : null}
      </section>
    </article>
  );
}
