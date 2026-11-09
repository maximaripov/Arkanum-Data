#!/usr/bin/env node
// The research results the trade lists show as context ("Trades like this"), cut down to what
// they need: six-month median against the month's typical trade, the share that did better
// (buys) or worse (sales), and the count, for 2023–2025 and for filings since January 2026.
// Runs before every build (prebuild), so it follows the monthly research refresh.
//   node scripts/build-evidence.mjs   → lib/evidence.json
import { readFile, writeFile } from "node:fs/promises";

const read = async (f) => JSON.parse(await readFile(new URL(`../docs/backtest/${f}`, import.meta.url), "utf8"));
const [buys, buys26, sales, sales26] = await Promise.all(["results.json", "oos-2026.json", "sales.json", "sales-2026.json"].map(read));

const r = (x) => (x == null ? null : Math.round(x * 1000) / 10); // fraction → percent, one decimal
function pick(file, share) {
  const out = {};
  for (const [group, h] of file.tables.month) {
    const s = h["6 months"];
    if (s?.median == null) continue;
    out[group] = [r(s.median), r(s[share]), s.n, s.months ?? 0];
  }
  return out;
}

const evidence = {
  // [median %, share %, count, filing months with six-month returns]; buys: share that beat the month's typical buy; sales: share followed by a worse return.
  buys: { main: pick(buys, "hit"), oos: pick(buys26, "hit"), oosFrom: buys26.from, oosTo: buys26.to },
  sales: { main: pick(sales, "below"), oos: pick(sales26, "below"), oosFrom: sales26.from, oosTo: sales26.to },
};
await writeFile(new URL("../lib/evidence.json", import.meta.url), JSON.stringify(evidence));
console.log(`evidence: ${Object.keys(evidence.buys.main).length} buy groups, ${Object.keys(evidence.sales.main).length} sale groups`);
