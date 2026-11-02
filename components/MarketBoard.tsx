"use client";
// The markets strip, in this order: S&P 500, Nasdaq 100, bitcoin, gold, 10-year Treasury yield,
// as TradingView mini quotes (index and stock prices are licensed for display; TradingView
// covers that). useMarkets/WeekSummary serve the Digest page from lib/macro.ts.
import { useEffect, useMemo, useState } from "react";
import { TradingView } from "./TradingView";
import type { Group } from "@/lib/macro";
import { weekSummary } from "@/lib/macroFormat";

const STRIP = ["FOREXCOM:SPXUSD", "FOREXCOM:NSXUSD", "BITSTAMP:BTCUSD", "TVC:GOLD", "FRED:DGS10"]; // free widgets can't show TVC:US10Y, so the 10-year is TradingView's (daily) copy of FRED

export function useMarkets() {
  const [groups, setGroups] = useState<Group[] | null>(null);
  useEffect(() => {
    let stop = false;
    fetch("/api/markets").then((r) => r.json()).then((d) => { if (!stop) setGroups(d.groups ?? []); }).catch(() => { if (!stop) setGroups([]); });
    return () => { stop = true; };
  }, []);
  return groups;
}

export function WeekSummary({ groups }: { groups: Group[] | null }) {
  const lines = useMemo(() => (groups ? weekSummary(groups) : []), [groups]);
  if (!lines.length) return null;
  return <ul className="weeksum">{lines.map((l) => <li key={l}>{l}</li>)}</ul>;
}

export function MarketBoard() {
  return (
    <section className="card">
      <div className="card-head"><h2>Markets</h2><span className="muted small">S&amp;P 500 · Nasdaq 100 · Bitcoin · Gold · 10-year yield</span></div>
      <div className="mstrip">
        {STRIP.map((symbol) => (
          <div key={symbol} className="mcard tvq">
            <TradingView widget="mini-symbol-overview" height={130} config={{ symbol, width: "100%", height: "100%", dateRange: "1M", isTransparent: true, chartOnly: false, noTimeScale: true }} label="TradingView" />
          </div>
        ))}
      </div>
    </section>
  );
}
