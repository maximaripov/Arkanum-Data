"use client";
import { Watchlist } from "@/components/Watchlist";
import { ComingUp } from "@/components/ComingUp";
import { StocksTable } from "@/components/StocksTable";
import { FollowingCard } from "@/components/FollowingCard";

export function MarketsView() {
  return (
    <div className="stack">
      <StocksTable />
      <Watchlist />
      <div className="twocol">
        <FollowingCard />
        <ComingUp />
      </div>
    </div>
  );
}
