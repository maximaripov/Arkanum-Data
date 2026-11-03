#!/usr/bin/env node
// Builds public/data/insiders.json: a rolling window of insider open-market buys
// (and large sales) from every Form 4 filed on SEC EDGAR. Incremental: each run only
// fetches completed days not already in the file (today's filings are handled hourly by
// build-insiders-today.mjs). Then looks up each executive/director buy's history
// ("first buy in N years"). Usage: node scripts/build-insiders.mjs [--days 30]
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { parseForm4 } from "../lib/form4.mjs";
import { getText, pool, mergeFills, keepTrade } from "./lib/sec.mjs";
import { addHistory } from "./lib/history.mjs";

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? Number(process.argv[i + 1]) : d; };
const DAYS = arg("--days", 30);
const OUT = "public/data/insiders.json";

let data = { updated: null, days: [], trades: [] };
try { data = JSON.parse(await readFile(OUT, "utf8")); } catch {}
const save = async () => { data.updated = new Date().toISOString(); await mkdir("public/data", { recursive: true }); await writeFile(OUT, JSON.stringify(data)); };

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
  await pool(files, 4, async (f) => {
    const txt = await getText(`https://www.sec.gov/Archives/${f}`);
    const xml = txt?.match(/<XML>([\s\S]*?)<\/XML>/)?.[1];
    if (!xml) return;
    const accession = f.split("/").pop().replace(".txt", "");
    const folder = `https://www.sec.gov/Archives/${f.replace(/[^/]+$/, "")}${accession.replace(/-/g, "")}`;
    found.push(...parseForm4(xml.trim(), { accession, filed: day, url: `${folder}/${accession}-index.htm` }));
  });
  const kept = mergeFills(found).filter(keepTrade);
  data.trades = data.trades.filter((t) => t.filed !== day); // the full day replaces anything saved for it before
  data.trades.push(...kept);
  data.days.push(day);
  console.log(`${day}: ${files.length} filings → ${kept.filter((t) => t.code === "P").length} buys, ${kept.filter((t) => t.code === "S").length} large sales`);
  await save(); // save after each day so an interrupted run keeps progress
}

const minDay = ymd(cutoff);
data.days = data.days.filter((d) => d >= minDay).sort();
data.trades = data.trades.filter((t) => t.filed >= minDay).sort((a, b) => b.filed.localeCompare(a.filed));

// Rows saved before the insider's SEC ID was recorded: read it from the filing again.
const missing = [...new Set(data.trades.filter((t) => !t.ownerCik).map((t) => t.url))];
if (missing.length) {
  console.log(`Filling in insider IDs for ${missing.length} filing(s)`);
  const byUrl = new Map();
  await pool(missing, 4, async (url) => {
    const m = url.match(/^(https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/\d+)\/\d+\/([\d-]+)-index\.htm$/);
    if (!m) return;
    const xml = (await getText(`${m[1]}/${m[2]}.txt`))?.match(/<XML>([\s\S]*?)<\/XML>/)?.[1];
    const cik = xml ? parseForm4(xml.trim(), { accession: m[2], filed: "", url })[0]?.ownerCik : null;
    if (cik) byUrl.set(url, cik);
  });
  for (const t of data.trades) if (!t.ownerCik && byUrl.has(t.url)) t.ownerCik = byUrl.get(t.url);
  await save();
}

const n = await addHistory(data.trades, { keepOwners: new Set(data.trades.map((t) => t.ownerCik).filter(Boolean)) });
console.log(`History looked up for ${n} buy(s)`);
await save();
console.log(`insiders.json: ${data.trades.length} trades over ${data.days.length} days`);
