import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StockView, type StockInitial } from "./StockView";
import { cikForTicker, insidersForTicker } from "@/lib/sec";
import { announcements } from "@/lib/news";
import { withConviction } from "@/lib/conviction.mjs";
import { withHistory } from "@/lib/insiderData";
import { readInsiders, readScreener } from "@/lib/siteData";
import { companyName } from "@/lib/people.mjs";

// Rebuilt at most every 30 minutes: the page arrives with its insider trades, fundamentals
// and announcements already in it, so visitors see them at once and search engines can read them.
export const revalidate = 1800;
// Returning [] builds each stock page on its first visit and caches it (without it, Next
// rebuilt the page on every visit). Missing pieces still load in the browser.
export async function generateStaticParams() { return []; }
const SITE = "https://arkanumdata.vercel.app";

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

async function load(symbol: string): Promise<{ initial: StockInitial; known: boolean }> {
  const quiet = <T,>(p: Promise<T>) => p.catch(() => null);
  const [c, ins, news, sc, site] = await Promise.all([
    cikForTicker(symbol).catch(() => undefined), // null: SEC doesn't list it; undefined: SEC couldn't be reached
    quiet(insidersForTicker(symbol)),
    quiet(announcements(symbol)),
    readScreener(),
    readInsiders(),
  ]);
  const row = sc?.rows?.find((r: unknown[]) => r[0] === symbol);
  // A ticker SEC doesn't list and the site has no data for is not a stock page.
  // (If SEC couldn't be reached we can't tell, so the page loads and fills in from the browser.)
  const extra = c === null && !row ? await fetch(`${SITE}/data/known-tickers.json`, { next: { revalidate: 3600 } }).then((r) => (r.ok ? r.json() : null)).catch(() => null) : null;
  // ETFs and funds (QQQ) in fund holdings or Congress trades aren't in SEC's company list but are linked
  // from the site; if that list can't be read, assume the ticker is real.
  const known = c !== null || !!row || !!site?.trades?.some((t: { symbol: string }) => t.symbol === symbol)
    || !extra || (extra.tickers as string[]).includes(symbol);
  return { known, initial: {
    co: c ? { ticker: symbol, name: c.name, exchange: c.exchange } : null,
    fund: row ? Object.fromEntries(sc.fields.map((f: string, i: number) => [f, row[i]])) : null,
    insiders: ins ? withConviction(withHistory(ins, site)) : null,
    news,
  } };
}

export default async function Page({ params }: { params: Promise<{ symbol: string }> }) {
  const symbol = clean((await params).symbol);
  const { initial, known } = await load(symbol);
  if (!known) notFound();
  return <StockView symbol={symbol} initial={initial} />;
}
