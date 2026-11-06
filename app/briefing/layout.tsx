import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily digest",
  description: "Each weekday's insider buys, fund moves and market summary, with optional phone notifications.",
  openGraph: { title: "Daily digest · Arkanum", description: "Each weekday's insider buys, fund moves and market summary, with optional phone notifications.", url: "/briefing" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
