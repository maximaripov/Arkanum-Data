// The insider trades the site shows: the 30-day file (rebuilt nightly) plus today's file
// (refreshed hourly), merged and scored for conviction.
import type { InsiderTrade } from "./sec";
import { mergeInsiders as merge } from "./insiderMerge.mjs";

export type InsiderData = { trades: InsiderTrade[]; days: string[]; updated: string | null };
export const mergeInsiders = merge as (main: unknown, today: unknown) => InsiderData;

/** In the browser (base "") or on the server (base = site URL). */
export async function loadInsiders(base = "", init?: RequestInit & { next?: { revalidate: number } }): Promise<InsiderData> {
  const get = (f: string) => fetch(`${base}/data/${f}`, init).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const [main, today] = await Promise.all([get("insiders.json"), get("insiders-today.json")]);
  return mergeInsiders(main, today);
}

/** Copies the "first buy in N years" lookups from the site's data onto trades read live from SEC. */
export function withHistory<T extends InsiderTrade>(trades: T[], data: InsiderData | null): T[] {
  if (!data) return trades;
  const known = new Map(data.trades.filter((t) => "prevBuy" in t).map((t) => [t.accession + t.code, t]));
  return trades.map((t) => {
    const k = known.get(t.accession + t.code);
    return k ? { ...t, prevBuy: k.prevBuy, prevBuyYears: k.prevBuyYears } : t;
  });
}
