#!/usr/bin/env node
// Does SEC's XBRL frames API give shares outstanding for most companies each quarter? (For the
// research lab's market-cap filter: shares outstanding × the entry price.) Read-only.
//   node scripts/diagnose/frames-check.mjs CY2024Q2I CY2026Q2I
const UA = process.env.SEC_USER_AGENT || "Arkanum diagnostics";
for (const p of process.argv.slice(2)) {
  for (const c of ["dei/EntityCommonStockSharesOutstanding", "us-gaap/CommonStockSharesOutstanding"]) {
    const r = await fetch(`https://data.sec.gov/api/xbrl/frames/${c}/shares/${p}.json`, { headers: { "User-Agent": UA } });
    if (!r.ok) { console.log(`${p} ${c}: HTTP ${r.status}`); continue; }
    const j = await r.json(); const by = new Map(j.data.map((d) => [d.cik, d.val]));
    console.log(`${p} ${c}: ${j.data.length} companies; Apple ${by.get(320193)}, NVIDIA ${by.get(1045810)}, Uxin ${by.get(1729173)}; ${Math.round(JSON.stringify(j).length / 1024)} KB`);
    await new Promise((s) => setTimeout(s, 300));
  }
}
