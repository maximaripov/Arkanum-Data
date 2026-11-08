#!/usr/bin/env node
// Diagnostic (run on GitHub): one company's quarterly and yearly revenue and net income as
// SEC's frames give them (the screener's source), to see why its figures stop early.
//   node scripts/diagnose/quarters.mjs FDX
const UA = process.env.SEC_USER_AGENT;
const t = process.argv[2] ?? "FDX";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (u) => { const r = await fetch(u, { headers: { "User-Agent": UA } }); await sleep(150); return r.ok ? r.json() : null; };
const cik = Object.values(await get("https://www.sec.gov/files/company_tickers.json")).find((c) => c.ticker === t)?.cik_str;
const Y = new Date().getUTCFullYear();
const TAGS = { revenue: ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax"], netIncome: ["NetIncomeLoss"] };
console.log(`${t} CIK ${cik}`);
for (const [name, tags] of Object.entries(TAGS)) for (const tag of tags) {
  const periods = [];
  for (let y = Y - 2; y <= Y; y++) { for (let q = 1; q <= 4; q++) periods.push(`CY${y}Q${q}`); periods.push(`CY${y}`); }
  for (const p of periods) {
    const d = await get(`https://data.sec.gov/api/xbrl/frames/us-gaap/${tag}/USD/${p}.json`);
    const row = d?.data?.find((x) => x.cik === cik);
    console.log(`  ${name} ${tag} ${p}: ${row ? `${row.val} (${row.start} to ${row.end}, ${row.accn})` : "—"}`);
  }
}
const f = await get(`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10, "0")}.json`);
for (const tag of ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "NetIncomeLoss"]) {
  const xs = (f?.facts?.["us-gaap"]?.[tag]?.units?.USD ?? []).filter((x) => x.end >= "2025-01-01" && x.form?.startsWith("10-"));
  console.log(`\n${tag} in 10-K/10-Q since 2025:`);
  for (const x of xs) console.log(`  ${x.start} to ${x.end}  ${x.val}  ${x.form} ${x.fp} frame=${x.frame ?? "-"}`);
}
