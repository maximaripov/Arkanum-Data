#!/usr/bin/env node
// Well-known insiders, ranked by how often people looked them up on Wikipedia in the last
// 30 days. Wikidata gives the CEOs and chairs of SEC-registered companies (with their
// English Wikipedia article); each is matched to the person filing Form 4s for that company
// in the insider directory (data/people.json); Wikimedia's pageview API gives the views.
// Writes public/data/famous.json. Keeps the previous file if a source is down.
// Run after build-people.mjs (daily job). Needs SEC_USER_AGENT for SEC's ticker list.
// --activity-only (hourly job): just refreshes each person's last-30-days trading line.
import { readFile, writeFile } from "node:fs/promises";
import { getJson } from "./lib/sec.mjs";
import { matchFamous, withActivity } from "./lib/famous.mjs";
import { mergeInsiders } from "../lib/insiderMerge.mjs";

const UA = "Arkanum (free, non-commercial insider-trading site; form4-insiders.vercel.app)";
const OUT = "public/data/famous.json";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const read = async (f) => { try { return JSON.parse(await readFile(f, "utf8")); } catch { return null; } };
// Each person's buys and large sales in the site's 30-day + today trade data.
const addActivity = async (people) => withActivity(people, mergeInsiders(await read("public/data/insiders.json"), await read("public/data/insiders-today.json")).trades);

if (process.argv.includes("--activity-only")) {
  const cur = await read(OUT);
  if (cur?.people) { cur.people = await addActivity(cur.people); await writeFile(OUT, JSON.stringify(cur)); console.log(`famous.json: activity refreshed for ${cur.people.length}`); }
  process.exit(0);
}

// 1. CEOs and chairs (current: no end date) of companies with an SEC ID, with an English article.
const QUERY = `SELECT ?cik ?personLabel ?article WHERE {
  ?c wdt:P5531 ?cik .
  { ?c p:P169 ?st . ?st ps:P169 ?person . } UNION { ?c p:P488 ?st . ?st ps:P488 ?person . }
  FILTER NOT EXISTS { ?st pq:P582 ?end }
  ?article schema:about ?person ; schema:isPartOf <https://en.wikipedia.org/> .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;
const wd = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(QUERY)}`, { headers: { Accept: "application/sparql-results+json", "User-Agent": UA }, signal: AbortSignal.timeout(120_000) })
  .then((r) => (r.ok ? r.json() : null)).catch(() => null);
if (!wd) { console.warn("Wikidata didn't answer; keeping the previous list"); process.exit(0); }
// No English label comes back as the item's ID ("Q106028933"): use the article title instead.
const titleOf = (b) => decodeURIComponent(b.article.value.split("/wiki/")[1] ?? "");
const rows = wd.results.bindings.map((b) => ({ cik: b.cik.value, label: /^Q\d+$/.test(b.personLabel.value) ? titleOf(b).replace(/_/g, " ").replace(/ \(.*\)$/, "") : b.personLabel.value, title: titleOf(b) }));

// 2. Company CIK → tickers (SEC), then match to the filers in the directory.
const tickers = await getJson("https://www.sec.gov/files/company_tickers.json");
const tickersByCik = new Map();
for (const t of Object.values(tickers ?? {})) { if (!tickersByCik.has(t.cik_str)) tickersByCik.set(t.cik_str, new Set()); tickersByCik.get(t.cik_str).add(t.ticker); }
const people = matchFamous(rows, (await read("data/people.json")) ?? {}, tickersByCik);
console.log(`Wikidata: ${rows.length} CEO/chair entries → ${people.length} matched to Form 4 filers`);

// 3. Wikipedia views over the last 30 full days. Wikimedia limits requests from shared
// servers like GitHub's, so ask once a second, wait as long as it says when it refuses, and
// fall back to yesterday's count for anyone still missing.
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
const end = new Date(Date.now() - 86_400_000), start = new Date(end.getTime() - 29 * 86_400_000);
const before = new Map(((await read(OUT))?.people ?? []).map((p) => [p.cik, p.views]));
const missing = [];
for (const p of people) {
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(p.title)}/daily/${ymd(start)}/${ymd(end)}`;
  for (let i = 0; i < 5; i++) {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) }).catch(() => null);
    if (r?.ok) { p.views = (await r.json()).items.reduce((a, x) => a + x.views, 0); break; }
    if (r?.status === 404) { p.views = 0; break; }
    const wait = Number(r?.headers.get("retry-after")) || 5 * (i + 1);
    await sleep(Math.min(wait, 60) * 1000);
  }
  if (p.views == null) { p.views = before.get(p.cik) ?? null; missing.push(`${p.label}${p.views != null ? " (yesterday's count)" : ""}`); }
  await sleep(1000);
}
if (missing.length) console.warn(`Wikipedia views not fetched for ${missing.length}: ${missing.join(", ")}`);
if (people.filter((p) => p.views == null).length > people.length / 4) { console.warn("Too many missing; keeping the previous list"); process.exit(0); }

const list = await addActivity(people.filter((p) => p.views > 0).sort((a, b) => b.views - a.views).slice(0, 100));
await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString(), from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10), people: list }));
console.log(`famous.json: ${list.length} insiders; top: ${list.slice(0, 5).map((p) => `${p.label} (${p.views})`).join(", ")}`);
