#!/usr/bin/env node
// Diagnostic (run on GitHub, where SEC is reachable): which capital-spending labels some
// companies use, and how a company's quarterly net income is reported.
//   node scripts/diagnose/fundamentals.mjs LLY,VZ,COP MDT
const UA = process.env.SEC_USER_AGENT;
const [capexList = "", niList = ""] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (u) => { const r = await fetch(u, { headers: { "User-Agent": UA } }); await sleep(150); return r.ok ? r.json() : null; };
const tickers = Object.values(await get("https://www.sec.gov/files/company_tickers.json"));
const cikOf = (t) => tickers.find((c) => c.ticker === t.replace(".", "-"))?.cik_str;
const facts = async (t) => { const c = cikOf(t); return c ? get(`https://data.sec.gov/api/xbrl/companyfacts/CIK${String(c).padStart(10, "0")}.json`) : null; };

for (const t of capexList.split(",").filter(Boolean)) {
  const f = await facts(t);
  const gaap = f?.facts?.["us-gaap"] ?? {};
  const hits = Object.keys(gaap).filter((k) => /^Payments(To|For)(Acquire|Capital|Construction|Develop)|ProductiveAssets|PropertyPlantAndEquipment.*Payments/.test(k));
  console.log(`\n${t} (${f?.entityName ?? "not found"})`);
  for (const k of hits) {
    const fy = (gaap[k].units?.USD ?? []).filter((x) => x.form === "10-K" || x.form === "20-F").sort((a, b) => b.end.localeCompare(a.end))[0];
    console.log(`  ${k}: ${fy ? `${fy.val} (${fy.start} to ${fy.end}, ${fy.form})` : "no annual value"}`);
  }
  const ocf = (gaap.NetCashProvidedByUsedInOperatingActivities?.units?.USD ?? []).filter((x) => x.form === "10-K" || x.form === "20-F").sort((a, b) => b.end.localeCompare(a.end))[0];
  console.log(`  operating cash flow: ${ocf ? `${ocf.val} (${ocf.start} to ${ocf.end})` : "none under NetCashProvidedByUsedInOperatingActivities"}`);
}
for (const t of niList.split(",").filter(Boolean)) {
  const f = await facts(t);
  const ni = (f?.facts?.["us-gaap"]?.NetIncomeLoss?.units?.USD ?? []).filter((x) => x.end >= "2024-06-01").sort((a, b) => a.end.localeCompare(b.end) || a.start.localeCompare(b.start));
  console.log(`\n${t} NetIncomeLoss since mid-2024 (start to end, value, form, frame):`);
  for (const x of ni) console.log(`  ${x.start} to ${x.end}  ${x.val}  ${x.form} ${x.fp ?? ""} ${x.frame ?? ""}`);
}
