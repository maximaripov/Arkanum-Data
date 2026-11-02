import { announcements, headlines } from "@/lib/news";

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol");
  if (!symbol) return Response.json({ error: "symbol required" }, { status: 400 });
  const [h, a] = await Promise.allSettled([headlines(symbol), announcements(symbol)]);
  return Response.json(
    { headlines: h.status === "fulfilled" ? h.value : [], announcements: a.status === "fulfilled" ? a.value : [] },
    { headers: { "Cache-Control": "public, s-maxage=600" } }
  );
}
