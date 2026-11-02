import { insidersForTicker, latestInsiders } from "@/lib/sec";

export const maxDuration = 60;

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol");
  try {
    const trades = symbol ? await insidersForTicker(symbol) : await latestInsiders();
    return Response.json(trades, { headers: { "Cache-Control": `public, s-maxage=${symbol ? 900 : 600}` } });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
