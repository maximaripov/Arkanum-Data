// Live SEC lookups for stock and insider pages, cached as their parsed result only. Inside
// unstable_cache, Next doesn't store the individual fetches (it treats them as no-store), so
// Vercel's runtime cache keeps a few KB of trades per stock or insider instead of SEC's raw
// filing lists (often hundreds of KB) and 25 Form 4 files each. That matters because every
// page a crawler opens for the first time used to write all of them, and its free writes are
// limited. Revalidation times match the pages'.
import { unstable_cache } from "next/cache";
import { insidersForTicker, insiderTradesByOwner } from "./sec";
import { announcements, pressHeadline, type Announcement } from "./news";

export const insidersForTickerCached = unstable_cache(async (symbol: string) => insidersForTicker(symbol), ["sec-insiders-for-ticker-v1"], { revalidate: 1800 });
export const insiderTradesByOwnerCached = unstable_cache(async (cik: string) => insiderTradesByOwner(cik), ["sec-trades-by-owner-v1"], { revalidate: 3600 });
// A filing never changes, so each press-release headline is stored once, for good (a few
// dozen bytes). Only "no headline" is cached; a network error throws and is retried next time.
const headlineCached = unstable_cache(async (link: string) => pressHeadline(link), ["press-headline-v1"], { revalidate: false });
/** The newest 8-Ks with their press-release headlines (the latest four; older ones keep their
 * item labels only, to keep the first visit to a stock page quick). */
export const announcementsCached = unstable_cache(async (symbol: string): Promise<Announcement[]> => {
  const list = await announcements(symbol);
  // At most 8 seconds for all headlines together: a page never waits on SEC longer than that.
  const within = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
  return Promise.all(list.map(async (a, i) => (i < 4 ? { ...a, headline: await within(headlineCached(a.link), 8000).catch(() => null) } : a)));
}, ["sec-announcements-v2"], { revalidate: 1800 });
