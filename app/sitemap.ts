import type { MetadataRoute } from "next";
import { readCongressOverview, readFamous, readInsiders } from "@/lib/siteData";
import { memberSlug } from "@/lib/congress.mjs";
import { isExecOrDirector } from "@/lib/people.mjs";
import { digestIndex } from "@/lib/digestArchive";

const SITE = "https://arkanumdata.vercel.app";
export const revalidate = 86400;

// Main pages, every House member with stock trades, and every stock and insider with a
// buy, or an executive or director sale of $250K+, in the last 30 days. (Not every insider:
// each insider page reads their filings from SEC, so crawling thousands would hit its limits.)
// Plus the well-known insiders list (up to 100) and every past digest.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/insiders", "/congress", "/research", "/research/report-card", "/research/methodology", "/research/lab", "/open-data", "/research/insider-buys", "/research/insider-buys/method", "/research/insider-buys/results", "/research/insider-buys/market", "/research/insider-buys/appendix", "/research/insider-sales", "/research/insider-sales/method", "/research/insider-sales/results", "/research/insider-sales/discussion", "/research/fund-copying", "/research/fund-copying/results", "/research/filing-delay", "/research/filing-delay/results", "/research/house-trades", "/research/house-trades/results", "/markets", "/stakes", "/briefing", "/briefing/archive", "/about", "/terms"].map((p) => ({ url: SITE + p, changeFrequency: (p === "/about" || p === "/terms" || p.startsWith("/research") ? "monthly" : "daily") as "monthly" | "daily" }));
  const d = await readInsiders();
  const shown = (d?.trades ?? []).filter((t) => t.code === "P" || (t.code === "S" && isExecOrDirector(t)));
  const stocks = [...new Set(shown.map((t) => t.symbol))].map((s) => ({ url: `${SITE}/stock/${encodeURIComponent(s)}`, changeFrequency: "weekly" as const }));
  const people = [...new Set(shown.map((t) => t.ownerCik).filter(Boolean))].map((c) => ({ url: `${SITE}/insider/${c}`, changeFrequency: "weekly" as const }));
  const c = await readCongressOverview();
  const members = ((c?.members ?? []) as { m: string }[]).map((m) => ({ url: `${SITE}/congress/${memberSlug(m.m)}`, changeFrequency: "weekly" as const }));
  const famous = await readFamous();
  const known = new Set(shown.map((t) => t.ownerCik));
  const wellKnown = ((famous?.people ?? []) as { cik: string }[]).filter((p) => !known.has(p.cik)).map((p) => ({ url: `${SITE}/insider/${p.cik}`, changeFrequency: "weekly" as const }));
  // Past digests never change once published.
  const digests = (await digestIndex()).map((x) => ({ url: `${SITE}/briefing/${x.date}`, lastModified: x.date, changeFrequency: "never" as const }));
  return [...pages, ...digests, ...members, ...stocks, ...people, ...wellKnown];
}
