// Symbol search over SEC's list of US-listed companies.
import { searchCompanies } from "@/lib/sec";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return Response.json([]);
  try {
    const hits = await searchCompanies(q);
    return Response.json(hits.map((c) => ({ symbol: c.ticker, name: c.name, type: "Stock", exchange: c.exchange ?? "" })), { headers: { "Cache-Control": "public, s-maxage=3600" } });
  } catch {
    return Response.json([]);
  }
}
