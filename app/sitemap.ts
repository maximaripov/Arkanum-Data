import type { MetadataRoute } from "next";
import { loadInsiders } from "@/lib/insiderData";

const SITE = "https://form4-insiders.vercel.app";
export const revalidate = 86400;

// Main pages, plus a page for every stock and insider with a buy in the last 30 days.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/markets", "/screener", "/calendar", "/briefing", "/about", "/terms"].map((p) => ({ url: SITE + p, changeFrequency: (p === "/about" || p === "/terms" ? "monthly" : "daily") as "monthly" | "daily" }));
  const d = await loadInsiders(SITE, { next: { revalidate: 86400 } }).catch(() => null);
  const buys = (d?.trades ?? []).filter((t) => t.code === "P");
  const stocks = [...new Set(buys.map((t) => t.symbol))].map((s) => ({ url: `${SITE}/stock/${encodeURIComponent(s)}`, changeFrequency: "weekly" as const }));
  const people = [...new Set(buys.map((t) => t.ownerCik).filter(Boolean))].map((c) => ({ url: `${SITE}/insider/${c}`, changeFrequency: "weekly" as const }));
  return [...pages, ...stocks, ...people];
}
