#!/usr/bin/env node
// Diagnostic (run on GitHub): replays the screener's yearly cash-flow and revenue lookups for
// one company, to see which period each figure came from.
//   node scripts/diagnose/fcf.mjs AMZN
const UA = process.env.SEC_USER_AGENT;
const t = process.argv[2] ?? "AMZN";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (u) => { const r = await fetch(u, { headers: { "User-Agent": UA } }); await sleep(150); return r.ok ? r.json() : null; };
const cik = Object.values(await get("https://www.sec.gov/files/company_tickers.json")).find((c) => c.ticker === t)?.cik_str;
const Y = new Date().getUTCFullYear();
const groups = {
  ocf: ["NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"],
  capex: ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets", "PaymentsToAcquireOtherPropertyPlantAndEquipment",
    "PaymentsToAcquireOtherProductiveAssets", "PaymentsToAcquireOilAndGasPropertyAndEquipment", "PaymentsForProceedsFromProductiveAssets"],
  revenue: ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "RevenueFromContractWithCustomerIncludingAssessedTax", "SalesRevenueNet"],
};
console.log(`${t} CIK ${cik}`);
for (const [name, tags] of Object.entries(groups)) {
  for (const p of [`CY${Y - 3}`, `CY${Y - 2}`, `CY${Y - 1}`, `CY${Y}`]) for (const tag of tags) {
    const d = await get(`https://data.sec.gov/api/xbrl/frames/us-gaap/${tag}/USD/${p}.json`);
    for (const row of (d?.data ?? []).filter((x) => x.cik === cik)) console.log(`  ${name} ${p} ${tag}: ${row.val} (${row.start ?? "?"} to ${row.end}, ${row.accn})`);
  }
}
