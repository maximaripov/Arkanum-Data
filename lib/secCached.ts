// Live SEC lookups for stock and insider pages, cached as their parsed result only. Inside
// unstable_cache, Next doesn't store the individual fetches (it treats them as no-store), so
// Vercel's runtime cache keeps a few KB of trades per stock or insider instead of SEC's raw
// filing lists (often hundreds of KB) and 25 Form 4 files each. That matters because every
// page a crawler opens for the first time used to write all of them, and its free writes are
// limited. Revalidation times match the pages'.
import { unstable_cache } from "next/cache";
import { insidersForTicker, insiderTradesByOwner } from "./sec";
import { announcements } from "./news";

export const insidersForTickerCached = unstable_cache(async (symbol: string) => insidersForTicker(symbol), ["sec-insiders-for-ticker-v1"], { revalidate: 1800 });
export const insiderTradesByOwnerCached = unstable_cache(async (cik: string) => insiderTradesByOwner(cik), ["sec-trades-by-owner-v1"], { revalidate: 3600 });
export const announcementsCached = unstable_cache(async (symbol: string) => announcements(symbol), ["sec-announcements-v1"], { revalidate: 1800 });
