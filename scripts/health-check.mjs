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
  const basis = sc.fields.indexOf("basis");
  const quarterly = sc.rows.filter((r) => String(r[basis] ?? "").startsWith("Last 4")).length;
  if (sc.rows.length < 3500) problems.push(`screener has only ${sc.rows.length} companies (normally ~4,600): SEC data probably failed`);
  if (quarterly < sc.rows.length * 0.4) problems.push(`only ${quarterly} companies have recent quarterly data (normally ~60%): SEC frames probably failed`);
  if (hoursOld(sc.updated) > 2) problems.push(`screener data is ${hoursOld(sc.updated).toFixed(0)} hours old`);
  console.log(`screener: ${sc.rows.length} companies, ${quarterly} with last-4-quarter figures`);
}
if (which === "all") {
  const ins = await load("public/data/insiders.json");
  if (ins) {
    const last = ins.days.at(-1);
    const age = (Date.now() - Date.parse(last + "T00:00:00Z")) / 86_400_000;
    if (age > 5) problems.push(`insider data stops at ${last} (${age.toFixed(0)} days ago): SEC filings probably failed`);
    console.log(`insiders: ${ins.trades.length} trades, last day ${last}`);
  }
  const ev = await load("public/data/events.json");
  if (ev) {
    if (!ev.sources?.length) problems.push("economic calendar: neither the BEA nor the Federal Reserve calendar could be read");
    if (hoursOld(ev.updated) > 2) problems.push(`economic calendar is ${hoursOld(ev.updated).toFixed(0)} hours old`);
    console.log(`events: ${ev.events.length} upcoming (${ev.sources.join(", ")})`);
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
