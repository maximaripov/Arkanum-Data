// Signal scoring (lib/conviction.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { conviction, roleKind, stakeIncrease, withConviction, buyersBySymbol } from "../lib/conviction.mjs";

const buy = (over = {}) => ({ code: "P", symbol: "ABC", role: "Chief Executive Officer, Director", owner: "DOE JANE", ownerCik: "1", shares: 1000, ownedAfter: 3000, value: 300_000, planned: false, date: "2026-10-30", filed: "2026-11-02", ...over });

test("role kinds", () => {
  assert.equal(roleKind("Chief Executive Officer, Director"), "top");
  assert.equal(roleKind("CFO"), "top");
  assert.equal(roleKind("President & CEO"), "top");
  assert.equal(roleKind("SVP, General Counsel"), "officer");
  assert.equal(roleKind("Director"), "director");
  assert.equal(roleKind("Director, 10% owner"), "director");
  assert.equal(roleKind("10% owner"), "owner");
  assert.equal(roleKind("Other"), "owner");
});

test("stake increase from shares owned after the trade", () => {
  assert.equal(stakeIncrease({ shares: 1000, ownedAfter: 3000 }), 50); // 2,000 before → +50%
  assert.equal(stakeIncrease({ shares: 1000, ownedAfter: 1000 }), Infinity); // first shares
  assert.equal(stakeIncrease({ shares: 1000, ownedAfter: 500 }), null); // holding from another account
  assert.equal(stakeIncrease({ shares: 1000, ownedAfter: null }), null);
});

test("only purchases are scored", () => {
  assert.equal(conviction(buy({ code: "S" })), null);
  assert.equal(conviction(null), null);
});

test("a CEO doubling her stake in her first buy in years is a strong signal", () => {
  const c = conviction(buy({ prevBuy: null, prevBuyYears: 5 }));
  assert.equal(c.tier, "strong");
  assert.deepEqual(c.reasons.map((r) => r.text), ["CEO", "Stake +50%", "First buy in 5+ years"]);
});

test("pre-planned trades and major-shareholder-only buyers score low", () => {
  const planned = conviction(buy({ planned: true }));
  assert.ok(planned.score < conviction(buy()).score);
  assert.ok(planned.reasons.some((r) => r.neg && r.text === "Pre-planned"));
  const owner = conviction(buy({ role: "10% owner" }));
  assert.ok(owner.score <= conviction(buy()).score - 25); // well below a CEO making the same buy
  assert.ok(owner.reasons.some((r) => r.neg && /Major shareholder/.test(r.text)));
});

test("token purchases are capped however unusual", () => {
  const tiny = conviction(buy({ value: 1_000, shares: 10, ownedAfter: 10, prevBuy: null, prevBuyYears: 5 }), { insiders: 4 });
  assert.equal(tiny.tier, "routine");
  assert.ok(tiny.score <= 39);
  const small = conviction(buy({ value: 20_000, prevBuy: null, prevBuyYears: 5 }), { insiders: 4 });
  assert.ok(small.score <= 59);
});

test("several insiders buying adds to the score", () => {
  assert.ok(conviction(buy(), { insiders: 3 }).score > conviction(buy(), { insiders: 1 }).score);
  assert.ok(conviction(buy(), { insiders: 3 }).reasons.some((r) => r.text === "3 insiders buying"));
});

test("scores stay between 0 and 100", () => {
  for (const t of [buy({ planned: true, role: "10% owner", value: 0 }), buy({ value: 1e9, shares: 1e6, ownedAfter: 1e6, prevBuy: null, prevBuyYears: 5 })]) {
    const c = conviction(t, { insiders: 10 });
    assert.ok(c.score >= 0 && c.score <= 100);
  }
});

test("counts distinct executives per stock, by SEC ID, ignoring 10% holders", () => {
  const trades = [buy({ ownerCik: "1" }), buy({ ownerCik: "1" }), buy({ ownerCik: "2", role: "Director" }), buy({ ownerCik: "3", role: "10% owner" }), buy({ symbol: "XYZ", ownerCik: "4" })];
  const n = buyersBySymbol(trades);
  assert.equal(n.get("ABC"), 2);
  assert.equal(n.get("XYZ"), 1);
  const scored = withConviction(trades);
  assert.ok(scored[0].conv.reasons.some((r) => r.text === "2 insiders buying"));
  assert.equal(withConviction([{ ...buy(), code: "S" }])[0].conv, undefined);
});
