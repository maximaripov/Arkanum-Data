import type { Metadata } from "next";
import { StakesView } from "@/components/StakesView";

export const metadata: Metadata = {
  title: "Company stakes",
  description: "What NVIDIA, Amazon, Alphabet and other companies own in other public companies, from their SEC filings: quarterly holdings and 5%+ stakes.",
  openGraph: { title: "Company stakes · Arkanum Data", url: "/stakes", images: "/opengraph-image" },
  alternates: { canonical: "/stakes" },
};

export default function Stakes() { return <StakesView />; }
