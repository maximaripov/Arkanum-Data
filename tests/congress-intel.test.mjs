// House trades read together (scripts/lib/congress-intel.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { sectorOf, sectorExposure, overlaps, trackRecord, committeesFor, inCommitteeSector, MIN_TRADES } from "../scripts/lib/congress-intel.mjs";

const sectors = new Map([["NVDA", "Technology"], ["GOOGL", "Communication Services"], ["BRK-B", "Financials"], ["JPM", "Financials"]]);
const t = (x) => ({ member: "A", ticker: "NVDA", asset: "NVIDIA", type: "P", date: "2026-06-01", filed: "2026-06-20", min: 1001, max: 15000, ...x });

test("sectorOf tries share-class spellings", () => {
  assert.equal(sectorOf("GOOG", sectors), "Communication Services");
  assert.equal(sectorOf("BRK.B", sectors), "Financials");
  assert.equal(sectorOf("TSM", sectors), null);
});

test("sectorExposure sums estimated dollars by sector", () => {
  const r = sectorExposure([t(), t({ type: "S" }), t({ ticker: "TSM" }), t({ ticker: "JPM", min: 50001, max: 100000 })], sectors);
  assert.deepEqual(r.map((x) => [x.sector, x.buy, x.sell]), [["Financials", 75001, 0], ["Technology", 8001, 8001], ["Other or foreign", 8001, 0]]);
});

test("overlaps: two or more members buying within 30 days", () => {
  const r = overlaps([t(), t({ member: "B", date: "2026-06-20" }), t({ member: "C", date: "2026-09-01" }), t({ ticker: "JPM" }), t({ ticker: "JPM", member: "A", date: "2026-06-05" }), t({ member: "D", type: "S" })]);
  assert.equal(r.length, 1);
  assert.deepEqual([r[0].t, r[0].members, r[0].first, r[0].last], ["NVDA", ["A", "B"], "2026-06-01", "2026-06-20"]);
});

test("trackRecord: verdict only when the range excludes zero and the sample is big enough", () => {
  const many = (diff) => Array.from({ length: 12 }, (_, i) => t({ filed: `2026-0${1 + (i % 6)}-10`, ret: [diff + (i % 3) * 0.01, 0] }));
  assert.equal(trackRecord(many(0.1)).verdict, "beat");
  assert.equal(trackRecord(many(-0.1)).verdict, "trailed");
  const mixed = Array.from({ length: 12 }, (_, i) => t({ filed: `2026-0${1 + (i % 6)}-10`, ret: [i % 2 ? 0.2 : -0.2, 0] }));
  assert.equal(trackRecord(mixed).verdict, "no clear edge");
  assert.equal(trackRecord(many(0.1).slice(0, MIN_TRADES - 1)).verdict, "too few");
  assert.equal(trackRecord([t()]), null);
});

test("committees and the sectors they cover", () => {
  const membership = { HSBA: [{ bioguide: "X1" }], HSBA01: [{ bioguide: "X1" }], HSAS: [{ bioguide: "Y2" }] };
  assert.deepEqual(committeesFor("X1", membership), ["HSBA"]);
  assert.equal(inCommitteeSector(t({ ticker: "JPM" }), ["HSBA"], sectors), true);
  assert.equal(inCommitteeSector(t(), ["HSBA"], sectors), false);
});
