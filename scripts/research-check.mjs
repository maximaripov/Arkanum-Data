#!/usr/bin/env node
// Decides whether a refreshed out-of-sample result can replace the published one.
//   node scripts/research-check.mjs <new results.json> <current oos-2026.json> [reason file]
// Exit 0: safe to commit. Exit 1: don't commit; the reason is printed (and written to the
// reason file, which the workflow sends to the owner's phone).
import { readFile, writeFile } from "node:fs/promises";
import { failedClaims, oosSpan } from "../lib/oosClaims.mjs";

const [newPath, oldPath, reasonPath] = process.argv.slice(2);
const fresh = JSON.parse(await readFile(newPath, "utf8"));
const old = JSON.parse(await readFile(oldPath, "utf8"));

const problems = [];
// A sample that shrinks means a data source failed part-way (prices or a quarter), not new evidence.
if (fresh.kept < old.kept * 0.95) problems.push(`the sample shrank from ${old.kept} to ${fresh.kept} purchases, so some data probably failed to load`);
if (fresh.from !== old.from) problems.push(`the start date changed from ${old.from} to ${fresh.from}`);
if (!problems.length) for (const c of failedClaims(fresh)) problems.push(`no longer true: ${c.text}`);

console.log(`Out of sample: ${fresh.kept} purchases, ${oosSpan(fresh).text} (was ${old.kept}, ${oosSpan(old).text}).`);
if (!problems.length) { console.log("All paper claims still hold."); process.exit(0); }
const reason = `Not published: ${problems.join("; ")}. The paper keeps last month's figures until section 4.5 is rewritten.`;
console.log(reason);
if (reasonPath) await writeFile(reasonPath, reason);
process.exit(1);
