import type { Metadata } from "next";
import { CongressView, type Overview } from "@/components/CongressView";
import { readCongressOverview } from "@/lib/siteData";

export const metadata: Metadata = {
  title: "Congress trades (House)",
  description: "What members of the House are buying and selling, from their STOCK Act reports: latest trades, most-bought stocks and every member's trades.",
  openGraph: { title: "Congress trades (House) · Arkanum Data", url: "/congress", images: "/opengraph-image" },
  alternates: { canonical: "/congress" },
};

// Rendered on the server and refreshed at most hourly (the data changes once a day).
export const revalidate = 3600;

export default async function Congress() {
  const initial = (await readCongressOverview()) as Overview | null;
  return <CongressView initial={initial} />;
}
