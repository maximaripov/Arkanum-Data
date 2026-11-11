import { test } from "node:test";
import assert from "node:assert/strict";
import { nyseHolidays, marketClosed } from "../lib/marketDays.mjs";

test("NYSE holidays, 2026 and 2027 (as published by NYSE)", () => {
  assert.deepEqual(nyseHolidays(2026), ["2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25", "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25"]);
  assert.deepEqual(nyseHolidays(2027), ["2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31", "2027-06-18", "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24"]);
  // Jan 1, 2028 is a Saturday: no closure on Friday Dec 31, 2027.
  assert.equal(nyseHolidays(2028).includes("2027-12-31"), false);
});

test("closed on weekends and holidays, open otherwise", () => {
  assert.equal(marketClosed("2026-11-26"), true); // Thanksgiving
  assert.equal(marketClosed("2026-11-07"), true); // Saturday
  assert.equal(marketClosed("2026-11-11"), false); // Veterans Day: stocks trade
  assert.equal(marketClosed("2026-11-27"), false); // day after Thanksgiving: early close, still open
});

test("SEC (federal) holidays, 2026 (as published by OPM)", async () => {
  const { secHolidays, secClosed } = await import("../lib/marketDays.mjs");
  assert.deepEqual(secHolidays(2026), ["2026-01-01", "2026-01-19", "2026-02-16", "2026-05-25", "2026-06-19", "2026-07-03", "2026-09-07", "2026-10-12", "2026-11-11", "2026-11-26", "2026-12-25"]);
  assert.equal(secClosed("2026-11-11"), true); // Veterans Day: NYSE open, EDGAR closed
  assert.equal(secClosed("2026-04-03"), false); // Good Friday: NYSE closed, EDGAR open
  assert.equal(secClosed("2026-11-12"), false);
});
