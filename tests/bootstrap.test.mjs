import { test } from "node:test";
import assert from "node:assert/strict";
import { monthBootstrap } from "../lib/bootstrap.mjs";

test("the range is wide when months disagree and narrow when they agree", () => {
  const months = [], wide = [], tight = [];
  for (let m = 1; m <= 12; m++) for (let i = 0; i < 50; i++) { months.push(`2025-${String(m).padStart(2, "0")}`); wide.push(m % 2 ? 0.1 : -0.1); tight.push(0.01 + (i % 5) * 0.001); }
  const w = monthBootstrap(wide, months), t = monthBootstrap(tight, months);
  assert.ok(w.hi - w.lo > 0.1, `wide ${w.lo}..${w.hi}`);
  assert.ok(t.hi - t.lo < 0.01, `tight ${t.lo}..${t.hi}`);
  assert.equal(w.months, 12);
});

test("seeded: the same data gives the same range; one month gives none", () => {
  const v = [0.1, -0.2, 0.3, 0.05, -0.1, 0.2], m = ["a", "a", "b", "b", "c", "c"];
  assert.deepEqual(monthBootstrap(v, m), monthBootstrap(v, m));
  assert.equal(monthBootstrap([1, 2, 3], ["x", "x", "x"]), null);
});
