import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { failedClaims, oosSpan, OOS_CLAIMS } from "../lib/oosClaims.mjs";

const current = JSON.parse(readFileSync(new URL("../docs/backtest/oos-2026.json", import.meta.url)));
const clone = () => JSON.parse(JSON.stringify(current));
const setMedian = (r, group, v) => { r.tables.month.find(([g]) => g === group)[1]["6 months"].median = v; return r; };

test("the published 2026 results support every claim in the paper", () => {
  assert.deepEqual(failedClaims(current), []);
});

test("a result that contradicts the paper is caught", () => {
  assert.deepEqual(failedClaims(setMedian(clone(), "Director only", -0.01)).map((c) => c.id), ["directors"]);
  assert.deepEqual(failedClaims(setMedian(clone(), "Strong (60+)", 0.05)).map((c) => c.id), ["score"]);
  assert.equal(OOS_CLAIMS.length, 5);
});

test("a missing group is an error, not a pass", () => {
  const r = clone(); r.tables.month = r.tables.month.filter(([g]) => g !== "Value $1M+");
  assert.throws(() => failedClaims(r), /Value \$1M\+/);
});

test("date span wording", () => {
  assert.deepEqual(oosSpan({ from: "2026-01-01", to: "2026q3" }), { text: "January to September 2026", months: 9, years: "2026" });
  assert.deepEqual(oosSpan({ from: "2026-01-01", to: "2027q1" }), { text: "January 2026 to March 2027", months: 15, years: "2026–27" });
});

test("research-check blocks a shrunken sample and a contradicted claim, passes a good refresh", () => {
  const dir = mkdtempSync(join(tmpdir(), "oos-"));
  const old = join(dir, "old.json"), fresh = join(dir, "new.json"), reason = join(dir, "reason.txt");
  writeFileSync(old, JSON.stringify(current));
  const run = (r) => { writeFileSync(fresh, JSON.stringify(r)); return spawnSync(process.execPath, ["scripts/research-check.mjs", fresh, old, reason], { encoding: "utf8" }); };
  assert.equal(run({ ...clone(), kept: current.kept + 500 }).status, 0);
  const shrunk = run({ ...clone(), kept: Math.floor(current.kept * 0.8) });
  assert.equal(shrunk.status, 1);
  assert.match(readFileSync(reason, "utf8"), /sample shrank/);
  const flipped = run(setMedian(clone(), "Value $1M+", 0.02));
  assert.equal(flipped.status, 1);
  assert.match(readFileSync(reason, "utf8"), /\$1M or more/);
});
