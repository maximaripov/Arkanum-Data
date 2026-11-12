import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Daily digest", template: "%s · Arkanum Data" }, // a plain string would drop the site name from /briefing/archive and dated digests
  description: "Each weekday's insider buys, fund moves and market summary, with optional phone notifications.",
  openGraph: { title: "Daily digest · Arkanum Data", description: "Each weekday's insider buys, fund moves and market summary, with optional phone notifications.", url: "/briefing", images: "/opengraph-image" },
  alternates: { canonical: "/briefing" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
