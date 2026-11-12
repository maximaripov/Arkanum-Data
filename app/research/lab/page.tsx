import type { Metadata } from "next";
import { LabView } from "./LabView";

const title = "Research lab: test an insider-buying strategy";
const description = "Choose which insider purchases to follow (CEOs only, 3+ insiders buying, $100K+, no pre-planned trades, company size) and see how every matching purchase did against the S&P 500, 2023 to 2025 and since January 2026.";
export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "/research/lab" },
  openGraph: { title: `${title} · Arkanum Data`, description, url: "/research/lab", images: "/opengraph-image" },
};

export default function Lab() { return <LabView />; }
