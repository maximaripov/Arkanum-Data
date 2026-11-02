"use client";
import { useEffect, useState } from "react";
import { TradingView } from "@/components/TradingView";
import { TradeList } from "@/components/TradeList";
import { FundHolders } from "@/components/FundsView";
import { useWatchlist } from "@/components/useWatchlist";
import { fmtBig, fmtPct } from "@/lib/format";
import { tvSymbol } from "@/lib/tv";
import type { InsiderTrade } from "@/lib/sec";
import type { Announcement } from "@/lib/news";
import type { RetailFlow } from "@/lib/retail";

type Company = { ticker: string; name: string | null; exchange: string | null };
const titleCase = (s: string) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
// [label, TradingView range, bar interval]
const RANGES: [string, string, string][] = [["1D", "1D", "5"], ["1M", "1M", "60"], ["6M", "6M", "D"], ["1Y", "12M", "D"], ["5Y", "60M", "W"]];
const day = (d: string, year = false) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}) });

export function StockView({ symbol }: { symbol: string }) {
  const [co, setCo] = useState<Company | null>(null);
  const [fund, setFund] = useState<Record<string, any> | null>(null);
  const [insiders, setInsiders] = useState<InsiderTrade[] | null>(null);
  const [news, setNews] = useState<Announcement[] | null>(null);
  const [flow, setFlow] = useState<RetailFlow | null | undefined>(undefined);
  const { has, toggle } = useWatchlist();
  const [range, setRange] = useState("1Y");
  const [tools, setTools] = useState(false);

  useEffect(() => {
    setCo(null); setFund(null); setInsiders(null); setNews(null); setFlow(undefined);
    fetch(`/api/company?symbol=${encodeURIComponent(symbol)}`).then((r) => r.json()).then(setCo).catch(() => setCo({ ticker: symbol, name: null, exchange: null }));
    fetch("/data/screener.json").then((r) => r.json()).then((d) => {
      const row = d.rows.find((r: any[]) => r[0] === symbol);
      if (row) setFund(Object.fromEntries(d.fields.map((f: string, i: number) => [f, row[i]])));
    }).catch(() => {});
    fetch(`/api/insiders?symbol=${encodeURIComponent(symbol)}`).then((r) => r.json()).then((d) => setInsiders(Array.isArray(d) ? d : [])).catch(() => setInsiders([]));
    fetch(`/api/news?symbol=${encodeURIComponent(symbol)}`).then((r) => r.json()).then((d) => setNews(d.announcements ?? [])).catch(() => setNews([]));
    fetch(`/api/retail?symbol=${encodeURIComponent(symbol)}`).then((r) => r.json()).then((d) => setFlow(d.flow)).catch(() => setFlow(null));
  }, [symbol]);

  const tv = co ? tvSymbol(symbol, co.exchange) : null;
  const stats: [string, string][] = fund ? [
    ["Revenue", "$" + fmtBig(fund.rev)], ["Net income", "$" + fmtBig(fund.ni)], ["Net margin", fmtPct(fund.margin, 1)], ["Revenue growth", fmtPct(fund.growth, 1)],
    ["Return on equity", fmtPct(fund.roe, 1)], ["Debt/equity", fund.de ?? "—"], ["Free cash flow", fund.fcf != null ? "$" + fmtBig(fund.fcf) : "—"], ["FCF margin", fmtPct(fund.fcfMargin, 1)],
    ["Dividends paid", fund.div ? "$" + fmtBig(fund.div) : fund.div === 0 ? "None" : "—"], ["Payout ratio", fund.payout != null ? `${fund.payout}%` : "—"],
  ] : [];

  return (
    <div className="stack">
      <section className="card">
        <div className="stock-head">
          <div>
            <h1>{co?.name ? titleCase(co.name) : symbol}</h1>
            <div className="muted">{symbol}{co?.exchange ? ` · ${co.exchange}` : ""}{fund?.sector ? ` · ${fund.sector}` : ""}</div>
          </div>
          <button className={`btn follow${has(symbol) ? " on" : ""}`} onClick={() => toggle(symbol)} aria-pressed={has(symbol)}>{has(symbol) ? "★ On your watchlist" : "☆ Add to watchlist"}</button>
        </div>
        <div className="chart-bar">
          <div className="seg">{RANGES.map(([l]) => <button key={l} className={range === l ? "on" : ""} onClick={() => setRange(l)}>{l}</button>)}</div>
          <button className="linkbtn" onClick={() => setTools(!tools)}>{tools ? "Simple chart" : "Indicators & compare"}</button>
        </div>
        {tv ? <TradingView key={`${tv}${range}${tools}`} widget="advanced-chart" height={tools ? 520 : 380} blend config={{
          symbol: tv, autosize: true, timezone: "America/New_York", allow_symbol_change: false, save_image: false, calendar: false,
          interval: RANGES.find(([l]) => l === range)![2], range: RANGES.find(([l]) => l === range)![1], style: tools ? "1" : "3",
          hide_top_toolbar: !tools, hide_side_toolbar: !tools, hide_legend: !tools, hide_volume: !tools, studies: [], support_host: "https://www.tradingview.com",
        }} label="Price chart by TradingView" /> : <div className="chart-skeleton" style={{ height: 380 }} />}
        <p className="muted small">Prices are delayed 15 minutes. Drag across the chart to see past prices.</p>
      </section>

      {fund ? (
        <section className="card">
          <h2>Fundamentals <span className="muted small">SEC filings</span></h2>
          <dl className="stats">{stats.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="mono">{v}</dd></div>)}</dl>
          <p className="muted small">{fund.basis}. Dividends and free cash flow cover the last fiscal year. Reported net income includes one-time gains and losses.</p>
          <details className="howto"><summary>What do these mean?</summary>
            <dl className="glossary small">
              <dt>Net margin</dt><dd>Profit as a share of sales: how many cents of each dollar of revenue the company keeps.</dd>
              <dt>Revenue growth</dt><dd>Sales compared with the same period a year earlier.</dd>
              <dt>Return on equity</dt><dd>Profit as a share of the shareholders&apos; money in the business. Above ~15% is generally strong.</dd>
              <dt>Debt/equity</dt><dd>Debt compared with shareholders&apos; equity. Above ~2 means heavily borrowed (normal for some industries).</dd>
              <dt>Free cash flow</dt><dd>Cash the business generates after paying for buildings and equipment: what&apos;s left for dividends, buybacks or debt.</dd>
              <dt>Payout ratio</dt><dd>Share of profit paid out as dividends. Above ~80% can be hard to sustain.</dd>
            </dl>
          </details>
        </section>
      ) : null}

      <div>
        <section className="card">
          <h2>Company announcements <span className="muted small">SEC 8-K filings</span></h2>
          {news === null ? <p className="muted">Loading…</p> : !news.length ? <p className="muted">No recent 8-K filings.</p> : (
            <ul className="news">{news.map((a) => (
              <li key={a.link}><a href={a.link} target="_blank" rel="noreferrer">{a.items.length ? a.items.join(" · ") : "Announcement"}</a><div className="muted small">{day(a.date, true)}</div></li>
            ))}</ul>
          )}
        </section>
      </div>

      <FundHolders symbol={symbol} />

      {flow ? (
        <section className="card">
          <h2>Retail trading <span className="muted small">FINRA, 2–4 weeks delayed</span></h2>
          <p className="small">
            Brokers like Robinhood, Schwab and Fidelity send most customer orders to a few wholesalers (Citadel Securities, Virtu, G1, Jane Street…), which fill them off-exchange.
            Their weekly volume is the best free gauge of retail trading. It shows how much retail-type trading happened, not whether it was buying or selling.
          </p>
          <div className="tablewrap">
            <table className="table compact">
              <thead><tr><th>Week of</th><th className="r">Wholesaler shares</th><th className="r">Share of off-exchange</th><th className="r">Trades</th><th className="r hide-sm">Avg size</th></tr></thead>
              <tbody>{flow.map((w) => (
                <tr key={w.week}><td>{day(w.week)}</td><td className="r mono">{fmtBig(w.shares)}</td><td className="r mono">{w.wholesalerSharePct == null ? "—" : `${w.wholesalerSharePct.toFixed(0)}%`}</td><td className="r mono">{fmtBig(w.trades)}</td><td className="r mono hide-sm">{w.avgTradeSize}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <p className="muted small">Source: FINRA OTC Transparency data. Provided for personal, non-commercial use; not for redistribution.</p>
        </section>
      ) : null}

      {insiders === null || insiders.length > 0 ? (
        <section className="card">
          <h2>Insider trades <span className="muted small">latest 25 SEC filings</span></h2>
          <p className="muted small">Executives and directors must report trades in their own company&apos;s stock within 2 business days. Buys by several insiders are the strongest signal; grants and option exercises are routine pay.</p>
          {insiders === null ? <p className="muted">Loading from SEC…</p> : <TradeList trades={insiders.map((t) => ({ ...t, filed: t.filed || t.date }))} showCompany={false} pageSize={12} />}
        </section>
      ) : null}
    </div>
  );
}
