import { getQuotes } from "@/lib/yahoo";

export async function GET(req: Request) {
  const symbols = (new URL(req.url).searchParams.get("symbols") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100);
  if (!symbols.length) return Response.json([]);
  try {
    return Response.json(await getQuotes(symbols), { headers: { "Cache-Control": "public, s-maxage=5" } });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
