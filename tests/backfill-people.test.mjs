// The insider-directory backfill (scripts/backfill-people.mjs) on a tiny made-up quarterly
// data set: who gets added, and that a newer record already in the directory wins.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPT = resolve("scripts/backfill-people.mjs");
const day = (ago) => new Date(Date.now() - ago * 86_400_000).toISOString().slice(0, 10);

test("backfill adds buyers and $250K+ sellers, skips small sellers, keeps newer records", () => {
  const dir = mkdtempSync(join(tmpdir(), "people-"));
  const zips = join(dir, "zips"), files = join(dir, "files");
  mkdirSync(zips); mkdirSync(files); mkdirSync(join(dir, "data"));
  const now = new Date();
  const quarter = `${now.getUTCFullYear()}q${Math.floor(now.getUTCMonth() / 3) + 1}`;
  const recent = day(20);
  writeFileSync(join(files, "SUBMISSION.tsv"), ["ACCESSION_NUMBER\tFILING_DATE\tISSUERNAME\tISSUERTRADINGSYMBOL",
    `A1\t${recent}\tNVIDIA CORP\tNVDA`, `A2\t${recent}\tACME INC\tACME`, `A3\t${recent}\tBIGCO INC\tBIG`, `A4\t${recent}\tOLDCO INC\tOLD`].join("\n"));
  writeFileSync(join(files, "REPORTINGOWNER.tsv"), ["ACCESSION_NUMBER\tRPTOWNERCIK\tRPTOWNERNAME\tRPTOWNER_RELATIONSHIP\tRPTOWNER_TITLE",
    "A1\t0001197649\tHUANG JEN HSUN\tDirector,Officer\tPresident and CEO", "A2\t0000000002\tSMALL SELLER\tDirector\t", "A3\t0000000003\tBUYER BOB\tDirector\t", "A4\t0000000004\tKNOWN PERSON\tOfficer\tCFO"].join("\n"));
  writeFileSync(join(files, "NONDERIV_TRANS.tsv"), ["ACCESSION_NUMBER\tTRANS_CODE\tTRANS_SHARES\tTRANS_PRICEPERSHARE",
    "A1\tS\t10000\t180", "A2\tS\t100\t50", "A3\tP\t10\t5", "A4\tP\t100\t10"].join("\n"));
  execFileSync("zip", ["-qj", join(zips, `${quarter}.zip`), join(files, "SUBMISSION.tsv"), join(files, "REPORTINGOWNER.tsv"), join(files, "NONDERIV_TRANS.tsv")]);
  // Already known with a newer filing: must not be overwritten by the older backfill row.
  writeFileSync(join(dir, "data/people.json"), JSON.stringify({ 4: { n: "Known Person", r: "CFO", s: "NEW", c: "NewCo", last: day(1) } }));

  execFileSync("node", [SCRIPT, "--local", zips], { cwd: dir, stdio: "pipe" });
  const p = JSON.parse(readFileSync(join(dir, "data/people.json"), "utf8"));
  assert.equal(p["1197649"].s, "NVDA");
  assert.match(p["1197649"].n, /Huang/);
  assert.equal(p["3"].s, "BIG");
  assert.equal(p["2"], undefined, "a $5K sale isn't shown on the site, so it doesn't add anyone");
  assert.equal(p["4"].s, "NEW", "the newer record already there wins");
});
