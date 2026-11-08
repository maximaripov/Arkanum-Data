import type { Metadata } from "next";
import { MarketsView } from "../MarketsView";

export const metadata: Metadata = {
  title: "Markets and watchlist",
  description: "S&P 500, Nasdaq 100, bitcoin, gold and the 10-year yield, plus insider and fund activity for the stocks you follow.",
  openGraph: { title: "Markets and watchlist · Arkanum Data", url: "/markets", images: "/opengraph-image" },
  alternates: { canonical: "/markets" },
};

export default function Markets() { return <MarketsView />; }
