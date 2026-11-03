import type { Metadata } from "next";
import { StockView } from "./StockView";
import { cikForTicker } from "@/lib/sec";

const titleCase = (s: string) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
const clean = (raw: string) => decodeURIComponent(raw).toUpperCase();

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const symbol = clean((await params).symbol);
  const co = await cikForTicker(symbol).catch(() => null);
  const name = co?.name ? titleCase(co.name) : null;
  const title = name ? `${symbol}: ${name} insider trades` : `${symbol} insider trades`;
  const description = `What ${name ?? symbol}'s executives and directors are buying and selling, which big funds hold it, and how the business is doing, from SEC filings.`;
  return { title, description, openGraph: { title: `${title} · Foresight`, description, url: `/stock/${encodeURIComponent(symbol)}` } };
}

export default async function Page({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return <StockView symbol={clean(symbol)} />;
}
