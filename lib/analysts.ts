// Wall Street analyst consensus from Nasdaq (data from Zacks): rating, buy/hold/sell
// counts, price targets, and how the consensus has moved month by month.
import { nasdaq, num } from "./nasdaq";

export type Analysts = {
  rating: string | null; analysts: number | null;
  buy: number | null; hold: number | null; sell: number | null;
  target: number | null; low: number | null; high: number | null;
  history: { date: string; buy: number; hold: number; sell: number; target: number | null }[];
};

export async function analysts(symbol: string): Promise<Analysts | null> {
  if (/[=^]|-USD$/.test(symbol)) return null;
  const s = encodeURIComponent(symbol);
  const [t, r] = await Promise.all([nasdaq(`/analyst/${s}/targetprice`, 21600), nasdaq(`/analyst/${s}/ratings`, 21600)]);
  const o = t?.consensusOverview;
  if (!o && !r?.meanRatingType) return null;
  const history = (t?.historicalConsensus ?? []).map((h: any) => {
    const [m, d, y] = String(h.z?.date ?? "").split("/");
    return { date: y ? `${y}-${m}-${d}` : "", buy: h.z?.buy ?? 0, hold: h.z?.hold ?? 0, sell: h.z?.sell ?? 0, target: num(h.y) };
  }).filter((h: any) => h.date);
  return {
    rating: r?.meanRatingType ?? null,
    analysts: num(String(r?.ratingsSummary ?? "").match(/Based on (\d+)/)?.[1]),
    buy: o?.buy ?? null, hold: o?.hold ?? null, sell: o?.sell ?? null,
    target: num(o?.priceTarget), low: num(o?.lowPriceTarget), high: num(o?.highPriceTarget),
    history,
  };
}
