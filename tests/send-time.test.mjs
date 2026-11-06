import { test } from "node:test";
import assert from "node:assert/strict";
import { nyNow, pastSendTime } from "../lib/sendTime.mjs";

test("5 PM in New York, winter and summer", () => {
  assert.equal(pastSendTime(new Date("2026-11-06T21:59:00Z")), false); // 4:59 PM EST
  assert.equal(pastSendTime(new Date("2026-11-06T21:59:50Z")), true); // 4:59:50, timer firing early
  assert.equal(pastSendTime(new Date("2026-11-06T22:00:00Z")), true); // 5:00 PM EST
  assert.equal(pastSendTime(new Date("2026-07-06T20:59:00Z")), false); // 4:59 PM EDT
  assert.equal(pastSendTime(new Date("2026-07-06T21:00:00Z")), true); // 5:00 PM EDT
});

test("New York date, not UTC date", () => {
  assert.equal(nyNow(new Date("2026-11-07T02:00:00Z")).date, "2026-11-06"); // 9 PM on the 6th
});
