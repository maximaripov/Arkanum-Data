"use client";
import { TradingView } from "@/components/TradingView";
import { Watchlist } from "@/components/Watchlist";
import { InsiderHighlights } from "@/components/InsiderHighlights";
import { OVERVIEW_TABS, TICKER_TAPE } from "@/lib/markets";

export function MarketsView() {
  return (
    <div className="stack">
      <TradingView widget="ticker-tape" height={100} config={{ symbols: TICKER_TAPE, showSymbolLogo: true, displayMode: "adaptive" }} />
      <div className="twocol">
        <Watchlist />
        <InsiderHighlights />
      </div>
      <section className="card">
        <h2>Markets</h2>
        <TradingView widget="market-overview" height={560} config={{ width: "100%", height: "100%", dateRange: "1D", showChart: true, showSymbolLogo: true, showFloatingTooltip: false, tabs: OVERVIEW_TABS }} />
      </section>
    </div>
  );
}
