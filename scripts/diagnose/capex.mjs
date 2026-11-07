#!/usr/bin/env node
// Diagnostic (run on GitHub): every capital-spending-like and operating-cash-flow-like label a
// company uses in its annual reports, and what SEC's yearly frames say for one company.
//   node scripts/diagnose/capex.mjs COP,PSX,VLO AMZN
const UA = process.env.SEC_USER_AGENT;
const [list = "", framesFor = ""] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (u) => { const r = await fetch(u, { headers: { "User-Agent": UA } }); await sleep(150); return r.ok ? r.json() : null; };
const tickers = Object.values(await get("https://www.sec.gov/files/company_tickers.json"));
const cikOf = (t) => tickers.find((c) => c.ticker === t.replace(".", "-"))?.cik_str;
const LIKE = /Capital|Expenditure|PropertyPlant|ProductiveAssets|OilAndGas|Construction|Develop|OperatingActivities/;

for (const t of list.split(",").filter(Boolean)) {
  const c = cikOf(t);
  const f = c ? await get(`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(c).padStart(10, "0")}.json`) : null;
  console.log(`\n${t} (${f?.entityName ?? "not found"}, CIK ${c})`);
  for (const [ns, tags] of Object.entries(f?.facts ?? {})) for (const [k, v] of Object.entries(tags)) {
    if (!LIKE.test(k)) continue;
    const fy = (v.units?.USD ?? []).filter((x) => /^(10-K|20-F|40-F)/.test(x.form) && x.start && x.end >= "2024-01-01").sort((a, b) => b.end.localeCompare(a.end))[0];
    if (fy) console.log(`  ${ns}:${k} = ${fy.val} (${fy.start} to ${fy.end}, ${fy.form})`);
  }
}
const OCF = ["NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"];
const CAPEX = ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets", "PaymentsToAcquireOtherPropertyPlantAndEquipment",
  "PaymentsToAcquireOtherProductiveAssets", "PaymentsToAcquireOilAndGasPropertyAndEquipment", "PaymentsForProceedsFromProductiveAssets"];
for (const t of framesFor.split(",").filter(Boolean)) {
  const c = cikOf(t);
  console.log(`\n${t}: SEC yearly frames (the screener's source)`);
  for (const tag of [...OCF, ...CAPEX]) for (const p of ["CY2024", "CY2025"]) {
    const d = await get(`https://data.sec.gov/api/xbrl/frames/us-gaap/${tag}/USD/${p}.json`);
    const row = d?.data?.find((x) => x.cik === c);
    if (row) console.log(`  ${tag} ${p}: ${row.val} (${row.start} to ${row.end}, ${row.accn})`);
  }
}
