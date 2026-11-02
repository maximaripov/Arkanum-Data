// Name and exchange for one or more tickers (stock page header, TradingView symbols).
import { cikForTicker } from "@/lib/sec";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const list = (p.get("symbols") ?? p.get("symbol") ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 60);
  if (!list.length) return Response.json({ error: "symbol required" }, { status: 400 });
  const out = await Promise.all(list.map(async (t) => (await cikForTicker(t).catch(() => null)) ?? { ticker: t, name: null, exchange: null, cik: null }));
  return Response.json(p.get("symbols") ? out : out[0], { headers: { "Cache-Control": "public, s-maxage=86400" } });
}
