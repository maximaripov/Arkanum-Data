import { announcementsCached } from "@/lib/secCached";
import { TICKER } from "@/lib/format";

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol || !TICKER.test(symbol)) return Response.json({ error: "symbol required" }, { status: 400 });
  const a = await announcementsCached(symbol).catch(() => []);
  return Response.json({ announcements: a }, { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } });
}
