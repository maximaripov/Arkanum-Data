#!/usr/bin/env node
// Builds public/data/funds.json: what well-known funds hold and what they changed, from
// their quarterly SEC 13F filings (US stocks and ETFs over $100M funds must report).
// 13Fs are due 45 days after each quarter, so positions are 6–20 weeks old when published.
//
// Incremental: a fund is only re-read when it files a new 13F. CUSIP → ticker lookups
// (OpenFIGI, free) are cached in data/cusip.json.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";

const UA = process.env.SEC_USER_AGENT || "Form4 (set SEC_USER_AGENT)";
const FUNDS = [
  [1067983, "Berkshire Hathaway", "Warren Buffett / Greg Abel"],
  [1350694, "Bridgewater Associates", "Ray Dalio's firm"],
  [1336528, "Pershing Square", "Bill Ackman"],
  [1037389, "Renaissance Technologies", "Quant fund"],
  [1656456, "Appaloosa", "David Tepper"],
  [1536411, "Duquesne Family Office", "Stanley Druckenmiller"],
  [1040273, "Third Point", "Dan Loeb"],
  [1061768, "Baupost Group", "Seth Klarman"],
  [1167483, "Tiger Global", "Chase Coleman"],
  [1135730, "Coatue Management", "Philippe Laffont"],
  [1029160, "Soros Fund Management", "George Soros's family office"],
  [1697748, "ARK Investment Management", "Cathie Wood"],
  [921669, "Icahn Capital", "Carl Icahn"],
];
const TOP = 100, CHANGES = 25;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true, parseTagValue: false });

async function sec(url, as = "json") {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30_000) });
      if (r.ok) return as === "json" ? r.json() : r.text();
      if (r.status === 404) return null;
    } catch {}
    await sleep(1500 * (i + 1));
  }
  throw new Error(`SEC request failed: ${url}`);
}

/** Holdings in one 13F filing, merged by CUSIP (stock positions only; options listed apart). */
async function holdings(cik, accession) {
  const folder = `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}`;
  const idx = await sec(`${folder}/index.json`);
  await sleep(150);
  const xmls = (idx?.directory?.item ?? []).map((i) => i.name).filter((n) => /\.xml$/i.test(n) && !/primary_doc/i.test(n));
  const byCusip = new Map();
  for (const f of xmls) {
    const doc = parser.parse(await sec(`${folder}/${f}`, "text"));
    await sleep(150);
    for (const h of arr(doc?.informationTable?.infoTable)) {
      if (h.putCall) continue; // option positions aren't stock holdings
      const cusip = String(h.cusip ?? "").toUpperCase();
      const value = Number(h.value) || 0; // dollars (since 2023)
      const shares = Number(h.shrsOrPrnAmt?.sshPrnamt) || 0;
      const cur = byCusip.get(cusip) ?? { cusip, name: String(h.nameOfIssuer ?? "").trim(), cls: String(h.titleOfClass ?? "").trim(), value: 0, shares: 0 };
      cur.value += value; cur.shares += shares;
      byCusip.set(cusip, cur);
    }
  }
  return byCusip;
}

// ---- Load previous output and the CUSIP cache --------------------------------------
let prev = { funds: [] };
try { prev = JSON.parse(await readFile("public/data/funds.json", "utf8")); } catch {}
let cusipCache = {};
try { cusipCache = JSON.parse(await readFile("data/cusip.json", "utf8")); } catch {}

const out = [];
for (const [cik, name, who] of FUNDS) {
  const sub = await sec(`https://data.sec.gov/submissions/CIK${String(cik).padStart(10, "0")}.json`);
  await sleep(150);
  const r = sub.filings.recent;
  const filings = [];
  for (let i = 0; i < r.form.length && filings.length < 2; i++)
    if (r.form[i] === "13F-HR") filings.push({ accession: r.accessionNumber[i], period: r.reportDate[i], filed: r.filingDate[i] });
  if (!filings.length) continue;
  const old = prev.funds.find((f) => f.cik === cik);
  if (old && old.accession === filings[0].accession) { out.push(old); console.log(`${name}: unchanged (${filings[0].period})`); continue; }

  const now = await holdings(cik, filings[0].accession);
  const before = filings[1] ? await holdings(cik, filings[1].accession) : new Map();
  const total = [...now.values()].reduce((a, h) => a + h.value, 0);
  const rows = [...now.values()].map((h) => {
    const b = before.get(h.cusip);
    const change = !b ? "new" : h.shares > b.shares * 1.005 ? "added" : h.shares < b.shares * 0.995 ? "reduced" : "same";
    return { ...h, pct: total ? (h.value / total) * 100 : 0, change, chgPct: b && b.shares ? ((h.shares - b.shares) / b.shares) * 100 : null };
  }).sort((a, b) => b.value - a.value);
  const sold = [...before.values()].filter((b) => !now.has(b.cusip)).sort((a, b) => b.value - a.value)
    .map((b) => ({ ...b, pct: 0, change: "sold", chgPct: -100 }));
  const pick = (list) => list.slice(0, CHANGES);
  out.push({
    cik, name, who, accession: filings[0].accession, period: filings[0].period, filed: filings[0].filed,
    prevPeriod: filings[1]?.period ?? null, total, count: now.size,
    top: rows.slice(0, TOP),
    new: pick(rows.filter((h) => h.change === "new")),
    added: pick(rows.filter((h) => h.change === "added")),
    reduced: pick(rows.filter((h) => h.change === "reduced")),
    sold: pick(sold),
  });
  console.log(`${name}: ${now.size} holdings, $${(total / 1e9).toFixed(1)}B (${filings[0].period})`);
}

// ---- CUSIP → ticker (OpenFIGI, cached) -----------------------------------------------
const need = [...new Set(out.flatMap((f) => [...f.top, ...f.new, ...f.added, ...f.reduced, ...f.sold].map((h) => h.cusip)))].filter((c) => !(c in cusipCache));
console.log(`Looking up ${need.length} new CUSIPs…`);
for (let i = 0; i < need.length; i += 10) {
  const batch = need.slice(i, i + 10);
  try {
    const r = await fetch("https://api.openfigi.com/v3/mapping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch.map((c) => ({ idType: "ID_CUSIP", idValue: c, exchCode: "US" }))),
      signal: AbortSignal.timeout(20_000),
    });
    if (r.status === 429) { await sleep(60_000); i -= 10; continue; } // free limit: 25 requests/minute
    const res = await r.json();
    batch.forEach((c, k) => { cusipCache[c] = res[k]?.data?.[0]?.ticker ?? null; });
  } catch {}
  await sleep(2600);
}
// Fallback for companies registered abroad (Chubb, Seagate, ASML…), whose CINS codes the
// free OpenFIGI tier doesn't map: match the filing's company name against SEC's list of
// listed companies, accepting it only when exactly one company fits.
const norm = (n) => ` ${String(n).toUpperCase().replace(/&/g, " AND ").replace(/[^A-Z0-9 ]/g, " ")} `
  .replace(/ HLDNGS | HLDGS | HLDG | HLDGS? /g, " HOLDINGS ").replace(/ HOLDING /g, " HOLDINGS ")
  .replace(/ (INC|CORP|CORPORATION|CO|COMPANY|LTD|LIMITED|PLC|PL|NV|N V|SA|AG|SE|LP|LLC|THE|CL [A-C]|CLASS [A-C]|COM|NEW|DEL|ADR|ADS|ORD|SHS)(?= )/g, " ")
  .replace(/\s+/g, " ").trim();
const secList = await sec("https://www.sec.gov/files/company_tickers.json");
const byName = new Map(); // normalized name → Map(company id → its first-listed ticker)
for (const { cik_str, title, ticker } of Object.values(secList ?? {})) {
  const k = norm(title);
  if (!byName.has(k)) byName.set(k, new Map());
  const m = byName.get(k);
  if (!m.has(cik_str)) m.set(cik_str, ticker); // SEC lists a company's main share class first
}
let byNameHits = 0;
for (const f of out) for (const list of [f.top, f.new, f.added, f.reduced, f.sold]) for (const h of list) {
  // OpenFIGI writes share classes as "LEN/B"; Form4 (like Yahoo) uses "LEN-B".
  h.t = cusipCache[h.cusip]?.replace(/[/ ]/g, "-") ?? null;
  if (h.t) continue;
  const hit = byName.get(norm(h.name));
  if (hit?.size === 1) { h.t = [...hit.values()][0]; byNameHits++; } // only when exactly one company has this name
}
console.log(`Matched ${byNameHits} more holdings by company name`);

await mkdir("data", { recursive: true });
await writeFile("data/cusip.json", JSON.stringify(cusipCache));
await mkdir("public/data", { recursive: true });
await writeFile("public/data/funds.json", JSON.stringify({ updated: new Date().toISOString(), funds: out }));
console.log(`funds.json: ${out.length} funds`);
