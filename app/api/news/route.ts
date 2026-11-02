import { announcements } from "@/lib/news";

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol");
  if (!symbol) return Response.json({ error: "symbol required" }, { status: 400 });
  const a = await announcements(symbol).catch(() => []);
  return Response.json({ announcements: a }, { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } });
}
