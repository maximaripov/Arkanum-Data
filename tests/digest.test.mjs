import { test } from "node:test";
import assert from "node:assert/strict";
import { isUpcoming, isLateFiling, summarize, notification } from "../lib/digest.mjs";

const fivePm = new Date("2026-11-06T22:00:00Z"); // Fri Nov 6, 5:00 PM EST

test("events already out today are not 'next'", () => {
  assert.equal(isUpcoming({ date: "2026-11-06", time: "8:30 AM ET" }, fivePm), false);
  assert.equal(isUpcoming({ date: "2026-11-06", time: "2:00 PM ET" }, new Date("2026-11-06T18:00:00Z")), true); // 1 PM
  assert.equal(isUpcoming({ date: "2026-11-10", time: "8:30 AM ET" }, fivePm), true);
  assert.equal(isUpcoming({ date: "2026-11-05", time: null }, fivePm), false);
});

test("late filings: traded more than a week before filing", () => {
  assert.equal(isLateFiling({ date: "2026-07-26", filed: "2026-11-06" }), true); // the YPF case
  assert.equal(isLateFiling({ date: "2026-11-04", filed: "2026-11-06" }), false);
  assert.equal(isLateFiling({ date: "2026-10-30", filed: "2026-11-06" }), false); // exactly 7 days
});

const d = {
  kind: "daily", title: "Daily digest · Fri, Nov 6",
  totals: { buys: 9, value: 3_200_000 },
  buys: [{ name: "Mike Manley", role: "CEO", symbol: "AN", value: 1_400_000 }],
  clusters: [{ symbol: "UPBD", company: "Upbound Group", insiders: 7, value: 1_343_739 }],
  funds: [], events: [{ title: "CPI inflation", day: "Tue, Nov 10" }],
};
const quiet = { ...d, totals: { buys: 0, value: 0 }, buys: [], clusters: [] };

test("summary: plain sentences, at most three", () => {
  assert.deepEqual(summarize(d), [
    "Nine insider buys were filed today, $3.2M in total; the biggest by a person was Mike Manley at AN, $1.4M.",
    "Seven insiders at Upbound Group (UPBD) bought over the past week, $1.3M together.",
    "Next: CPI inflation, Tue, Nov 10.",
  ]);
  assert.match(summarize(quiet)[0], /^No executive or director bought/);
});

test("notification says only Daily Digest (Weekly Digest on Saturday)", () => {
  assert.deepEqual(notification(d), { title: "Daily Digest", body: "" });
  assert.deepEqual(notification({ ...d, kind: "weekly" }), { title: "Weekly Digest", body: "" });
});

test("funds and companies are told apart from people", async () => {
  const { isEntity } = await import("../lib/people.mjs");
  assert.equal(isEntity("Baker Bros. Advisors LP, Baker Julian"), true);
  assert.equal(isEntity("GOVE SUE"), false);
});
