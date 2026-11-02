"use client";
import { Watchlist } from "@/components/Watchlist";
import { InsiderHighlights } from "@/components/InsiderHighlights";
import { ComingUp } from "@/components/ComingUp";
import { MarketBoard } from "@/components/MarketBoard";

export function MarketsView() {
  return (
    <div className="stack">
      <MarketBoard />
      <Watchlist />
      <div className="twocol wide-left">
        <InsiderHighlights />
        <ComingUp />
      </div>
    </div>
  );
}
