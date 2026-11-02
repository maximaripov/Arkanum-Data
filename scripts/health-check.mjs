#!/usr/bin/env node
// Checks tonight's data before it's published. Exits 1 (and prints why) if anything
// looks broken, so the job stops, keeps yesterday's good data live, and notifies you.
//   node scripts/health-check.mjs screener   (right after the screener build)
//   node scripts/health-check.mjs all        (before committing)
import { readFile } from "node:fs/promises";

const which = process.argv[2] ?? "all";
const problems = [];
const hoursOld = (iso) => (Date.now() - Date.parse(iso)) / 3_600_000;
const load = async (f) => { try { return JSON.parse(await readFile(f, "utf8")); } catch { problems.push(`${f} is missing or unreadable`); return null; } };

const sc = await load("public/data/screener.json");
if (sc) {
  const priced = sc.rows.filter((r) => r[sc.fields.indexOf("p")] != null).length;
  if (sc.rows.length < 6000) problems.push(`screener has only ${sc.rows.length} stocks (normally ~7,100): Yahoo prices probably failed`);
  if (hoursOld(sc.updated) > 2) problems.push(`screener data is ${hoursOld(sc.updated).toFixed(0)} hours old`);
  const withFundamentals = sc.rows.filter((r) => r[sc.fields.indexOf("basis")] != null).length;
  if (withFundamentals < sc.rows.length * 0.5) problems.push(`only ${withFundamentals} stocks have SEC fundamentals (normally ~75%): SEC data probably failed`);
  console.log(`screener: ${sc.rows.length} stocks, ${priced} priced, ${withFundamentals} with fundamentals`);
}
if (which === "all") {
  const ins = await load("public/data/insiders.json");
  if (ins) {
    const last = ins.days.at(-1);
    const age = (Date.now() - Date.parse(last + "T00:00:00Z")) / 86_400_000;
    if (age > 5) problems.push(`insider data stops at ${last} (${age.toFixed(0)} days ago): SEC filings probably failed`);
    console.log(`insiders: ${ins.trades.length} trades, last day ${last}`);
  }
  const dv = await load("public/data/dividends.json");
  if (dv) {
    if (Object.keys(dv.rows).length < 50) problems.push(`only ${Object.keys(dv.rows).length} upcoming dividends found (normally hundreds): Nasdaq calendar probably failed`);
    console.log(`dividends: ${Object.keys(dv.rows).length} upcoming`);
  }
  const fu = await load("public/data/funds.json");
  if (fu) {
    if (fu.funds.length < 10) problems.push(`only ${fu.funds.length} funds' 13F filings were read (normally 13): SEC filings probably failed`);
    console.log(`funds: ${fu.funds.length} with 13F data`);
  }
}
if (problems.length) {
  console.error("PROBLEMS:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log("All checks passed.");
