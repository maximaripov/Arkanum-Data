#!/usr/bin/env node
// Fills the insider search directory (data/people.json) with everyone who made an open-market
// trade the site would show (any purchase, or sales of $250K+ in one filing) over the last
// two years, from SEC's quarterly insider data sets. The hourly and daily jobs only add
// people as new filings arrive, so before this someone like a CEO who last sold a year ago
// couldn't be found by name. Run build-people.mjs afterwards to rebuild the public list.
//   node scripts/backfill-people.mjs [--tmp /tmp/form4-people] [--local dir-of-zips]
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { quarterRange, qName, qNum, tsv, isoDate, roleOf, getZip } from "./lib/form345.mjs";
import { personName, roleLabel, companyName } from "../lib/people.mjs";
import { MIN_SALE, UA as SEC_UA_CLEAN } from "./lib/sec.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const TMP = arg("tmp", "/tmp/form4-people"), LOCAL = arg("local", null);
const UA = process.env.SEC_USER_AGENT ? SEC_UA_CLEAN : undefined;
if (!UA && !LOCAL) throw new Error("Set SEC_USER_AGENT (SEC refuses requests without contact details)");

const now = new Date();
const cutoff = new Date(now.getTime() - 730 * 86_400_000).toISOString().slice(0, 10);
const thisQ = qNum(`${now.getUTCFullYear()}q${Math.floor(now.getUTCMonth() / 3) + 1}`);
const quarters = quarterRange(qName(thisQ - 8), qName(thisQ)); // unpublished quarters are skipped

const read = async (f) => { try { return JSON.parse(await readFile(f, "utf8")); } catch { return null; } };
const known = (await read("data/people.json")) ?? {};
const before = Object.keys(known).length;
await mkdir(TMP, { recursive: true });

for (const quarter of quarters) {
  const zip = await getZip(quarter, { tmp: TMP, local: LOCAL, ua: UA });
  if (!zip) { console.log(`${quarter}: not published yet`); continue; }
  const sub = tsv(zip, "SUBMISSION.tsv"), own = tsv(zip, "REPORTINGOWNER.tsv"), tr = tsv(zip, "NONDERIV_TRANS.tsv");
  const S = (n) => sub.col(n), O = (n) => own.col(n), T = (n) => tr.col(n);
  const subs = new Map(sub.rows.map((r) => [r[S("ACCESSION_NUMBER")], { filed: isoDate(r[S("FILING_DATE")]), issuer: r[S("ISSUERNAME")], symbol: (r[S("ISSUERTRADINGSYMBOL")] ?? "").trim().toUpperCase() }]));
  const owners = new Map();
  for (const r of own.rows) {
    const a = r[O("ACCESSION_NUMBER")]; if (!owners.has(a)) owners.set(a, []);
    owners.get(a).push({ cik: String(Number(r[O("RPTOWNERCIK")])), name: r[O("RPTOWNERNAME")], role: roleOf(r[O("RPTOWNER_RELATIONSHIP")], r[O("RPTOWNER_TITLE")]) });
  }
  // Open-market purchases and sales per filing; a filing counts if it has any purchase or $250K+ of sales.
  const filings = new Map();
  for (const r of tr.rows) {
    const code = (r[T("TRANS_CODE")] ?? "").trim();
    if (code !== "P" && code !== "S") continue;
    const a = r[T("ACCESSION_NUMBER")];
    const f = filings.get(a) ?? { buy: false, sold: 0 };
    if (code === "P") f.buy = true;
    else f.sold += (+r[T("TRANS_SHARES")] || 0) * (+r[T("TRANS_PRICEPERSHARE")] || 0);
    filings.set(a, f);
  }
  let added = 0, updated = 0;
  for (const [a, f] of filings) {
    if (!f.buy && f.sold < MIN_SALE) continue;
    const s = subs.get(a);
    if (!s?.filed || s.filed < cutoff || !s.symbol) continue;
    for (const o of owners.get(a) ?? []) {
      if (!o.cik || o.cik === "NaN" || !o.name) continue;
      const p = known[o.cik];
      if (p && p.last >= s.filed) continue;
      if (p) updated++; else added++;
      known[o.cik] = { n: personName(o.name), r: roleLabel(o.role), s: s.symbol, c: companyName(s.issuer, s.symbol), last: s.filed };
    }
  }
  console.log(`${quarter}: ${filings.size} filings with open-market trades → ${added} new people, ${updated} updated`);
  if (!LOCAL) await rm(zip, { force: true });
}

await mkdir("data", { recursive: true });
await writeFile("data/people.json", JSON.stringify(known));
console.log(`data/people.json: ${Object.keys(known).length} insiders (was ${before})`);
