import type { Metadata } from "next";
import { HoldingsView } from "./HoldingsView";

export const metadata: Metadata = {
  title: "Institutional holdings: companies and funds",
  description: "What NVIDIA, Amazon and other companies own in other public companies, and what Berkshire Hathaway, Bridgewater and other big funds hold and changed, from their SEC 13F, 13D and 13G filings.",
  openGraph: { title: "Institutional holdings · Arkanum Data", url: "/stakes", images: "/opengraph-image" },
  alternates: { canonical: "/stakes" },
};

export default function Stakes() { return <HoldingsView />; }
