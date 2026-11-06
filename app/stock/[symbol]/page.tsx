import type { Metadata } from "next";
import { StockView, type StockInitial } from "./StockView";
import { cikForTicker, insidersForTicker } from "@/lib/sec";
import { announcements } from "@/lib/news";
import { withConviction } from "@/lib/conviction.mjs";
import { loadInsiders, withHistory } from "@/lib/insiderData";
import { companyName } from "@/lib/people.mjs";

// Rebuilt at most every 30 minutes: the page arrives with its insider trades, fundamentals
// and announcements already in it, so visitors see them at once and search engines can read them.
export const revalidate = 1800;
const SITE = "https://form4-insiders.vercel.app";

const titleCase = (s: string, sym?: string | null) => companyName(s, sym);
const clean = (raw: string) => decodeURIComponent(raw).toUpperCase();

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const symbol = clean((await params).symbol);
  const co = await cikForTicker(symbol).catch(() => null);
  const name = co?.name ? titleCase(co.name, symbol) : null;
  const title = name ? `${symbol}: ${name} insider trades` : `${symbol} insider trades`;
  const description = `What ${name ?? symbol}'s executives and directors are buying and selling, which big funds hold it, and how the business is doing, from SEC filings.`;
  return { title, description, alternates: { canonical: `/stock/${encodeURIComponent(symbol)}` }, openGraph: { title: `${title} · Arkanum Data`, description, url: `/stock/${encodeURIComponent(symbol)}` } };
}

async function load(symbol: string): Promise<StockInitial> {
  const quiet = <T,>(p: Promise<T>) => p.catch(() => null);
  const [c, ins, news, sc, site] = await Promise.all([
    quiet(cikForTicker(symbol)),
    quiet(insidersForTicker(symbol)),
    quiet(announcements(symbol)),
    quiet(fetch(`${SITE}/data/screener.json`, { next: { revalidate: 3600 } }).then((r) => (r.ok ? r.json() : null))),
    quiet(loadInsiders(SITE, { next: { revalidate: 1800 } })),
  ]);
  const row = sc?.rows?.find((r: unknown[]) => r[0] === symbol);
  return {
    co: c ? { ticker: symbol, name: c.name, exchange: c.exchange } : null,
    fund: row ? Object.fromEntries(sc.fields.map((f: string, i: number) => [f, row[i]])) : null,
    insiders: ins ? withConviction(withHistory(ins, site)) : null,
    news,
  };
}

export default async function Page({ params }: { params: Promise<{ symbol: string }> }) {
  const symbol = clean((await params).symbol);
  return <StockView symbol={symbol} initial={await load(symbol)} />;
}
