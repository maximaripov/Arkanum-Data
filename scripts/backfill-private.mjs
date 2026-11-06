#!/usr/bin/env node
// One-off (re-runnable) backfill for public/data/private.json: PR Newswire's monthly
// archive of release addresses (its public sitemaps) since a start date. Addresses are the
// headline in lowercase, so they're only used to shortlist releases that name a tracked
// investor and a funding word; each shortlisted release's own headline and summary then
// go through the same extractor as the hourly feeds.
//   node scripts/backfill-private.mjs [--since 2026-01-01]
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { extractDeals, dealKey, SLUG_ALIASES } from "./lib/deals.mjs";

const OUT = "public/data/private.json";
const UA = { "User-Agent": "Arkanum (arkanumdata.vercel.app)" };
// --wide: every funding release, not just ones naming an investor in the headline (most
// name their investors in the first paragraphs). Many more pages to read (about an hour).
const WIDE = process.argv.includes("--wide");
const WIDE_SLUG = /(^|-)(series-[a-h]|seed|pre-seed|funding|financing-round|led-by|co-led-by|strategic-investment|growth-investment|investment-from)(-|$)/;
const since = process.argv.includes("--since") ? process.argv[process.argv.indexOf("--since") + 1] : `${new Date().getUTCFullYear()}-01-01`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FUNDING = /(^|-)(raises?|raised|funding|financing|series-[a-h]|seed|round|invests?|investment|backed|secures|closes)(-|$)/;
const aliasRe = new RegExp(`(^|-)(?:${SLUG_ALIASES.map((a) => a.replace(/[-]/g, "-")).join("|")})(-|$)`);
const decode = (s) => String(s ?? "").replace(/&amp;/g, "&").replace(/&#39;|&apos;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, " ").trim();
const meta = (html, prop) => decode(html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)`, "i"))?.[1]);

async function get(url, binary = false) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30_000) });
      if (r.status === 404) return null;
      if (r.ok) return binary ? Buffer.from(await r.arrayBuffer()) : await r.text();
    } catch {}
    await sleep(3000 * (i + 1));
  }
  return null;
}

// 1. Shortlist from each month's sitemap.
const shortlist = [];
for (let d = new Date(`${since.slice(0, 7)}-01T00:00:00Z`); d <= new Date(); d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
  const name = `${MONTHS[d.getUTCMonth()]}_${d.getUTCFullYear()}`;
  const gz = await get(`https://www.prnewswire.com/Sitemap_Index_${name}.xml.gz`, true);
  let xml = gz ? gunzipSync(gz).toString("utf8") : null;
  if (!xml) {
    // The current month isn't archived yet. The news sitemap is an index of pages
    // covering only the last ~2 days; earlier days of the month come from the hourly job.
    const index = await get("https://www.prnewswire.com/sitemap-news.xml");
    const pages = [...(index ?? "").matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]));
    const parts = [];
    for (const p of pages) { parts.push(await get(p)); await sleep(500); }
    xml = pages.length ? parts.filter(Boolean).join("\n") : index;
    if (xml) console.log(`${name}: not archived yet; reading the news sitemap (last ~2 days only)`);
  }
  if (!xml) { console.warn(`${name}: no sitemap`); continue; }
  let n = 0, hits = 0;
  for (const m of xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?(?:<lastmod>([^<]+)<\/lastmod>|<news:publication_date>([^<]+)<)/g)) {
    n++;
    const slug = m[1].match(/news-releases\/(.+)-\d+\.html$/)?.[1];
    const date = (m[2] ?? m[3] ?? "").slice(0, 10);
    if (!slug || date < since) continue;
    if (!(WIDE ? WIDE_SLUG.test(slug) || (FUNDING.test(slug) && aliasRe.test(slug)) : FUNDING.test(slug) && aliasRe.test(slug))) continue;
    shortlist.push({ url: m[1], date }); hits++;
  }
  console.log(`${name}: ${n} releases, ${hits} shortlisted`);
  await sleep(1000);
}

// 2. Read each shortlisted release's headline and summary.
let prev = { deals: [] };
try { prev = JSON.parse(await readFile(OUT, "utf8")); } catch {}
const deals = new Map(prev.deals.map((d) => [dealKey(d), d]));
let added = 0;
for (const s of shortlist) {
  const html = await get(s.url);
  await sleep(WIDE ? 400 : 700);
  if (!html) continue;
  const title = meta(html, "og:title") || decode(html.match(/<title>([^<]*)/)?.[1]).replace(/\s*\|.*$/, "");
  // The opening paragraphs, where releases name the round's investors.
  const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => decode(m[1].replace(/<[^>]+>/g, " "))).filter((t) => t.length > 60).slice(0, 4).join(" ");
  const summary = (paras || meta(html, "og:description") || meta(html, "description")).slice(0, 1500);
  for (const d of extractDeals({ title, summary, date: s.date, link: s.url })) {
    const k = dealKey(d);
    if (deals.has(k) && (deals.get(k).date ?? "") <= (d.date ?? "")) continue;
    deals.set(k, { ...d, source: "PR Newswire" });
    added++;
    console.log(`  ${d.date} ${d.investorName} → ${d.target}${d.amount ? ` ($${d.amount / 1e6}M)` : ""}: ${title.slice(0, 90)}`);
  }
}

const list = [...deals.values()].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
await mkdir("public/data", { recursive: true });
await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString(), deals: list }));
console.log(`Shortlisted ${shortlist.length}, added ${added}; private.json: ${list.length} deals`);
