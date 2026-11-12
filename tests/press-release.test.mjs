// Press-release exhibits and headlines (lib/pressRelease.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { headline, pickExhibit } from "../lib/pressRelease.mjs";

test("pickExhibit finds exhibit 99.1 under common names", () => {
  assert.equal(pickExhibit(["aapl-20261030.htm", "a8-kex991q42026.htm", "a8-kex992.htm", "R1.htm"]), "a8-kex991q42026.htm");
  assert.equal(pickExhibit(["d123456d8k.htm", "d123456dex991.htm"]), "d123456dex991.htm");
  assert.equal(pickExhibit(["form8-k.htm", "ex99-1.htm"]), "ex99-1.htm");
  assert.equal(pickExhibit(["form8-k.htm", "exhibit99.htm"]), "exhibit99.htm");
  assert.equal(pickExhibit(["form8-k.htm", "ex10-1.htm"]), null);
});

test("headline skips exhibit labels, release tags and dates", () => {
  const html = `<html><head><title>x</title></head><body><p>Exhibit 99.1</p><p><b>FOR IMMEDIATE RELEASE</b></p><p>November 10, 2026</p>
    <p align=center><b>Acme Corp Reports Third Quarter 2026 Results &amp; Raises Full-Year Outlook</b></p>
    <p>NEW YORK, Nov. 10, 2026 /PRNewswire/ -- Acme Corp today announced...</p></body></html>`;
  assert.equal(headline(html), "Acme Corp Reports Third Quarter 2026 Results & Raises Full-Year Outlook");
});

test("headline gives up rather than return the body", () => {
  assert.equal(headline("<p>Exhibit 99.1</p><p>SAN JOSE, Calif., Nov. 3, 2026 /Business Wire/ -- Widget Inc. said today that it would...</p>"), null);
  assert.equal(headline(""), null);
});
