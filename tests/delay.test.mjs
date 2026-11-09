import { test } from "node:test";
import assert from "node:assert/strict";
import { delayFields, delayTables } from "../scripts/lib/delay.mjs";

// Trading days from 2024-01-01; the stock rises 1% a day, the S&P 500 is flat.
const days = Array.from({ length: 300 }, (_, i) => new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10));
const stock = days.map((d, i) => [d, 100 * 1.01 ** i, 100 * 1.01 ** i]);
const spy = days.map((d) => [d, 400, 400]);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);

test("delayFields: head start, insider and follower six months", () => {
  const d = delayFields(stock, spy, { date: "2024-01-03", filed: "2024-01-05" });
  assert.equal(d.lag, 3); // close on Jan 3 -> first close after Jan 5 (Jan 6)
  near(d.pre, 1.01 ** 3 - 1);
  near(d.ins6, 1.01 ** 126 - 1);
  near(d.fol6, 1.01 ** 126 - 1);
  assert.equal(delayFields(stock, spy, { date: "2025-06-01", filed: "2025-06-02" }), null); // no prices
  assert.equal(delayFields(stock.slice(50), spy, { date: "2024-01-03", filed: "2024-01-05" }), null); // later listing
});

test("delayTables: groups and filing-delay buckets", () => {
  const rows = Array.from({ length: 40 }, (_, k) => {
    const e = { date: days[k], filed: days[k + (k % 2 ? 1 : 7)] };
    return { ...e, value: k, delay: delayFields(stock, spy, e) };
  });
  const t = delayTables(rows, { All: () => true });
  assert.equal(t.groups[0][1].n, 40);
  const late = Object.fromEntries(t.lags)["Late: 6+ trading days"];
  assert.equal(late.n, 20);
  assert.ok(late.pre.median > Object.fromEntries(t.lags)["2 trading days"].pre.median);
});
