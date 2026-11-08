// Congress stock trades for one stock (?symbol=), from the full
// two-year file the daily job writes (public/data/congress.json), so pages don't download it.
type Trade = { member: string; party: string | null; state: string; district: number; filed: string; date: string; owner: string; ticker: string | null; asset: string; assetType: string | null; type: string; partial: boolean; min: number | null; max: number | null; url: string; dateUnclear?: boolean };

export async function GET(req: Request) {
  const u = new URL(req.url);
  const symbol = u.searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) return Response.json({ trades: [] });
  const r = await fetch(new URL("/data/congress.json", req.url), { next: { revalidate: 3600 } });
  if (!r.ok) return Response.json({ trades: [] });
  const { trades } = (await r.json()) as { trades: Trade[] };
  const hit = trades.filter((t) => t.ticker && t.type !== "E" && t.ticker === symbol).slice(0, 30);
  const slim = hit.map((t) => ({ m: t.member, p: t.party?.[0] ?? null, sd: `${t.state}${t.district ? "-" + t.district : ""}`, f: t.filed, d: t.date, o: t.owner, t: t.ticker, a: t.asset, y: t.type, x: t.partial || undefined, du: t.dateUnclear || undefined, lo: t.min, hi: t.max, u: t.url }));
  return Response.json({ trades: slim }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
