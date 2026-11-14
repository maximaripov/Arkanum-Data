import type { Metadata } from "next";
import InsidersView, { type Overview } from "../InsidersView";
import { readOverview } from "@/lib/siteData";
import { KindsLine } from "@/components/KindsLine";

export const metadata: Metadata = {
  title: "Insider trades",
  description: "Purchases and large sales by company executives and directors from their SEC filings, with group buys, well-known insiders and how trades like each have done.",
  alternates: { canonical: "/insiders" },
  openGraph: { title: "Insider trades · Arkanum Data", url: "/insiders", images: "/opengraph-image" },
};
// The overview lists are rendered here so the page arrives with them (crawlers included).
export const revalidate = 900;

async function overview(): Promise<Overview | null> {
  const d = await readOverview();
  return d?.totals ? (d as Overview) : null;
}

export default async function Insiders() {
  return (
    <div className="stack">
      <h1 className="home-dash-title">Insider trades <span className="muted small">company executives and directors, from SEC filings</span></h1>
      <KindsLine />
      <InsidersView initial={await overview()} />
    </div>
  );
}
