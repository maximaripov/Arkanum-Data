"use client";
import { useEffect, useState } from "react";
import { PriceChart, type Candle } from "@/components/PriceChart";
import { InsiderTable } from "@/components/InsiderTable";
import { useQuotes } from "@/components/useQuotes";
import { useWatchlist } from "@/components/useWatchlist";
import { fmtBig, fmtPct, fmtPrice, tone } from "@/lib/format";
import type { InsiderTrade } from "@/lib/sec";
import type { Announcement, Headline } from "@/lib/news";
import { useLevels } from "@/components/useLevels";

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
  const { levels, add: addLevel, remove: removeLevel } = useLevels(symbol);
  const [levelPrice, setLevelPrice] = useState("");
  const [levelNote, setLevelNote] = useState("");
  const [news, setNews] = useState<{ headlines: Headline[]; announcements: Announcement[] } | null>(null);
  const q = quotes[symbol];

  useEffect(() => {
    setErr("");
    fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(d.error) : setChart(d)))
      .catch((e) => setErr(String(e)));
  }, [symbol, range]);

  useEffect(() => {
    setNews(null);
    fetch(`/api/news?symbol=${encodeURIComponent(symbol)}`).then((r) => r.json()).then(setNews).catch(() => setNews({ headlines: [], announcements: [] }));
  }, [symbol]);

  useEffect(() => {
    const isEquity = !/[=^]|-USD$/.test(symbol);
    if (!isEquity) { setInsiders([]); return; }
    fetch(`/api/insiders?symbol=${encodeURIComponent(symbol)}`).then((r) => r.json()).then((d) => setInsiders(Array.isArray(d) ? d : [])).catch(() => setInsiders([]));
    fetch("/data/screener.json").then((r) => r.json()).then((d) => {
      const row = d.rows.find((r: any[]) => r[0] === symbol);
      if (row) setFund(Object.fromEntries(d.fields.map((f: string, i: number) => [f, row[i]])));
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
    ["Revenue", fmtBig(fund.rev)], ["Net income", fmtBig(fund.ni)], ["Net margin", fmtPct(fund.margin, 1)], ["Revenue growth", fmtPct(fund.growth, 1)], ["ROE", fmtPct(fund.roe, 1)],
  );

  return (
    <div className="stack">
      <section className="card">
        <div className="head">
          <div>
            <h1>{symbol} <button className={`star ${has(symbol) ? "on" : ""}`} onClick={() => toggle(symbol)} aria-label="Toggle watchlist">{has(symbol) ? "★" : "☆"}</button></h1>
            <div className="muted">{m?.name} {m ? `· ${m.exchange} · ${m.currency}` : ""}</div>
            {fund?.sector ? <div className="muted small">{fund.sector}{fund.ind ? ` · ${fund.ind}` : ""}</div> : null}
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
        {err ? <p className="down">Couldn&apos;t load chart: {err}</p> : <PriceChart candles={chart?.candles ?? []} mode={mode} levels={levels} onPick={(p) => setLevelPrice(p.toFixed(p < 1 ? 4 : 2))} />}
        <form className="levelform" onSubmit={(e) => {
          e.preventDefault();
          const p = parseFloat(levelPrice);
          if (!Number.isFinite(p) || p <= 0) return;
          addLevel(p, levelNote); setLevelPrice(""); setLevelNote("");
        }}>
          <input className="price mono" inputMode="decimal" placeholder="Price" value={levelPrice} onChange={(e) => setLevelPrice(e.target.value)} aria-label="Level price" />
          <input className="note" placeholder="Note, e.g. buy zone, stop, resistance" value={levelNote} onChange={(e) => setLevelNote(e.target.value)} maxLength={40} aria-label="Level note" />
          <button type="submit">Add level</button>
        </form>
        <p className="muted small">Tap the chart to fill in a price. Levels are saved on this device.</p>
        {levels.length ? (
          <ul className="levels">
            {levels.map((l) => {
              const dist = q?.price ? ((l.price - q.price) / q.price) * 100 : null;
              return (
                <li key={l.id}>
                  <span className="swatch" aria-hidden />
                  <span className="mono">{fmtPrice(l.price)}</span>
                  <span style={{ flex: 1 }}>{l.note || <span className="muted">No note</span>}</span>
                  <span className="mono small muted">{dist == null ? "" : `${fmtPct(dist, 1)} from price`}</span>
                  <button className="icon" onClick={() => removeLevel(l.id)} aria-label={`Remove level ${l.price}`}>×</button>
                </li>
              );
            })}
          </ul>
        ) : null}
        <dl className="stats">{stats.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="mono">{v}</dd></div>)}</dl>
        {fund?.basis ? <p className="muted small">Fundamentals: {fund.basis} (SEC filings). P/E uses reported net income, so one-time gains or losses distort it.</p> : null}
      </section>
      <div className="twocol">
        <section className="card">
          <h2>Headlines <span className="muted small">Yahoo Finance</span></h2>
          {news === null ? <p className="muted">Loading…</p> : news.headlines.length === 0 ? <p className="muted">No headlines found.</p> : (
            <ul className="news">
              {news.headlines.map((h) => (
                <li key={h.link}>
                  <a href={h.link} target="_blank" rel="noreferrer">{h.title}</a>
                  <div className="muted small">{h.publisher} · {h.time ? new Date(h.time * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}{h.aboutCompany ? "" : " · general market"}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
        {news === null || news.announcements.length > 0 ? (
          <section className="card">
            <h2>Company announcements <span className="muted small">SEC 8-K filings</span></h2>
            {news === null ? <p className="muted">Loading…</p> : (
              <ul className="news">
                {news.announcements.map((a) => (
                  <li key={a.link}>
                    <a href={a.link} target="_blank" rel="noreferrer">{a.items.length ? a.items.join(" · ") : "Announcement"}</a>
                    <div className="muted small">{new Date(a.date + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
      {insiders === null || insiders.length > 0 ? (
        <section className="card">
          <h2>Insider transactions <span className="muted small">SEC Form 4, latest 25 filings</span></h2>
          {insiders === null ? <p className="muted">Loading from SEC…</p> : <InsiderTable trades={insiders} />}
        </section>
      ) : null}
    </div>
  );
}
