#!/usr/bin/env node
// Writes public/data/overview.json: the Insiders overview (headline numbers, strongest
// buys, group buys, buying by day, latest filings, notable sales) from the 30-day and
// today's files, so the home page loads a few KB instead of the whole 30-day file.
// Run after build-insiders.mjs (daily) and build-insiders-today.mjs (hourly).
import { readFile, writeFile } from "node:fs/promises";
import { mergeInsiders } from "../lib/insiderMerge.mjs";
import { buildOverview } from "../lib/overview.mjs";

const read = async (f) => { try { return JSON.parse(await readFile(f, "utf8")); } catch { return null; } };
const main = await read("public/data/insiders.json");
if (!main?.trades?.length) { console.error("insiders.json missing or empty; overview not written"); process.exit(1); }
const ov = buildOverview(mergeInsiders(main, await read("public/data/insiders-today.json")));
const out = JSON.stringify(ov);
await writeFile("public/data/overview.json", out);
console.log(`overview.json: ${(out.length / 1024).toFixed(1)} KB · ${ov.totals.buys} buys, ${ov.strongest.length} strongest, ${ov.clusterCount} group buys, ${ov.totals.notableSales} notable sales`);
