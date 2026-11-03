#!/usr/bin/env node
// Builds public/data/insiders.json: a rolling window of insider open-market buys
// (and large sales) from every Form 4 filed on SEC EDGAR. Incremental: each run only
// fetches days not already in the file. Usage: node scripts/build-insiders.mjs [--days 30]
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { parseForm4 } from "../lib/form4.mjs";

const UA = process.env.SEC_USER_AGENT || "Form4 (set SEC_USER_AGENT)";
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? Number(process.argv[i + 1]) : d; };
const DAYS = arg("--days", 30);
const MIN_SALE = 250_000; // routine small sales are noise; keep big ones only
const OUT = "public/data/insiders.json";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getText(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) });
      if (r.status === 404) return null;
      if (r.ok) return await r.text();
      // SEC's file store answers a missing file (e.g. a holiday's index) with a 403
      // "AccessDenied" XML; real throttling is an HTML "Request Rate Threshold" page.
      if (r.status === 403 && (await r.text()).includes("AccessDenied")) return null;
      if (r.status === 403 || r.status === 429) await sleep(5000 * (i + 1)); // SEC throttling
    } catch {}
    await sleep(1000 * (i + 1));
  }
  throw new Error(`Failed: ${url}`);
}

let data = { updated: null, days: [], trades: [] };
try { data = JSON.parse(await readFile(OUT, "utf8")); } catch {}

const ymd = (d) => d.toISOString().slice(0, 10);
const cutoff = new Date(Date.now() - DAYS * 86_400_000);
const todo = [];
for (let d = new Date(cutoff); d < new Date(); d = new Date(d.getTime() + 86_400_000)) {
  const day = ymd(d);
  if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !data.days.includes(day) && day < ymd(new Date())) todo.push(day);
}
console.log(`${todo.length} day(s) to fetch`);

for (const day of todo) {
  const [y, m] = day.split("-").map(Number);
  const idx = await getText(`https://www.sec.gov/Archives/edgar/daily-index/${y}/QTR${Math.ceil(m / 3)}/form.${day.replace(/-/g, "")}.idx`);
  if (idx === null) { data.days.push(day); console.log(`${day}: no index (holiday)`); continue; } // market holiday
  const files = [...new Set(idx.split("\n").filter((l) => /^4\s{2,}/.test(l)).map((l) => l.match(/edgar\/data\/\S+\.txt/)?.[0]).filter(Boolean))];
  const found = [];
  const queue = [...files];
  const worker = async () => {
    while (queue.length) {
      const f = queue.shift();
      try {
        const txt = await getText(`https://www.sec.gov/Archives/${f}`);
        const xml = txt?.match(/<XML>([\s\S]*?)<\/XML>/)?.[1];
        if (xml) {
          const accession = f.split("/").pop().replace(".txt", "");
          const folder = `https://www.sec.gov/Archives/${f.replace(/[^/]+$/, "")}${accession.replace(/-/g, "")}`;
          found.push(...parseForm4(xml.trim(), { accession, filed: day, url: `${folder}/${accession}-index.htm` }));
        }
      } catch (e) { console.warn(e.message); }
      await sleep(400); // 4 workers × ~2.5 req/s ≈ under SEC's 10 req/s limit
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);

  // One row per filing and direction: several partial fills become one trade.
  const merged = new Map();
  for (const t of found) {
    if (t.code !== "P" && t.code !== "S") continue;
    const k = t.accession + t.code;
    const m = merged.get(k);
    if (!m) { merged.set(k, { ...t }); continue; }
    m.shares += t.shares;
    m.value = (m.value ?? 0) + (t.value ?? 0) || null;
    m.price = m.value && m.shares ? +(m.value / m.shares).toFixed(4) : m.price;
    if (t.date > m.date) m.date = t.date;
    m.ownedAfter = t.ownedAfter ?? m.ownedAfter;
  }
  const kept = [...merged.values()].filter((t) => t.symbol && (t.code === "P" || (t.value ?? 0) >= MIN_SALE));
  data.trades.push(...kept);
  data.days.push(day);
  console.log(`${day}: ${files.length} filings → ${kept.filter((t) => t.code === "P").length} buys, ${kept.filter((t) => t.code === "S").length} large sales`);
  data.updated = new Date().toISOString();
  await mkdir("public/data", { recursive: true });
  await writeFile(OUT, JSON.stringify(data)); // save after each day so an interrupted run keeps progress
}

const minDay = ymd(cutoff);
data.days = data.days.filter((d) => d >= minDay).sort();
data.trades = data.trades.filter((t) => t.filed >= minDay).sort((a, b) => b.filed.localeCompare(a.filed));
data.updated = new Date().toISOString();
await writeFile(OUT, JSON.stringify(data));
console.log(`insiders.json: ${data.trades.length} trades over ${data.days.length} days`);
