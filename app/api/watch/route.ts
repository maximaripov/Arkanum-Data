// Everything Arkanum knows about each watchlist stock, from its own data files:
// name and sector, recent insider buying and selling, and what tracked funds did.
import { cikForTicker } from "@/lib/sec";
import type { InsiderTrade } from "@/lib/sec";
import { isExecOrDirector } from "@/lib/insider";
import { loadInsiders } from "@/lib/insiderData";

type Holding = { t: string | null };
type Fund = { name: string; new: Holding[]; added: Holding[]; reduced: Holding[]; sold: Holding[] };

export type WatchItem = {
  t: string; name: string | null; sector: string | null; ind: string | null;
  growth: number | null; margin: number | null;
  insiders: { buys: number; buyValue: number; sells: number; sellValue: number; buyers: number };
  funds: { bought: string[]; sold: string[] };
};

export async function GET(req: Request) {
  const list = (new URL(req.url).searchParams.get("symbols") ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 60);
  if (!list.length) return Response.json([]);
  const get = (f: string) => fetch(new URL(`/data/${f}`, req.url), { next: { revalidate: 3600 } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const [sc, ins, fu] = await Promise.all([get("screener.json"), loadInsiders(new URL(req.url).origin, { next: { revalidate: 900 } }), get("funds.json")]);
  const rows = new Map<string, Record<string, any>>();
  if (sc) for (const r of sc.rows) rows.set(r[0], Object.fromEntries(sc.fields.map((f: string, i: number) => [f, r[i]])));
  const out: WatchItem[] = await Promise.all(list.map(async (t) => {
    const row = rows.get(t);
    const trades = ((ins?.trades ?? []) as InsiderTrade[]).filter((x) => x.symbol === t && isExecOrDirector(x));
    const buys = trades.filter((x) => x.code === "P"), sells = trades.filter((x) => x.code === "S");
    const sum = (a: InsiderTrade[]) => a.reduce((s, x) => s + (x.value ?? 0), 0);
    const funds = { bought: [] as string[], sold: [] as string[] };
    for (const f of (fu?.funds ?? []) as Fund[]) {
      if ([...f.new, ...f.added].some((h) => h.t === t)) funds.bought.push(f.name);
      else if ([...f.sold, ...f.reduced].some((h) => h.t === t)) funds.sold.push(f.name);
    }
    const name = row?.n ?? (await cikForTicker(t).catch(() => null))?.name ?? null;
    return {
      t, name, sector: row?.sector ?? null, ind: row?.ind ?? null, growth: row?.growth ?? null, margin: row?.margin ?? null,
      insiders: { buys: buys.length, buyValue: sum(buys), sells: sells.length, sellValue: sum(sells), buyers: new Set(buys.map((x) => x.owner)).size },
      funds,
    };
  }));
  return Response.json(out, { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } });
}
