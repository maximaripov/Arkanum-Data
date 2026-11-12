// The research lab's table, rules and statistics (lib/lab.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { encode, decode, applyRules, summarize, verdict, ROLE } from "../lib/lab.mjs";

const row = (x) => ({ filed: "2024-03-10", role: ROLE.officer, insiders: 1, value: 50_000, planned: false, mcap: 500e6, cheap: false, m1: 0.01, m3: 0.02, m6: -0.03, ...x });

test("encode and decode round-trip, returns in basis points, unknown market cap is -1", () => {
  const file = encode([row({}), row({ mcap: null, m6: null, planned: true })], { from: "2023-01-01", to: "2025-12-31" });
  assert.equal(file.n, 2);
  const [a, b] = decode(file);
  assert.deepEqual([a.m6, a.c, a.p, b.c, b.m6, b.p], [-300, 500, 0, -1, null, 1]);
});

test("applyRules: CEO only, 3+ insiders, $100K+, no pre-planned, minimum market cap, no stocks under $5", () => {
  const rows = decode(encode([
    row({ role: ROLE.ceo, insiders: 3, value: 200_000, mcap: 2e9 }),
    row({ role: ROLE.ceo, insiders: 1 }),
    row({ role: ROLE.top, insiders: 4, value: 150_000, planned: true }),
    row({ role: ROLE.director, value: 1e6, mcap: null }),
    row({ role: ROLE.ceo, insiders: 3, value: 200_000, mcap: 2e9, cheap: true }),
  ], {}));
  assert.equal(applyRules(rows, {}).length, 5);
  assert.equal(applyRules(rows, { ceoOnly: true }).length, 3);
  assert.equal(applyRules(rows, { topOnly: true, minInsiders: 3 }).length, 3);
  assert.equal(applyRules(rows, { minValue: 100_000, noPlanned: true }).length, 3);
  assert.equal(applyRules(rows, { minCapM: 1000 }).length, 2); // unknown market cap is left out once a minimum is set
  assert.equal(applyRules(rows, { ceoOnly: true, minInsiders: 3, minValue: 100_000, noUnder5: true }).length, 1);
});

test("summarize gives median, range and beat share; verdict needs the range to exclude zero", () => {
  const up = decode(encode(Array.from({ length: 60 }, (_, k) => row({ filed: `2024-${String(1 + (k % 12)).padStart(2, "0")}-05`, m6: 0.05 + (k % 5) * 0.01 })), {}));
  const s = summarize(up, "m6");
  assert.equal(s.n, 60); assert.equal(s.months, 12); assert.ok(s.lo > 0); assert.equal(s.beat, 1); assert.equal(verdict(s), "beat");
  const mixed = decode(encode(Array.from({ length: 60 }, (_, k) => row({ filed: `2024-${String(1 + (k % 12)).padStart(2, "0")}-05`, m6: k % 2 ? 0.1 : -0.1 })), {}));
  assert.equal(verdict(summarize(mixed, "m6")), "no clear edge");
  assert.equal(summarize([], "m6"), null);
});

import { roleCode, tradeAsRow, cleanRules, matches } from "../lib/lab.mjs";
const trade = (x) => ({ code: "P", filed: "2026-11-10", role: "Director, Chief Executive Officer", value: 250_000, shares: 10_000, price: 25, planned: false, ...x });

test("roleCode: CEO first, then top executives, directors, other officers", () => {
  assert.deepEqual(["Director, Chief Executive Officer", "Chief Financial Officer", "Director", "SVP, Operations"].map(roleCode), [ROLE.ceo, ROLE.top, ROLE.director, ROLE.officer]);
});

test("matches: a live purchase against a saved strategy, with market cap from shares outstanding", () => {
  const rules = { ceoOnly: true, minValue: 100_000, noPlanned: true, minInsiders: 2, minCapM: 1000 };
  assert.equal(matches(trade(), rules, { insiders: 2, shares: 100e6 }), true); // $2.5B company
  assert.equal(matches(trade(), rules, { insiders: 1, shares: 100e6 }), false); // only one insider buying
  assert.equal(matches(trade(), rules, { insiders: 2, shares: null }), false); // market cap unknown
  assert.equal(matches(trade({ planned: true }), rules, { insiders: 2, shares: 100e6 }), false);
  assert.equal(matches(trade({ code: "S" }), {}, {}), false);
  assert.equal(tradeAsRow(trade({ price: 3 })).u, 1);
});

test("cleanRules keeps only known rules with sane values", () => {
  assert.deepEqual(cleanRules({ ceoOnly: true, topOnly: true, minInsiders: "3", minValue: -5, minCapM: 2000, evil: "x" }), { ceoOnly: true, topOnly: false, minInsiders: 3, minValue: 0, noPlanned: false, minCapM: 2000, noUnder5: false });
  assert.equal(cleanRules(null), null);
});
