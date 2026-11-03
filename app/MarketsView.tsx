"use client";
import { Watchlist } from "@/components/Watchlist";
import { ComingUp } from "@/components/ComingUp";
import { MarketBoard } from "@/components/MarketBoard";

export function MarketsView() {
  return (
    <div className="stack">
      <MarketBoard />
      <Watchlist />
      <ComingUp />
    </div>
  );
}
