import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stock screener",
  description: "Find US companies by growth, profit margins, debt and cash flow, from their SEC filings.",
  openGraph: { title: "Stock screener · Form4", description: "Find US companies by growth, profit margins, debt and cash flow, from their SEC filings.", url: "/screener" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
