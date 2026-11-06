// Combining partial fills, which trades to keep, and merging today's file into the 30-day file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeFills, keepTrade, form4Files } from "../scripts/lib/sec.mjs";
import { mergeInsiders } from "../lib/insiderMerge.mjs";

const fill = (over = {}) => ({ accession: "A1", code: "P", symbol: "ABC", role: "Director", owner: "X", shares: 100, price: 10, value: 1000, date: "2026-10-30", ownedAfter: 1100, filed: "2026-11-02", ...over });

test("partial fills of one filing become one trade at the average price", () => {
  const [m, ...rest] = mergeFills([fill(), fill({ shares: 300, price: 12, value: 3600, ownedAfter: 1400, date: "2026-10-31" })]);
  assert.equal(rest.length, 0);
  assert.equal(m.shares, 400);
  assert.equal(m.value, 4600);
  assert.equal(m.price, 11.5);
  assert.equal(m.date, "2026-10-31"); // latest fill
  assert.equal(m.ownedAfter, 1400); // holding after the last fill
});

test("buys and sales in one filing stay separate; other codes are dropped", () => {
  const out = mergeFills([fill(), fill({ code: "S" }), fill({ code: "A" }), fill({ code: "M" })]);
  assert.deepEqual(out.map((t) => t.code).sort(), ["P", "S"]);
});

test("keeps every buy but only sales of $250K or more", () => {
  assert.ok(keepTrade(fill()));
  assert.ok(!keepTrade(fill({ code: "S", value: 100_000 })));
  assert.ok(keepTrade(fill({ code: "S", value: 250_000 })));
  assert.ok(!keepTrade(fill({ symbol: "" })));
});

test("today's file adds only days and filings the 30-day file doesn't have", () => {
  const main = { updated: "2026-11-02T21:00:00Z", days: ["2026-10-30"], trades: [fill({ accession: "OLD", filed: "2026-10-30" })] };
  const today = {
    updated: "2026-11-03T15:00:00Z",
    trades: [
      fill({ accession: "NEW", filed: "2026-11-03" }),
      fill({ accession: "OLD", filed: "2026-11-03" }), // already in the 30-day file
      fill({ accession: "COVERED", filed: "2026-10-30" }), // a day the 30-day file covers in full
    ],
  };
  const m = mergeInsiders(main, today);
  assert.deepEqual(m.trades.map((t) => t.accession).sort(), ["NEW", "OLD"]);
  assert.deepEqual(m.days, ["2026-10-30", "2026-11-03"]);
  assert.equal(m.updated, "2026-11-03T15:00:00Z");
  assert.ok(m.trades.every((t) => t.conv)); // every buy is scored
});

test("works when today's file is missing", () => {
  const m = mergeInsiders({ days: [], trades: [] }, null);
  assert.deepEqual(m.trades, []);
});

test("a Form 4 listed under the company and each insider in the daily index is read once", () => {
  // SEC's form.idx lists a filing once per filer, each with that filer's CIK in the path.
  const idx = [
    "Form Type   Company Name                                                  CIK         Date Filed  File Name",
    "4           KKR Income Opportunities Fund                                 1515940     2026-10-14  edgar/data/1515940/0000945621-26-001261.txt",
    "4           Pimentel Rudy                                                 2006251     2026-10-14  edgar/data/2006251/0000945621-26-001261.txt",
    "4/A         Other Co                                                      111         2026-10-14  edgar/data/111/0000000001-26-000001.txt",
    "4           Other Co                                                      111         2026-10-14  edgar/data/111/0000000002-26-000002.txt",
  ].join("\n");
  assert.deepEqual(form4Files(idx), ["edgar/data/1515940/0000945621-26-001261.txt", "edgar/data/111/0000000002-26-000002.txt"]);
});

test("trades read straight from a file get the price-box correction too", async () => {
  const { cleanTrades } = await import("../lib/insiderMerge.mjs");
  const out = cleanTrades([
    fill({ accession: "X1", code: "S", shares: 189310, price: 270710.44, value: 51248193399 }),
    fill({ accession: "X2", code: "S", shares: 47171, price: 121664.57, value: 5739039431 }),
  ]);
  assert.equal(out.length, 1, "the corrected $121K sale is under the $250K cut-off");
  assert.equal(out[0].value, 270710);
});
