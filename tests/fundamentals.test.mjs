import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanRow, implausibleNetIncome } from "../lib/fundamentals.mjs";

test("mis-scaled net income is caught; real figures are kept", () => {
  assert.equal(implausibleNetIncome(87_000_000_000, 4092), true); // FedEx as tagged
  assert.equal(implausibleNetIncome(1_112_667_000, 302.64), true); // cents
  assert.equal(implausibleNetIncome(302_969_000_000, 192_879_000_000), false); // NVIDIA
  assert.equal(implausibleNetIncome(5_000_000, 1_200), false); // tiny company, tiny profit: possible
  assert.equal(implausibleNetIncome(2_000_000_000, -40_000_000), false); // a real loss
});

test("cleanRow blanks what depends on a bad figure, and absurd payouts", () => {
  const r = cleanRow({ rev: 87e9, ni: 4092, margin: 0, roe: 0, payout: 9e6, growth: 3 });
  assert.deepEqual([r.ni, r.margin, r.roe, r.payout, r.growth], [null, null, null, null, 3]);
  assert.equal(cleanRow({ rev: 1e9, ni: 1e8, payout: 250 }).payout, 250); // a REIT paying out 250%
  assert.equal(cleanRow({ rev: 1e9, ni: 1e8, payout: 5000 }).payout, null);
});
