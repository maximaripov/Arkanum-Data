// Earnings and dividends for up to 30 symbols (the Calendar page and stock pages).
import { dividends, earnings } from "@/lib/calendar";

export const maxDuration = 30;

export async function GET(req: Request) {
  const symbols = (new URL(req.url).searchParams.get("symbols") ?? "")
    .split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 30);
  if (!symbols.length) return Response.json({});
  // Dividends already declared, from the 4 PM data refresh.
  const declared = await fetch(new URL("/data/dividends.json", req.url), { next: { revalidate: 3600 } })
    .then((r) => (r.ok ? r.json() : null)).then((d) => d?.rows ?? {}).catch(() => ({}));
  const out: Record<string, unknown> = {};
  await Promise.all(symbols.map(async (s) => {
    const [e, d] = await Promise.all([earnings(s), dividends(s, declared)]);
    out[s] = { earnings: e, dividends: d };
  }));
  return Response.json(out, { headers: { "Cache-Control": "public, s-maxage=1800" } });
}
