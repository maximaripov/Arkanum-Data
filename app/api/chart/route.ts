import { getChart } from "@/lib/yahoo";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const symbol = p.get("symbol");
  if (!symbol) return Response.json({ error: "symbol required" }, { status: 400 });
  try {
    return Response.json(await getChart(symbol, p.get("range") ?? "1y"));
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
