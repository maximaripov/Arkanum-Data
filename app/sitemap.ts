import type { MetadataRoute } from "next";
import { loadInsiders } from "@/lib/insiderData";
import { memberSlug } from "@/lib/congress.mjs";

const SITE = "https://form4-insiders.vercel.app";
export const revalidate = 86400;

// Main pages, every House member with stock trades, and every stock and insider with a
// buy in the last 30 days.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/congress", "/research/insider-buys", "/markets", "/stakes", "/briefing", "/about", "/terms"].map((p) => ({ url: SITE + p, changeFrequency: (p === "/about" || p === "/terms" || p.startsWith("/research") ? "monthly" : "daily") as "monthly" | "daily" }));
  const d = await loadInsiders(SITE, { next: { revalidate: 86400 } }).catch(() => null);
  const buys = (d?.trades ?? []).filter((t) => t.code === "P");
  const stocks = [...new Set(buys.map((t) => t.symbol))].map((s) => ({ url: `${SITE}/stock/${encodeURIComponent(s)}`, changeFrequency: "weekly" as const }));
  const people = [...new Set(buys.map((t) => t.ownerCik).filter(Boolean))].map((c) => ({ url: `${SITE}/insider/${c}`, changeFrequency: "weekly" as const }));
  const c = await fetch(`${SITE}/data/congress-overview.json`, { next: { revalidate: 86400 } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const members = ((c?.members ?? []) as { m: string }[]).map((m) => ({ url: `${SITE}/congress/${memberSlug(m.m)}`, changeFrequency: "weekly" as const }));
  return [...pages, ...members, ...stocks, ...people];
}
