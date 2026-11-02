// Options, analysts and retail interest for one symbol (stock page).
import { optionChain } from "@/lib/options";
import { analysts } from "@/lib/analysts";
import { redditInterest, retailFlow } from "@/lib/retail";

export const maxDuration = 30;

export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.toUpperCase();
  if (!symbol) return Response.json({ error: "symbol required" }, { status: 400 });
  const [o, a, r, f] = await Promise.allSettled([optionChain(symbol), analysts(symbol), redditInterest(symbol), retailFlow(symbol)]);
  const v = <T,>(x: PromiseSettledResult<T>) => (x.status === "fulfilled" ? x.value : null);
  return Response.json({ options: v(o), analysts: v(a), reddit: v(r), retailFlow: v(f) }, { headers: { "Cache-Control": "public, s-maxage=900" } });
}
