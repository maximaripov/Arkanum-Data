"use client";
import { useEffect, useState } from "react";
import { PriceChart, type Candle } from "@/components/PriceChart";
import { InsiderTable } from "@/components/InsiderTable";
import { useQuotes } from "@/components/useQuotes";
import { useWatchlist } from "@/components/useWatchlist";
import { fmtBig, fmtPct, fmtPrice, tone } from "@/lib/format";
import type { InsiderTrade } from "@/lib/sec";

const RANGES = ["1d", "5d", "1mo", "6mo", "1y", "5y"];
type Meta = { name: string; exchange: string; currency: string; type: string; dayHigh: number; dayLow: number; volume: number; high52: number; low52: number };

export function StockView({ symbol }: { symbol: string }) {
  const [range, setRange] = useState("1y");
  const [mode, setMode] = useState<"area" | "candles">("area");
  const [chart, setChart] = useState<{ meta: Meta; candles: Candle[] } | null>(null);
  const [err, setErr] = useState("");
  const [insiders, setInsiders] = useState<InsiderTrade[] | null>(null);
  const [fund, setFund] = useState<Record<string, any> | null>(null);
  const { quotes } = useQuotes([symbol], 5_000);
  const { has, toggle } = useWatchlist();
  const q = quotes[symbol];

  useEffect(() => {
    setErr("");
    fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(d.error) : setChart(d)))
      .catch((e) => setErr(String(e)));
  }, [symbol, range]);

  useEffect(() => {
    const isEquity = !/[=^]|-USD$/.test(symbol);
    if (!isEquity) { setInsiders([]); return; }
    fetch(`/api/insiders?symbol=${encodeURIComponent(symbol)}`).then((r) => r.json()).then((d) => setInsiders(Array.isArray(d) ? d : [])).catch(() => setInsiders([]));
    fetch("/data/screener.json").then((r) => r.json()).then((d) => {
      const row = d.rows.find((r: any[]) => r[0] === symbol);
      if (row) setFund({ ...Object.fromEntries(d.fields.map((f: string, i: number) => [f, row[i]])), fy: d.fiscalYear });
    }).catch(() => {});
  }, [symbol]);

  const m = chart?.meta;
  const stats: [string, string][] = [
    ["Day range", m ? `${fmtPrice(m.dayLow)} – ${fmtPrice(m.dayHigh)}` : "—"],
    ["52-week range", m ? `${fmtPrice(m.low52)} – ${fmtPrice(m.high52)}` : "—"],
    ["Volume", fmtBig(m?.volume)],
  ];
  if (fund) stats.push(
    ["Market cap", fmtBig(fund.mcap)], ["P/E", fund.pe ?? "—"], ["P/S", fund.ps ?? "—"],
    [`Revenue (${fund.fy})`, fmtBig(fund.rev)], ["Net margin", fmtPct(fund.margin, 1)], ["Revenue growth", fmtPct(fund.growth, 1)], ["ROE", fmtPct(fund.roe, 1)],
  );

  return (
    <div className="stack">
      <section className="card">
        <div className="head">
          <div>
            <h1>{symbol} <button className={`star ${has(symbol) ? "on" : ""}`} onClick={() => toggle(symbol)} aria-label="Toggle watchlist">{has(symbol) ? "★" : "☆"}</button></h1>
            <div className="muted">{m?.name} {m ? `· ${m.exchange} · ${m.currency}` : ""}</div>
          </div>
          <div className="r">
            <div className="bigprice mono">{fmtPrice(q?.price)}</div>
            <div className={`mono ${tone(q?.change)}`}>{q?.change != null ? (q.change > 0 ? "+" : "") + fmtPrice(q.change) : ""} ({fmtPct(q?.changePct)})</div>
          </div>
        </div>
        <div className="toolbar">
          <div className="seg">{RANGES.map((r) => <button key={r} className={r === range ? "on" : ""} onClick={() => setRange(r)}>{r.toUpperCase()}</button>)}</div>
          <div className="seg"><button className={mode === "area" ? "on" : ""} onClick={() => setMode("area")}>Line</button><button className={mode === "candles" ? "on" : ""} onClick={() => setMode("candles")}>Candles</button></div>
        </div>
        {err ? <p className="down">Couldn&apos;t load chart: {err}</p> : <PriceChart candles={chart?.candles ?? []} mode={mode} />}
        <dl className="stats">{stats.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="mono">{v}</dd></div>)}</dl>
      </section>
      {insiders === null || insiders.length > 0 ? (
        <section className="card">
          <h2>Insider transactions <span className="muted small">SEC Form 4, latest 25 filings</span></h2>
          {insiders === null ? <p className="muted">Loading from SEC…</p> : <InsiderTable trades={insiders} />}
        </section>
      ) : null}
    </div>
  );
}
