"use client";
import { useEffect, useState } from "react";
import { TradingView } from "@/components/TradingView";
import { InsiderTable } from "@/components/InsiderTable";
import { FundHolders } from "@/components/FundsView";
import { useWatchlist } from "@/components/useWatchlist";
import { fmtBig, fmtPct } from "@/lib/format";
import { tvSymbol } from "@/lib/tv";
import type { InsiderTrade } from "@/lib/sec";
import type { Announcement } from "@/lib/news";
import type { RetailFlow } from "@/lib/retail";

type Company = { ticker: string; name: string | null; exchange: string | null };
const day = (d: string, year = false) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}) });

export function StockView({ symbol }: { symbol: string }) {
  const [co, setCo] = useState<Company | null>(null);
  const [fund, setFund] = useState<Record<string, any> | null>(null);
  const [insiders, setInsiders] = useState<InsiderTrade[] | null>(null);
  const [news, setNews] = useState<Announcement[] | null>(null);
  const [flow, setFlow] = useState<RetailFlow | null | undefined>(undefined);
  const { has, toggle } = useWatchlist();

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
        <div className="head">
          <div>
            <h1>{symbol} <button className={`star ${has(symbol) ? "on" : ""}`} onClick={() => toggle(symbol)} aria-label="Toggle watchlist">{has(symbol) ? "★" : "☆"}</button></h1>
            <div className="muted">{co?.name ?? ""}{co?.exchange ? ` · ${co.exchange}` : ""}</div>
            {fund?.sector ? <div className="muted small">{fund.sector}{fund.ind ? ` · ${fund.ind}` : ""}</div> : null}
          </div>
        </div>
        {tv ? <TradingView widget="symbol-info" height={190} config={{ symbol: tv, width: "100%" }} /> : null}
      </section>

      <section className="card">
        {tv ? <TradingView widget="advanced-chart" height={520} config={{
          symbol: tv, autosize: true, interval: "D", timezone: "America/New_York", style: "1", allow_symbol_change: false,
          hide_side_toolbar: false, studies: [], support_host: "https://www.tradingview.com",
        }} label="Chart by TradingView" /> : <p className="muted">Loading chart…</p>}
        <p className="muted small">Stock prices are delayed 15 minutes. Use the chart&apos;s Indicators button for moving averages, RSI and more, and Compare to add other symbols.</p>
      </section>

      {fund ? (
        <section className="card">
          <h2>Fundamentals <span className="muted small">SEC filings</span></h2>
          <dl className="stats">{stats.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="mono">{v}</dd></div>)}</dl>
          <p className="muted small">{fund.basis}. Dividends and free cash flow cover the last fiscal year. Reported net income includes one-time gains and losses.</p>
        </section>
      ) : null}

      <div className="twocol">
        <section className="card">
          <h2>Company announcements <span className="muted small">SEC 8-K filings</span></h2>
          {news === null ? <p className="muted">Loading…</p> : !news.length ? <p className="muted">No recent 8-K filings.</p> : (
            <ul className="news">{news.map((a) => (
              <li key={a.link}><a href={a.link} target="_blank" rel="noreferrer">{a.items.length ? a.items.join(" · ") : "Announcement"}</a><div className="muted small">{day(a.date, true)}</div></li>
            ))}</ul>
          )}
        </section>
        {tv ? (
          <section className="card">
            <h2>Headlines</h2>
            <TradingView widget="timeline" height={460} config={{ feedMode: "symbol", symbol: tv, displayMode: "regular", width: "100%", height: "100%" }} label="News by TradingView" />
          </section>
        ) : null}
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
          <h2>Insider transactions <span className="muted small">SEC Form 4, latest 25 filings</span></h2>
          {insiders === null ? <p className="muted">Loading from SEC…</p> : <InsiderTable trades={insiders} />}
        </section>
      ) : null}
    </div>
  );
}
