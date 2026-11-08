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

const problems = [];
// A sample that shrinks means a data source failed part-way (prices or a quarter), not new evidence.
if (fresh.kept < old.kept * 0.95) problems.push(`the sample shrank from ${old.kept} to ${fresh.kept}, so some data probably failed to load`);
if (fresh.from !== old.from) problems.push(`the start date changed from ${old.from} to ${fresh.from}`);
if (!problems.length) {
  try { for (const c of failedClaims(paper, fresh)) problems.push(`no longer true: ${c.text}`); }
  catch (e) { problems.push(e.message); }
}

console.log(`${PAPERS[paper].title}: ${fresh.kept} trades, ${oosSpan(fresh).text} (was ${old.kept}, ${oosSpan(old).text}).`);
if (!problems.length) { console.log("All claims still hold."); process.exit(0); }
const reason = `${PAPERS[paper].title} not updated: ${problems.join("; ")}. It keeps last month's figures until the text is rewritten.`;
console.log(reason);
if (reasonPath) await writeFile(reasonPath, reason);
process.exit(1);
