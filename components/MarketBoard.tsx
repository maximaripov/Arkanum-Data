"use client";
// Markets & economy, drawn by Foresight: interest rates, energy, currencies, crypto and
// the big economic reports. Tap a card to see its chart. Data: lib/macro.ts.
import { useEffect, useMemo, useState } from "react";
import { LineChart, Spark } from "./Charts";
import type { Group, Series } from "@/lib/macro";
import { asOf, fmtChange, fmtValue, sinceLabel, weekSummary } from "@/lib/macroFormat";

const RANGES: Record<Series["freq"], [string, number][]> = {
  daily: [["1M", 31], ["3M", 92], ["6M", 183], ["1Y", 366]],
  weekly: [["3M", 92], ["6M", 183], ["1Y", 366]],
  monthly: [["1Y", 366], ["5Y", 1827], ["10Y", 3653]],
  quarterly: [["2Y", 731], ["5Y", 1827], ["10Y", 3653]],
};
const NEUTRAL = "var(--ma50)";
// Which card each tab opens on: the one people check first.
const LEAD: Record<string, string> = { rates: "t10y", energy: "wti", fx: "eurusd", crypto: "bitcoin", economy: "cpi" };
export const colorOf = (s: Series, from: number | null) => (s.tone === "neutral" || from == null ? NEUTRAL : s.value >= from ? "var(--up)" : "var(--down)");
const since = (pts: Series["history"], days: number) => {
  const cut = new Date(Date.parse(pts.at(-1)![0] + "T12:00:00Z") - days * 86_400_000).toISOString().slice(0, 10);
  return pts.filter(([d]) => d >= cut);
};

export function useMarkets() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  useEffect(() => {
    let stop = false;
    const load = () => fetch("/api/markets").then((r) => r.json()).then((d) => { if (!stop) setGroups(d.groups ?? []); }).catch(() => { if (!stop) setGroups((g) => g ?? []); });
    load();
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 5 * 60_000);
    return () => { stop = true; clearInterval(t); };
  }, []);
  return groups;
}

export function WeekSummary({ groups }: { groups: Group[] | null }) {
  const lines = useMemo(() => (groups ? weekSummary(groups) : []), [groups]);
  if (!lines.length) return null;
  return <ul className="weeksum">{lines.map((l) => <li key={l}>{l}</li>)}</ul>;
}

function Tile({ s, on, pick }: { s: Series; on: boolean; pick: () => void }) {
  const c = fmtChange(s, s.prev, s.value);
  const pts = since(s.history, s.freq === "monthly" || s.freq === "quarterly" ? 1827 : 92);
  return (
    <button className={`tile${on ? " on" : ""}`} onClick={pick} aria-pressed={on}>
      <span className="tile-label">{s.label}</span>
      <span className="tile-value mono">{fmtValue(s, s.value)}</span>
      <span className="tile-foot">
        {c ? <span className={`mono ${s.tone === "price" ? (c.dir > 0 ? "up" : c.dir < 0 ? "down" : "muted") : "muted"}`}>{c.dir > 0 ? "▲" : c.dir < 0 ? "▼" : "•"} {c.text}</span> : null}
        <span className="muted">{asOf(s)}</span>
      </span>
      <Spark points={pts} color={colorOf(s, pts[0]?.[1] ?? null)} />
    </button>
  );
}

export function MarketBoard() {
  const groups = useMarkets();
  const [gid, setGid] = useState("rates");
  const [sid, setSid] = useState<string | null>(null);
  const [range, setRange] = useState<number | null>(null);
  if (groups === null) return <section className="card"><h2>Markets &amp; economy</h2><div className="tiles">{Array.from({ length: 4 }, (_, i) => <div key={i} className="tile skeleton" />)}</div></section>;
  if (!groups.length) return <section className="card"><h2>Markets &amp; economy</h2><p className="muted">Market data is unavailable right now. Try again in a few minutes.</p></section>;
  const g = groups.find((x) => x.id === gid) ?? groups[0];
  const s = g.series.find((x) => x.id === sid) ?? g.series.find((x) => x.id === LEAD[g.id]) ?? g.series[0];
  const ranges = RANGES[s.freq];
  const days = ranges.find(([, d]) => d === range)?.[1] ?? ranges.at(-1)![1];
  const pts = since(s.history, days);
  const c = fmtChange(s, pts[0]?.[1] ?? null, s.value);
  return (
    <section className="card">
      <div className="card-head"><h2>Markets &amp; economy</h2></div>
      <WeekSummary groups={groups} />
      <div className="scroller tabs-chips" role="tablist">
        {groups.map((x) => <button key={x.id} role="tab" aria-selected={x.id === g.id} className={`chip${x.id === g.id ? " on" : ""}`} onClick={() => { setGid(x.id); setSid(null); setRange(null); }}>{x.title}</button>)}
      </div>
      <p className="muted small blurb">{g.blurb}</p>
      <div className="tiles">{g.series.map((x) => <Tile key={x.id} s={x} on={x.id === s.id} pick={() => { setSid(x.id); setRange(null); }} />)}</div>

      <div className="detail">
        <div className="detail-head">
          <div>
            <h3>{s.label}</h3>
            <p className="muted small">{s.about}</p>
          </div>
          <div className="seg">{ranges.map(([l, d]) => <button key={l} className={d === days ? "on" : ""} onClick={() => setRange(d)}>{l}</button>)}</div>
        </div>
        <LineChart points={pts} fmt={(v) => fmtValue(s, v)} color={colorOf(s, pts[0]?.[1] ?? null)} monthly={s.freq === "monthly" || s.freq === "quarterly"} />
        <p className="muted small">
          {c ? <>Over this period: <span className="mono">{c.text}</span> · </> : null}
          Latest: {asOf(s)} ({sinceLabel(s)}: {fmtChange(s, s.prev, s.value)?.text ?? "—"}) · Source: <a href={g.source.href} target="_blank" rel="noreferrer">{g.source.text}</a>
        </p>
      </div>
    </section>
  );
}
