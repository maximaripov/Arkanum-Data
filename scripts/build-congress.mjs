#!/usr/bin/env node
// Stock trades by members of the House, from their STOCK Act Periodic Transaction Reports.
// Reads the Clerk's yearly index (this year and last), downloads each new e-filed report's
// PDF and turns it into rows with `pdftotext` (poppler-utils). Scanned paper filings are
// counted but can't be read. Party comes from the public-domain congress-legislators list.
// Writes public/data/congress.json (two years of trades); remembers which reports it has
// read in data/congress-seen.json so each daily run only fetches new ones.
//   node scripts/build-congress.mjs [--max N] [--rebuild]   (--rebuild re-reads every report)
import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { parsePtr, stateDistrict } from "./lib/congress.mjs";
import { writeSummaries } from "./lib/congress-summary.mjs";

const UA = "Arkanum (free, non-commercial insider-trading site; form4-insiders.vercel.app)";
const BASE = "https://disclosures-clerk.house.gov/public_disc";
const MAX = +(process.argv[process.argv.indexOf("--max") + 1] || 0) || Infinity;
const TMP = "/tmp/form4-congress";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const read = async (f, d) => { try { return JSON.parse(await readFile(f, "utf8")); } catch { return d; } };
async function get(url, binary) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30_000) });
      if (r.status === 404) return null;
      if (r.ok) return binary ? Buffer.from(await r.arrayBuffer()) : await r.text();
    } catch {}
    await sleep(2000 * (i + 1));
  }
  throw new Error(`Couldn't fetch ${url}`);
}
const isoMDY = (d) => { const [m, day, y] = d.split("/"); return `${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}`; };
const tag = (x, t) => x.match(new RegExp(`<${t}>([^<]*)</${t}>`))?.[1]?.trim() ?? "";

await mkdir(TMP, { recursive: true });
const year = new Date().getUTCFullYear();

// 1. Every Periodic Transaction Report (FilingType P) in this year's and last year's index.
const filings = [];
for (const y of [year - 1, year]) {
  const zip = await get(`${BASE}/financial-pdfs/${y}FD.zip`, true);
  if (!zip) { console.log(`${y}: no index yet`); continue; }
  await writeFile(`${TMP}/${y}.zip`, zip);
  const xml = execFileSync("unzip", ["-p", `${TMP}/${y}.zip`, `${y}FD.xml`], { encoding: "utf8", maxBuffer: 1 << 28 });
  for (const m of xml.split("<Member>").slice(1)) {
    if (tag(m, "FilingType") !== "P") continue;
    filings.push({ doc: tag(m, "DocID"), year: y, first: tag(m, "First"), last: tag(m, "Last"), sd: tag(m, "StateDst"), filed: isoMDY(tag(m, "FilingDate")) });
  }
}
console.log(`${filings.length} transaction reports listed`);

// 2. Who's who: party and official name by state + district.
const legis = await get("https://unitedstates.github.io/congress-legislators/legislators-current.json").then(JSON.parse).catch(() => []);
const byState = new Map();
for (const l of legis) {
  const t = l.terms.at(-1);
  if (t.type !== "rep") continue;
  if (!byState.has(t.state)) byState.set(t.state, []);
  byState.get(t.state).push({ name: l.name.official_full || `${l.name.first} ${l.name.last}`, last: l.name.last, district: t.district ?? 0, party: t.party });
}
const words = (s) => s.toLowerCase().normalize("NFKD").replace(/[^a-z\s-]/g, "").split(/[\s-]+/).filter((w) => w.length > 1);
// Same state and a shared surname word ("Delaney" ↔ "McClain Delaney"); the same district
// wins if two match. Districts in filings can be stale after redistricting, so they only break ties.
const who = (f) => {
  const { state, district } = stateDistrict(f.sd);
  const lw = words(f.last);
  const hits = (byState.get(state) ?? []).filter((r) => words(r.last).some((w) => lw.includes(w)));
  const r = hits.find((h) => h.district === district) ?? (hits.length === 1 ? hits[0] : null);
  return { member: r ? r.name : `${f.first.replace(/\s+(Mr|Mrs|Ms|Dr)\.?$/i, "")} ${f.last}`.replace(/\s+/g, " ").trim(), party: r ? r.party : null, current: !!r, state, district };
};

// 3. Read the reports not seen before.
const REBUILD = process.argv.includes("--rebuild");
const seen = REBUILD ? {} : await read("data/congress-seen.json", {});
const prev = REBUILD ? { trades: [] } : await read("public/data/congress.json", { trades: [] });
const trades = prev.trades;
let fetched = 0, scanned = 0;
for (const f of filings.sort((a, b) => b.filed.localeCompare(a.filed))) {
  if (seen[f.doc] && seen[f.doc] !== "error") continue;
  if (fetched >= MAX) break;
  // DocIDs starting with 2 are e-filed; 8/9 are scanned paper with no text to read.
  if (!f.doc.startsWith("2")) { seen[f.doc] = "scanned"; scanned++; continue; }
  const url = `${BASE}/ptr-pdfs/${f.year}/${f.doc}.pdf`;
  try {
    const pdf = await get(url, true); fetched++;
    if (!pdf) { seen[f.doc] = "missing"; continue; }
    await writeFile(`${TMP}/r.pdf`, pdf);
    const rows = parsePtr(execFileSync("pdftotext", ["-layout", `${TMP}/r.pdf`, "-"], { encoding: "utf8" }));
    const w = who(f);
    for (const r of rows) trades.push({ doc: f.doc, ...w, filed: f.filed, ...r, url });
    seen[f.doc] = rows.length ? "ok" : "empty";
  } catch (e) { seen[f.doc] = "error"; console.warn(`${f.doc}: ${e.message}`); }
  await sleep(300);
}

// 4. Keep two years of trades, newest first; one copy per report row.
const cutoff = new Date(Date.now() - 730 * 86_400_000).toISOString().slice(0, 10);
const uniq = new Map(trades.filter((t) => t.date >= cutoff).map((t, i) => [`${t.doc}|${t.ticker}|${t.asset}|${t.type}|${t.date}|${t.min}|${t.owner}|${i}`, t]));
const keep = [...uniq.values()].sort((a, b) => b.filed.localeCompare(a.filed) || b.date.localeCompare(a.date));
await mkdir("data", { recursive: true });
await writeFile("data/congress-seen.json", JSON.stringify(seen));
await writeFile("public/data/congress.json", JSON.stringify({ updated: new Date().toISOString(), source: "U.S. House Clerk, Periodic Transaction Reports", scannedSkipped: Object.values(seen).filter((s) => s === "scanned").length, trades: keep }));
await rm(TMP, { recursive: true, force: true });

// 5. The Congress page's summary and one small file per member (the full file is only read by the server for lookups).
await writeSummaries(keep, Object.values(seen).filter((s) => s === "scanned").length);
console.log(`read ${fetched} new reports (${scanned} scanned skipped); congress.json: ${keep.length} trades, ${keep.filter((t) => t.ticker).length} with a ticker`);
