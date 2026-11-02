// Weekly retail-wholesaler volume for one symbol (FINRA, credited on the page).
import { retailFlow } from "@/lib/retail";

export const maxDuration = 30;

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.toUpperCase();
  if (!symbol) return Response.json({ error: "symbol required" }, { status: 400 });
  const f = await retailFlow(symbol).catch(() => null);
  return Response.json({ flow: f }, { headers: { "Cache-Control": "public, s-maxage=43200" } });
}
