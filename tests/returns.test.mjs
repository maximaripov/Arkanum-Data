import { test } from "node:test";
import assert from "node:assert/strict";
import { tradeReturns, summarize, median } from "../lib/returns.mjs";

const stock = [["2026-01-02", 10], ["2026-01-05", 11], ["2026-01-06", 12], ["2026-01-07", 15]];
const spy = [["2026-01-02", 100], ["2026-01-05", 101], ["2026-01-06", 102], ["2026-01-07", 105]];
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

test("since the trade starts at the trade date's close; since public at the first close after filing", () => {
  const r = tradeReturns(stock, spy, { traded: "2026-01-02", filed: "2026-01-05" });
  close(r.trade[0], 0.5); close(r.trade[1], 0.05); // 10 → 15, 100 → 105
  close(r.pub[0], 15 / 12 - 1); close(r.pub[1], 105 / 102 - 1); // filed on the 5th: starts at the 6th's close
});

test("a trade on a non-trading day starts at the next close", () => {
  const r = tradeReturns(stock, spy, { traded: "2026-01-03", filed: null });
  close(r.trade[0], 15 / 11 - 1);
  assert.equal(r.pub, null);
});

test("no return when the start is the latest close, or there is no price yet", () => {
  assert.deepEqual(tradeReturns(stock, spy, { traded: "2026-01-07", filed: "2026-01-07" }), { trade: null, pub: null });
  assert.deepEqual(tradeReturns(null, spy, { traded: "2026-01-02", filed: "2026-01-05" }), { trade: null, pub: null });
});

test("summary: medians and the share that beat the S&P", () => {
  const s = summarize([[0.1, 0.05], [-0.2, 0.01], [0.3, 0.1], null]);
  assert.equal(s.n, 3); close(s.stock, 0.1); close(s.spy, 0.05); close(s.beat, 2 / 3);
  assert.equal(summarize([null]), null);
  assert.equal(median([]), null);
});
