#!/usr/bin/env node
// Writes public/data/known-tickers.json: every ticker the site links to that SEC's company
// list may not have (ETFs like QQQ in fund holdings and Congress trades). The stock page
// only answers "not found" for a ticker that is in none of the site's data. Runs before
// every build (npm "prebuild"), from the data files already in the repo.
import { readFile, writeFile } from "node:fs/promises";

const load = async (f) => { try { return JSON.parse(await readFile(f, "utf8")); } catch { return null; } };
const out = new Set();
const add = (t) => { if (typeof t === "string" && /^[A-Z0-9.\-]{1,12}$/i.test(t.trim())) out.add(t.trim().toUpperCase()); };

const funds = await load("public/data/funds.json");
for (const f of funds?.funds ?? []) for (const k of ["holdings", "new", "added", "reduced", "sold"]) for (const h of f[k] ?? []) add(h.t);
const congress = await load("public/data/congress.json");
for (const t of congress?.trades ?? []) add(t.ticker);

await writeFile("public/data/known-tickers.json", JSON.stringify({ tickers: [...out].sort() }));
console.log(`known-tickers.json: ${out.size} tickers`);
