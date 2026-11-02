"use client";
// The markets strip, in this order: S&P 500, Nasdaq-100, bitcoin, gold, 10-year Treasury yield.
// The two indexes are licensed, so they come as TradingView quote widgets; the rest are drawn
// by Foresight (lib/macro.ts via /api/markets) and open a chart when tapped.
import { useEffect, useMemo, useState } from "react";
import { LineChart, Spark } from "./Charts";
import { TradingView } from "./TradingView";
import type { Group, Series } from "@/lib/macro";
import { fmtChange, fmtValue, weekSummary } from "@/lib/macroFormat";

const INDEXES = ["FOREXCOM:SPXUSD", "FOREXCOM:NSXUSD"]; // S&P 500, Nasdaq 100
function IndexQuote({ symbol }: { symbol: string }) {
  return <div className="mcard tvq"><TradingView widget="mini-symbol-overview" height={130} config={{ symbol, width: "100%", height: "100%", dateRange: "1M", isTransparent: true, chartOnly: false, noTimeScale: true }} label="TradingView" /></div>;
}

const RANGES: [string, number][] = [["1W", 8], ["1M", 31], ["3M", 92], ["1Y", 366]];
const NEUTRAL = "var(--ma50)";
const colorOf = (s: Series, from: number | null) => (s.tone === "neutral" || from == null ? NEUTRAL : s.value >= from ? "var(--up)" : "var(--down)");
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

function Card({ s, on, pick }: { s: Series; on: boolean; pick: () => void }) {
  const c = fmtChange(s, s.prev, s.value);
  const pts = since(s.history, 31);
  const cls = s.tone === "price" && c ? (c.dir > 0 ? "up" : c.dir < 0 ? "down" : "") : "";
  return (
    <button className={`mcard${on ? " on" : ""}`} onClick={pick} aria-expanded={on}>
      <span className="mcard-label">{s.label}</span>
      <span className="mcard-value mono">{fmtValue(s, s.value)}</span>
      {c ? <span className={`mcard-chg mono ${cls}`}>{c.dir > 0 ? "▲" : c.dir < 0 ? "▼" : ""} {c.text}</span> : <span />}
      <Spark points={pts} color={colorOf(s, pts[0]?.[1] ?? null)} />
    </button>
  );
}

export function MarketBoard() {
  const groups = useMarkets();
  const [open, setOpen] = useState<string | null>(null);
  const [days, setDays] = useState(92);
  const series = groups?.flatMap((g) => g.series) ?? [];
  const s = series.find((x) => x.id === open);
  return (
    <section className="card">
      <div className="card-head"><h2>Markets</h2><span className="muted small">Tap bitcoin, gold or the 10-year for a chart</span></div>
      <div className="mstrip">
        {INDEXES.map((sym) => <IndexQuote key={sym} symbol={sym} />)}
        {groups === null ? Array.from({ length: 3 }, (_, i) => <div key={i} className="mcard skeleton" />)
          : series.map((x) => <Card key={x.id} s={x} on={x.id === open} pick={() => setOpen(x.id === open ? null : x.id)} />)}
      </div>
      {groups !== null && !series.length ? <p className="muted small">Bitcoin, gold and Treasury data are unavailable right now. Try again in a few minutes.</p> : null}
      {s ? (() => {
        const pts = since(s.history, days);
        const c = fmtChange(s, pts[0]?.[1] ?? null, s.value);
        return (
          <div className="detail">
            <div className="detail-head">
              <div><h3>{s.label}</h3><p className="muted small">{s.about}</p></div>
              <div className="seg">{RANGES.map(([l, d]) => <button key={l} className={d === days ? "on" : ""} onClick={() => setDays(d)}>{l}</button>)}</div>
            </div>
            <LineChart points={pts} fmt={(v) => fmtValue(s, v)} color={colorOf(s, pts[0]?.[1] ?? null)} />
            {c ? <p className="muted small">Change over this period: <span className="mono">{c.text}</span></p> : null}
          </div>
        );
      })() : null}
      <p className="muted small credit">Change vs the day before. S&amp;P 500 and Nasdaq 100 by TradingView (index CFDs, may differ slightly from the official index). Bitcoin and gold (PAX Gold token): <a href="https://www.coingecko.com/" target="_blank" rel="noreferrer">Powered by CoinGecko</a>. 10-year yield: Federal Reserve via <a href="https://fred.stlouisfed.org/series/DGS10" target="_blank" rel="noreferrer">FRED</a>, each business day.</p>
    </section>
  );
}
