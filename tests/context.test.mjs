// Trade and company context (lib/context.mjs): facts, never forecasts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { businessDays, tradeNotes, othersAround, eventsAround, health, companyRisks, monthly } from "../lib/context.mjs";

const t = (x) => ({ code: "P", symbol: "XYZ", owner: "A", ownerCik: "1", date: "2026-10-05", filed: "2026-10-07", price: 20, value: 50_000, planned: false, ownedAfter: 100, ...x });

test("businessDays skips weekends", () => {
  assert.equal(businessDays("2026-11-06", "2026-11-10"), 2); // Fri -> Tue: Mon, Tue
  assert.equal(businessDays("2026-11-09", "2026-11-09"), 0);
});

test("tradeNotes: price under $5, pre-planned, late, whole stake, token buy", () => {
  assert.deepEqual(tradeNotes(t()), []);
  const n = tradeNotes(t({ price: 3, planned: true, filed: "2026-10-12", value: 5000 })).map((x) => x.text);
  assert.deepEqual(n, ["Share price under $5", "Pre-planned (10b5-1)", "Filed late (5 business days)", "Small purchase (under $10K)"]);
  assert.deepEqual(tradeNotes(t({ code: "A" })), []);
});

test("othersAround counts other people trading the same way within the window", () => {
  const all = [t(), t({ owner: "B", ownerCik: "2", date: "2026-10-20" }), t({ owner: "C", ownerCik: "3", date: "2026-12-20" }), t({ owner: "D", ownerCik: "4", code: "S" }), t({ date: "2026-10-06" })];
  assert.equal(othersAround(all[0], all), 1);
});

test("eventsAround keeps 8-Ks within 30 days, with the gap", () => {
  const news = [{ date: "2026-09-30", items: ["Quarterly results"], link: "a" }, { date: "2026-12-30", items: ["x"], link: "b" }, { date: "2026-10-15", items: ["Executive or board change"], link: "c" }];
  assert.deepEqual(eventsAround(t(), news).map((a) => a.gap), [-5, 10]);
});

test("health and companyRisks state facts", () => {
  assert.deepEqual(health({ ni: -1, margin: -3, growth: 4.2, fcf: -2, de: 3.1 }).map((x) => x.tone), ["weak", "good", "weak", "weak"]);
  const news = [{ date: "2026-10-01", items: ["Executive or board change"], link: "a" }, { date: "2026-08-01", items: ["Executive or board change", "Changed auditor"], link: "b" }];
  const r = companyRisks({ ni: -1, fcf: -1, de: 1 }, news, "2026-11-12").map((x) => x.text);
  assert.deepEqual(r, ["Changed auditor (8-K, 2026-08-01)", "2 executive or board changes in six months", "Losing money and burning cash"]);
});

test("monthly sums buys and sales by month, oldest first", () => {
  const m = monthly([t({ value: 10 }), t({ code: "S", value: 5 }), t({ date: "2025-01-01", value: 99 })], 3, "2026-11-12");
  assert.deepEqual(m, [{ month: "2026-09", buy: 0, sell: 0 }, { month: "2026-10", buy: 10, sell: 5 }, { month: "2026-11", buy: 0, sell: 0 }]);
});
