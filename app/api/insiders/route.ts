import { latestInsiders } from "@/lib/sec";
import { insidersForTickerCached } from "@/lib/secCached";
import { withConviction } from "@/lib/conviction.mjs";

export const maxDuration = 60;

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol");
  try {
    const trades = withConviction(symbol ? await insidersForTickerCached(symbol.toUpperCase()) : await latestInsiders());
    return Response.json(trades, { headers: { "Cache-Control": `public, s-maxage=${symbol ? 1800 : 600}, stale-while-revalidate=3600` } });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
