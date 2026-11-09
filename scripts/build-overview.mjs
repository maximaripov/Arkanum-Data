#!/usr/bin/env node
// Writes public/data/overview.json: the Insiders overview (headline numbers, strongest
// buys, group buys, buying by day, latest filings, notable sales) from the 30-day and
// today's files, so the home page loads a few KB instead of the whole 30-day file.
// Run after build-insiders.mjs (daily) and build-insiders-today.mjs (hourly).
import { readFile, writeFile } from "node:fs/promises";
import { mergeInsiders } from "../lib/insiderMerge.mjs";
import { buildOverview } from "../lib/overview.mjs";
import { closesFor, dailyCloses, tradeReturns } from "../lib/returns.mjs";

const read = async (f) => { try { return JSON.parse(await readFile(f, "utf8")); } catch { return null; } };
const main = await read("public/data/insiders.json");
if (!main?.trades?.length) { console.error("insiders.json missing or empty; overview not written"); process.exit(1); }
const ov = buildOverview(mergeInsiders(main, await read("public/data/insiders-today.json")));

// "Since filing" on the listed trades: the stock and the S&P 500 from the first close after the
// filing to the latest close, and how many trading days that covers (a few days says little).
// Best effort: if prices can't be fetched the lists simply show no figure.
try {
  const lists = [ov.strongest, ov.latest, ov.notableSales].filter(Array.isArray);
  const items = lists.flat().filter((t) => t.symbol && t.filed);
  const from = items.reduce((a, t) => (t.filed < a ? t.filed : a), new Date().toISOString().slice(0, 10));
  const spy = await dailyCloses("SPY", from);
  if (spy) {
    const px = await closesFor(items.map((t) => t.symbol), from, { pause: 100 });
    for (const t of items) {
      const series = px.get(t.symbol);
      const r = series && tradeReturns(series, spy, { filed: t.filed, traded: t.date, paid: t.price });
      if (!r?.pub) continue;
      const days = series.length - 1 - series.findIndex(([d]) => d > t.filed);
      t.since = { s: Math.round(r.pub[0] * 10000) / 10000, m: Math.round(r.pub[1] * 10000) / 10000, d: days, asOf: spy.at(-1)[0] };
    }
  }
} catch (e) { console.warn("since-filing returns skipped:", e.message); }

const out = JSON.stringify(ov);
await writeFile("public/data/overview.json", out);
console.log(`overview.json: ${(out.length / 1024).toFixed(1)} KB · ${ov.totals.buys} buys, ${ov.strongest.length} strongest, ${ov.clusterCount} group buys, ${ov.totals.notableSales} notable sales`);
