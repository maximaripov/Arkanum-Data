#!/usr/bin/env node
// Decides whether a paper's refreshed out-of-sample result can replace the published one.
//   node scripts/research-check.mjs <paper> <new results.json> [reason file]
// <paper> is a key of PAPERS in lib/researchClaims.mjs. Exit 0: safe to commit. Exit 1: don't
// commit; the reason is printed (and written to the reason file, sent to the owner's phone).
import { readFile, writeFile } from "node:fs/promises";
import { PAPERS, failedClaims, oosSpan } from "../lib/researchClaims.mjs";

const [paper, newPath, reasonPath] = process.argv.slice(2);
if (!PAPERS[paper]) throw new Error(`Unknown paper "${paper}"`);
const fresh = JSON.parse(await readFile(newPath, "utf8"));
const old = JSON.parse(await readFile(PAPERS[paper].file, "utf8"));

const P = PAPERS[paper];
const size = P.size ?? ((r) => r.kept), span = P.span ?? ((r) => oosSpan(r).text);
const problems = [];
// A sample that shrinks means a data source failed part-way (prices or a quarter), not new evidence.
if (size(fresh) < size(old) * (P.shrinkTolerance ?? 0.95)) problems.push(`the sample shrank from ${size(old)} to ${size(fresh)}, so some data probably failed to load`);
if (P.sameStart ? !P.sameStart(old, fresh) : P.check ? false : fresh.from !== old.from) problems.push("the test's start date changed");
if (!problems.length) {
  try { for (const c of failedClaims(paper, fresh)) problems.push(`no longer true: ${c.text}`); }
  catch (e) { problems.push(e.message); }
}

console.log(`${P.title}: ${size(fresh)}, ${span(fresh)} (was ${size(old)}, ${span(old)}).`);
if (!problems.length) { console.log("All claims still hold."); process.exit(0); }
const reason = `${PAPERS[paper].title} not updated: ${problems.join("; ")}. It keeps last month's figures until the text is rewritten.`;
console.log(reason);
if (reasonPath) await writeFile(reasonPath, reason);
process.exit(1);
