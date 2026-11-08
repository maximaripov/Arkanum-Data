"use client";
import { useEffect, useState } from "react";
import { TradingView } from "@/components/TradingView";
import { TradeList } from "@/components/TradeList";
import { InsiderStrip } from "@/components/InsiderStrip";
import { HBars } from "@/components/Bars";
import { isExecOrDirector } from "@/lib/insider";
import { FundHolders } from "@/components/FundsView";
import { StakeHolders } from "@/components/StakesView";
import { CongressFor } from "@/components/CongressView";
import { useWatchlist } from "@/components/useWatchlist";
import { fmtBig, fmtPct } from "@/lib/format";
import { tvSymbol } from "@/lib/tv";
import type { InsiderTrade } from "@/lib/sec";
import type { Announcement } from "@/lib/news";
import { companyName } from "@/lib/people.mjs";

type Company = { ticker: string; name: string | null; exchange: string | null };
const titleCase = (s: string, sym?: string | null) => companyName(s, sym);
// [label, TradingView range, bar interval]
const RANGES: [string, string, string][] = [["1D", "1D", "5"], ["1M", "1M", "60"], ["6M", "6M", "D"], ["1Y", "12M", "D"], ["5Y", "60M", "W"]];
const day = (d: string, year = false) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}) });

/** Data the server already loaded (so the page arrives filled in and search engines can read it). */
export type StockInitial = { co: Company | null; fund: Record<string, any> | null; insiders: InsiderTrade[] | null; news: Announcement[] | null };

/** True when the figures' period ended more than 15 months ago ("Fiscal year to Dec 2023"). */
const staleBasis = (basis?: string | null) => {
  const m = /to (\w{3}) (\d{4})/.exec(basis ?? "");
  return !!m && Date.parse(`1 ${m[1]} ${m[2]}`) < Date.now() - 456 * 86_400_000;
};

export function StockView({ symbol, initial }: { symbol: string; initial?: StockInitial }) {
  const [co, setCo] = useState<Company | null>(initial?.co ?? null);
  const [fund, setFund] = useState<Record<string, any> | null>(initial?.fund ?? null);
  const [insiders, setInsiders] = useState<InsiderTrade[] | null>(initial?.insiders ?? null);
  const [news, setNews] = useState<Announcement[] | null>(initial?.news ?? null);
  const { has, toggle } = useWatchlist();
  const [range, setRange] = useState("1Y");
  const [tools, setTools] = useState(false);

  useEffect(() => {
    // Anything the server couldn't load is fetched here instead.
    if (!initial?.co) fetch(`/api/company?symbol=${encodeURIComponent(symbol)}`).then((r) => r.json()).then(setCo).catch(() => setCo({ ticker: symbol, name: null, exchange: null }));
    if (!initial?.fund) fetch("/data/screener.json").then((r) => r.json()).then((d) => {
      const row = d.rows.find((r: any[]) => r[0] === symbol);
      if (row) setFund(Object.fromEntries(d.fields.map((f: string, i: number) => [f, row[i]])));
    }).catch(() => {});
    if (!initial?.insiders) fetch(`/api/insiders?symbol=${encodeURIComponent(symbol)}`).then((r) => r.json()).then((d) => setInsiders(Array.isArray(d) ? d : [])).catch(() => setInsiders([]));
    if (!initial?.news) fetch(`/api/news?symbol=${encodeURIComponent(symbol)}`).then((r) => r.json()).then((d) => setNews(d.announcements ?? [])).catch(() => setNews([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <h1>{co?.name ? titleCase(co.name, symbol) : symbol}</h1>
            <div className="muted">{symbol}{co?.exchange ? ` · ${co.exchange}` : ""}{fund?.sector ? ` · ${fund.sector}` : ""} · insider trades, fund holdings and fundamentals</div>
          </div>
          <button className={`btn follow${has(symbol) ? " on" : ""}`} onClick={() => toggle(symbol)} aria-pressed={has(symbol)}>{has(symbol) ? "On your watchlist" : "Add to watchlist"}</button>
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
        <InsiderStrip trades={insiders} range={range} />
        <p className="muted small">Prices are delayed 15 minutes. Drag across the chart to see past prices.</p>
      </section>

      {fund ? (
        <section className="card">
          <h2>Fundamentals <span className="muted small">SEC filings</span></h2>
          <dl className="stats">{stats.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="mono">{v}</dd></div>)}</dl>
          <p className="muted small">{fund.basis}. Dividends and free cash flow cover the last fiscal year. Reported net income includes one-time gains and losses.{staleBasis(fund.basis) ? <> <strong>These are over a year old: the newest figures in SEC&apos;s data for this company.</strong></> : null}</p>
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

      <CongressFor symbol={symbol} />
      <StakeHolders symbol={symbol} />
      <FundHolders symbol={symbol} />

      {insiders === null || insiders.length > 0 ? (
        <section className="card">
          <h2>Insider trades <span className="muted small">latest 25 SEC filings</span></h2>
          <p className="muted small">Executives and directors must report trades in their own company&apos;s stock within 2 business days. Grants and option exercises are routine pay and left out.</p>
          {insiders?.length ? (() => {
            const ex = insiders.filter(isExecOrDirector);
            const sum = (code: string) => ex.filter((t) => t.code === code).reduce((a, t) => a + (t.value ?? 0), 0);
            const b = sum("P"), sd = sum("S");
            return b || sd ? <HBars rows={[
              { key: "b", label: <strong>Bought</strong>, sub: `${ex.filter((t) => t.code === "P").length} trades`, value: b, text: `$${fmtBig(b)}`, tone: "up" },
              { key: "s", label: <strong>Sold</strong>, sub: `${ex.filter((t) => t.code === "S").length} trades`, value: sd, text: `$${fmtBig(sd)}`, tone: "down" },
            ]} /> : null;
          })() : null}
          {insiders === null ? <p className="muted">Loading from SEC…</p> : <TradeList trades={insiders.map((t) => ({ ...t, filed: t.filed || t.date }))} showCompany={false} pageSize={12} />}
        </section>
      ) : null}
    </div>
  );
}
