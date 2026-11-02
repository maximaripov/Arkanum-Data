// The latest public daily digest (market-wide insider buys, fund moves, events).
import { readDigest } from "@/lib/alerts";

export async function GET() {
  return Response.json((await readDigest()) ?? { empty: true }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } });
}
