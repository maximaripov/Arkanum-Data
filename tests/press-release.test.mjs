// Press-release exhibits and headlines (lib/pressRelease.mjs), from shapes seen in real 8-Ks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { exhibitFromIndex, headline } from "../lib/pressRelease.mjs";

const row = (file, type) => `<tr><td scope="row">1</td><td scope="row">desc</td><td scope="row"><a href="/Archives/edgar/data/1/0001/${file}">${file}</a></td><td scope="row">${type}</td><td scope="row">123</td></tr>`;

test("exhibitFromIndex reads the type column, not the file name", () => {
  assert.equal(exhibitFromIndex(`<table>${row("nvda-20261111.htm", "8-K")}${row("nvidiaannouncesceotransiti.htm", "EX-99.1")}</table>`), "nvidiaannouncesceotransiti.htm");
  assert.equal(exhibitFromIndex(`<table>${row("a.htm", "8-K")}${row("sup.htm", "EX-99.2")}${row("pr.htm", "EX-99.1")}</table>`), "pr.htm");
  assert.equal(exhibitFromIndex(`<table>${row("a.htm", "8-K")}${row("ex10.htm", "EX-10.1")}</table>`), null);
});

test("headline skips exhibit labels, file names, release tags and dates", () => {
  const html = `<html><head><title>a8-kex991q4.htm</title></head><body><p>a8-kex991q4.htm</p><p>Exhibit 99.1</p><p><b>FOR IMMEDIATE RELEASE</b></p><p>November 10, 2026</p>
    <p align=center><b>Acme Corp Reports Third Quarter 2026 Results &amp; Raises Full-Year Outlook</b></p>
    <p>NEW YORK, Nov. 10, 2026 /PRNewswire/ -- Acme Corp today announced...</p></body></html>`;
  assert.equal(headline(html), "Acme Corp Reports Third Quarter 2026 Results & Raises Full-Year Outlook");
  assert.equal(headline("<p>PRESS RELEASE, DATED JULY 16, 2026</p><p>Heico Prices Offering of Senior Notes Due 2031</p>"), "Heico Prices Offering of Senior Notes Due 2031");
  assert.equal(headline("<p>Q3 2026 Update 1 Exhibit 99.1</p><p>Tesla Reports Third Quarter Results For 2026</p>"), "Tesla Reports Third Quarter Results For 2026");
});

test("headline joins a company name split onto its own line, without repeating it", () => {
  assert.equal(headline("<p>United Therapeutics</p><p>Corporation Announces Additional $2 Billion Share Repurchase</p>"), "United Therapeutics Corporation Announces Additional $2 Billion Share Repurchase");
  assert.equal(headline("<p>Dutch Bros</p><p>Dutch Bros Inc. Reports Third Quarter 2026 Financial Results</p>"), "Dutch Bros Inc. Reports Third Quarter 2026 Financial Results");
});

test("headline gives up on the body, agreements and financial statements", () => {
  assert.equal(headline("<p>Exhibit 99.1</p><p>SAN JOSE, Calif., Nov. 3, 2026 /Business Wire/ -- Widget Inc. said today that it would...</p>"), null);
  assert.equal(headline("<p>Settlement Agreement (this “Agreement”) is made and entered into as of the last date of signature</p>"), null);
  assert.equal(headline("<p>INDEX TO CONSOLIDATED FINANCIAL STATEMENTS</p>"), null);
  assert.equal(headline(""), null);
});

test("headline skips phone numbers, tables of contents and a name alone, and rejoins a wrapped line", () => {
  assert.equal(headline("<p>Victor H. Mendelson (305) 374-1745 ext. 7590</p><p>HEICO Corporation Reports Record Results for Third Quarter</p>"), "HEICO Corporation Reports Record Results for Third Quarter");
  assert.equal(headline("<p>Highlights 03 Financial Summary 04 Operational Summary 05 Outlook 09</p><p>Tesla Reports Third Quarter 2026 Financial Results</p>"), "Tesla Reports Third Quarter 2026 Financial Results");
  assert.equal(headline("<p>MATADOR RESOURCES COMPANY</p><p>MATADOR RESOURCES COMPANY INCREASES QUARTERLY CASH DIVIDEND</p>"), "MATADOR RESOURCES COMPANY INCREASES QUARTERLY CASH DIVIDEND");
  assert.equal(headline("<p>MATADOR RESOURCES COMPANY CLOSES PALOMA ACQUISITION AND</p><p>RAISES FULL-YEAR PRODUCTION GUIDANCE</p><p>DALLAS--Matador said...</p>"), "MATADOR RESOURCES COMPANY CLOSES PALOMA ACQUISITION AND RAISES FULL-YEAR PRODUCTION GUIDANCE");
});

test("headline keeps a company name printed above it, and skips bond terms", () => {
  assert.equal(headline("<p>MATADOR RESOURCES COMPANY</p><p>REPORTS THIRD QUARTER 2026 RESULTS INCLUDING RECORD OIL PRODUCTION</p>"), "MATADOR RESOURCES COMPANY REPORTS THIRD QUARTER 2026 RESULTS INCLUDING RECORD OIL PRODUCTION");
  assert.equal(headline("<p>Senior Notes Due 2036 (the “Notes”)</p>"), null);
});
