"use client";
import { Watchlist } from "@/components/Watchlist";
import { ComingUp } from "@/components/ComingUp";
import { MarketBoard } from "@/components/MarketBoard";
import { FollowingCard } from "@/components/FollowingCard";

export function MarketsView() {
  return (
    <div className="stack">
      <MarketBoard />
      <Watchlist />
      <div className="twocol">
        <FollowingCard />
        <ComingUp />
      </div>
    </div>
  );
}
