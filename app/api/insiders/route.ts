import { latestInsiders } from "@/lib/sec";
import { insidersForTickerCached } from "@/lib/secCached";
import { withConviction } from "@/lib/conviction.mjs";
import { TICKER } from "@/lib/format";

export const maxDuration = 60;

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase() || null;
  // A ticker or nothing: anything else would only create a cache entry for a lookup that fails.
  if (symbol && !TICKER.test(symbol)) return Response.json({ error: "Not a ticker" }, { status: 400 });
  try {
    const trades = withConviction(symbol ? await insidersForTickerCached(symbol) : await latestInsiders());
    return Response.json(trades, { headers: { "Cache-Control": `public, s-maxage=${symbol ? 1800 : 600}, stale-while-revalidate=3600` } });
  } catch (e) {
    console.error("insiders", symbol, e); // details stay in the logs, not in the response
    return Response.json({ error: "SEC data is unavailable right now" }, { status: 502 });
  }
}
