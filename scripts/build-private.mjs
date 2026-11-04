#!/usr/bin/env node
// Builds public/data/private.json: investments listed companies made in private startups,
// as announced in press releases ("Acme raises $40M led by NVentures"). Not in SEC data, so
// these are reported, not verified. Feeds only show their latest items, so this runs with
// the hourly job and keeps what it has found (two years, newest first).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { parseRss, extractDeal, dealKey } from "./lib/deals.mjs";

const OUT = "public/data/private.json";
const FEEDS = [
  ["PR Newswire", "https://www.prnewswire.com/rss/financial-services-latest-news/venture-capital-list.rss"],
  ["PR Newswire", "https://www.prnewswire.com/rss/financial-services-latest-news/financing-agreements-list.rss"],
  ["PR Newswire", "https://www.prnewswire.com/rss/financial-services-latest-news/private-placement-list.rss"],
  ["PR Newswire", "https://www.prnewswire.com/rss/news-releases-list.rss"],
  ["Business Wire", "https://feed.businesswire.com/rss/home/?rss=G1QFDERJXkJeEFtRWA=="],
];
const KEEP_DAYS = 730;
const key = dealKey;

let prev = { deals: [] };
try { prev = JSON.parse(await readFile(OUT, "utf8")); } catch {}
const deals = new Map(prev.deals.map((d) => [key(d), d]));
const before = deals.size;

let ok = 0;
for (const [source, url] of FEEDS) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Form4 (form4-insiders.vercel.app)" }, signal: AbortSignal.timeout(20_000) });
    if (!r.ok) { console.warn(`${source}: HTTP ${r.status}`); continue; }
    const items = parseRss(await r.text());
    ok++;
    let found = 0;
    for (const it of items) {
      const d = extractDeal(it);
      if (!d || !d.url) continue;
      if (!deals.has(key(d))) { deals.set(key(d), { ...d, source }); found++; console.log(`  ${d.investorName} → ${d.target}: ${d.title}`); }
    }
    console.log(`${source}: ${items.length} releases, ${found} new deal(s)`);
  } catch (e) { console.warn(`${source}: ${e.message}`); }
}
if (!ok) throw new Error("No press-release feed could be read");

const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString().slice(0, 10);
const list = [...deals.values()].filter((d) => (d.date ?? "") >= cutoff).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
if (list.length === prev.deals.length && deals.size === before) { console.log("No new deals"); process.exit(0); }
await mkdir("public/data", { recursive: true });
await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString(), deals: list }));
console.log(`private.json: ${list.length} deals`);
