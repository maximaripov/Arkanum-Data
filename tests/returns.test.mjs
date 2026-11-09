import { test } from "node:test";
import assert from "node:assert/strict";
import { tradeReturns, summarize, median, dailyCloses } from "../lib/returns.mjs";

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

test("a price paid far from that day's close (a reused ticker) gives no returns", () => {
  const withRaw = stock.map(([d, a]) => [d, a, a]);
  assert.notEqual(tradeReturns(withRaw, spy, { traded: "2026-01-02", filed: "2026-01-05", paid: 10.5 }).trade, null);
  assert.deepEqual(tradeReturns(withRaw, spy, { traded: "2026-01-02", filed: "2026-01-05", paid: 40 }), { trade: null, pub: null });
});

test("history that starts long after the trade (a later listing) gives no returns", () => {
  assert.deepEqual(tradeReturns(stock, spy, { traded: "2025-06-01", filed: "2025-06-03" }), { trade: null, pub: null });
});

test("dailyCloses: same URL all day and across a month, so Next's fetch cache is reused", async () => {
  const urls = [];
  const fetchImpl = async (u) => { urls.push(u); return { status: 404, ok: false }; };
  await dailyCloses("SPY", "2026-03-03", { fetchImpl });
  await dailyCloses("SPY", "2026-03-27", { fetchImpl });
  assert.equal(urls[0], urls[1]);
  const p2 = Number(new URL(urls[0]).searchParams.get("period2"));
  assert.equal(p2 % 86400, 0);
  assert.ok(p2 >= Date.now() / 1000);
});

test("dailyCloses: falls back to Tiingo when Yahoo fails, not when the symbol is unknown", async () => {
  const tiingo = [{ date: "2026-03-02T00:00:00.000Z", close: 20, adjClose: 19.5 }, { date: "2026-03-03T00:00:00.000Z", close: 21, adjClose: 20.5 }];
  const res = (status, body) => ({ status, ok: status === 200, json: async () => body });
  const run = async (yahooStatus, key) => {
    const urls = [];
    const fetchImpl = async (u) => { urls.push(u); return /tiingo/.test(u) ? res(200, tiingo) : res(yahooStatus, {}); };
    const old = process.env.TIINGO_API_KEY;
    if (key) process.env.TIINGO_API_KEY = key; else delete process.env.TIINGO_API_KEY;
    try { return { out: await dailyCloses("BRK.B", "2026-03-03", { fetchImpl }), urls }; } finally { if (old === undefined) delete process.env.TIINGO_API_KEY; else process.env.TIINGO_API_KEY = old; }
  };
  const failed = await run(500, "k");
  assert.deepEqual(failed.out, [["2026-03-02", 19.5, 20], ["2026-03-03", 20.5, 21]]);
  assert.match(failed.urls.at(-1), /tiingo\.com\/tiingo\/daily\/brk-b\/prices\?startDate=2026-02-19&endDate=/);
  const unknown = await run(404, "k");
  assert.equal(unknown.out, null);
  assert.ok(!unknown.urls.some((u) => /tiingo/.test(u)));
  assert.equal((await run(500, "")).out, null); // no key: no fallback
});
