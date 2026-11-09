"use client";
import { SectionIntro } from "@/components/SectionIntro";
import { Watchlist } from "@/components/Watchlist";
import { ComingUp } from "@/components/ComingUp";
import { MarketBoard } from "@/components/MarketBoard";
import { FollowingCard } from "@/components/FollowingCard";

export function MarketsView() {
  return (
    <div className="stack">
      <SectionIntro title="Markets and watchlist"
        lead="The main markets at a glance, insider and fund activity for the stocks you follow, people you follow, and the economic releases coming up."
        source="Prices by TradingView (stocks delayed 15 minutes); insider and fund activity from SEC filings; release dates from the Federal Reserve (FRED) and BLS."
        research={<>Insider activity on your watchlist carries the same evidence as everywhere else: unusual describes the trade, not the outlook.</>}
        researchHref="/research" />
      <MarketBoard />
      <Watchlist />
      <div className="twocol">
        <FollowingCard />
        <ComingUp />
      </div>
    </div>
  );
}
