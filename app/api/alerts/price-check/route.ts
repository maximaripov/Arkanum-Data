// For the owner's diagnostic job only (scripts/diagnose/price-fallback.mjs): proves the Tiingo
// price fallback works on Vercel by asking for SPY's closes with Yahoo made to fail. Returns
// whether the key is set and how many rows came back, never the key itself.
import { dailyCloses } from "@/lib/returns.mjs";
import { secretOk } from "@/lib/alerts";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await secretOk(req))) return Response.json({ error: "unauthorized" }, { status: 401 });
  const yahooDown = (u: RequestInfo | URL, o?: RequestInit) => (/yahoo/.test(String(u)) ? Promise.resolve(new Response(null, { status: 503 })) : fetch(u, o));
  const s = await dailyCloses("SPY", "2026-10-01", { fetchImpl: yahooDown as typeof fetch, init: { cache: "no-store" } });
  return Response.json({ keySet: !!process.env.TIINGO_API_KEY, rows: s?.length ?? null, last: s?.at(-1) ?? null }, { headers: { "Cache-Control": "no-store" } });
}
