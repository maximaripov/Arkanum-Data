import type { MetadataRoute } from "next";

const SITE = "https://foresightscreener.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/insiders", "/screener", "/calendar", "/briefing", "/about", "/terms"].map((p) => ({ url: SITE + p, changeFrequency: p === "/about" || p === "/terms" ? "monthly" : "daily" }));
}
