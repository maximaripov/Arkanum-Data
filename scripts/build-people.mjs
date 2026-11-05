#!/usr/bin/env node
// The insider directory for search: everyone who filed a Form 4 that the site has seen,
// kept for two years. data/people.json is the running record (cik → name, role, company,
// last filing); public/data/people.json is the compact list the search reads.
// Run after the insider files are updated (hourly and daily jobs).
import { readFile, writeFile } from "node:fs/promises";
import { mergeInsiders } from "../lib/insiderMerge.mjs";
import { personName, roleLabel, companyName } from "../lib/people.mjs";

const read = async (f) => { try { return JSON.parse(await readFile(f, "utf8")); } catch { return null; } };
const known = (await read("data/people.json")) ?? {};
const { trades } = mergeInsiders(await read("public/data/insiders.json"), await read("public/data/insiders-today.json"));

let added = 0;
for (const t of trades) {
  if (!t.ownerCik || !t.owner) continue;
  const when = t.filed || t.date;
  const p = known[t.ownerCik];
  if (p && p.last >= when) continue;
  if (!p) added++;
  known[t.ownerCik] = { n: personName(t.owner), r: roleLabel(t.role), s: t.symbol, c: companyName(t.issuer, t.symbol), last: when };
}
// Forget people with no filing in two years.
const cutoff = new Date(Date.now() - 730 * 86_400_000).toISOString().slice(0, 10);
for (const [cik, p] of Object.entries(known)) if (p.last < cutoff) delete known[cik];

await writeFile("data/people.json", JSON.stringify(known));
// Common names of well-known insiders (from build-famous.mjs: Wikipedia's "Jensen Huang" for
// SEC's "Jen Hsun Huang"), so searching either finds them.
const alias = new Map(((await read("public/data/famous.json"))?.people ?? []).map((p) => [p.cik, p.label]));
// [cik, name, symbol, role, common name?] — most recent filers first, so they rank first among equal matches.
const list = Object.entries(known).sort((a, b) => b[1].last.localeCompare(a[1].last))
  .map(([cik, p]) => (alias.has(cik) && alias.get(cik) !== p.n ? [cik, p.n, p.s, p.r, alias.get(cik)] : [cik, p.n, p.s, p.r]));
await writeFile("public/data/people.json", JSON.stringify(list));
console.log(`people.json: ${list.length} insiders (${added} new)`);
