// The home page summary (lib/overview.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildOverview } from "../lib/overview.mjs";
import { withConviction } from "../lib/conviction.mjs";

const t = (over) => ({ accession: over.symbol + over.owner + over.code, code: "P", role: "Director", owner: "A", ownerCik: "1", shares: 1000, ownedAfter: 2000, value: 100_000, planned: false, date: "2026-11-02", filed: "2026-11-03", issuer: over.symbol + " INC", ...over });

test("overview: officer and director buys only, group buys, strongest per company", () => {
  const trades = withConviction([
    t({ symbol: "AAA", owner: "A" }), t({ symbol: "AAA", owner: "B" }), t({ symbol: "AAA", owner: "C", value: 50_000 }),
    t({ symbol: "BBB", owner: "D", role: "Chief Executive Officer", value: 2_000_000 }),
    t({ symbol: "FUND", owner: "BIG FUND LP", role: "10% owner", value: 9_000_000 }), // not an insider buy
    t({ symbol: "CCC", owner: "E", code: "S", role: "Chief Executive Officer", shares: 50_000, ownedAfter: 50_000, value: 3_000_000 }),
  ]);
  const o = buildOverview({ trades, days: ["2026-11-02", "2026-11-03"], updated: "x" }, Date.parse("2026-11-04T12:00:00Z"));
  assert.equal(o.totals.buys, 4);
  assert.equal(o.totals.value, 2_250_000);
  assert.equal(o.totals.people, 4);
  assert.equal(o.clusterCount, 1);
  assert.deepEqual(o.clusters[0], { symbol: "AAA", issuer: "AAA INC", value: 250_000, last: "2026-11-03", people: 3 });
  assert.deepEqual(o.strongest.map((x) => x.symbol).sort(), ["AAA", "BBB"]);
  assert.equal(o.hero.recent, true);
  assert.equal(o.totals.sales, 1);
  assert.equal(o.notableSales[0].symbol, "CCC");
  assert.equal(o.byDay.find((d) => d.key === "2026-11-03").value, 2_250_000);
});
