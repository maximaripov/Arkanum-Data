// House transaction reports (scripts/lib/congress.mjs), from real pdftotext -layout output.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dedupeReports, parsePtr, stateDistrict } from "../scripts/lib/congress.mjs";

const report = `
ID         Owner Asset                                            Transaction Date                 Notification Amount                   Cap.
           SP          Farmers & Merchants Bancorp, Inc.          P                 10/20/2026 10/20/2026             $1,001 - $15,000
                       (FMAO) [ST]
                       F      S       : New
          JT          Datadog, Inc. - Class A Common         P              09/28/2026 10/01/2026         $50,001 -
                      Stock (DDOG) [ST]                                                                $100,000
                      F      S     : New
                      Amgen Inc. - Common Stock (AMGN) P                            09/22/2026 10/01/2026             $1,001 - $15,000
                      [ST]
          DC          Apple Inc. - Common Stock (AAPL)       S (partial)    09/08/2026 09/15/2026         $1,001 - $15,000
                      [ST]
           SP          Honeywell Aerospace Inc. - Common          S                 09/29/2026 10/29/2026             $710.52
                       Stock (HONA) [ST]
           JT          ARBUCKLE MEM HOSP AUTH            P                   09/08/2026 09/15/2026         $15,001 -
                       OKLA SALES TAX 03.00000%                                                            $50,000
                       01/01/2027 REV BDS SER. 2018 [GS]
* For the complete list of asset type abbreviations
`;

test("house reports: rows, owners, tickers, wrapped amounts, exact amounts", () => {
  const r = parsePtr(report);
  assert.equal(r.length, 6);
  assert.deepEqual(r.map((x) => [x.owner, x.ticker, x.type, x.min, x.max]), [
    ["SP", "FMAO", "P", 1001, 15000],
    ["JT", "DDOG", "P", 50001, 100000],
    ["Self", "AMGN", "P", 1001, 15000],
    ["DC", "AAPL", "S", 1001, 15000],
    ["SP", "HONA", "S", 710.52, 710.52],
    ["JT", null, "P", 15001, 50000],
  ]);
  assert.equal(r[3].partial, true);
  assert.equal(r[0].date, "2026-10-20");
  assert.equal(r[1].asset, "Datadog, Inc. - Class A Common Stock");
  assert.equal(r[5].assetType, "GS");
});

test("state and district codes", () => {
  assert.deepEqual(stateDistrict("OH05"), { state: "OH", district: 5 });
  assert.deepEqual(stateDistrict("AKAL"), { state: "AK", district: 0 });
});

test("member page addresses", async () => {
  const { memberSlug } = await import("../lib/congress.mjs");
  assert.equal(memberSlug("Gilbert Ray Cisneros, Jr."), "gilbert-ray-cisneros-jr");
  assert.equal(memberSlug("María Elvira Salazar"), "maria-elvira-salazar");
  assert.equal(memberSlug("John J. McGuire III"), "john-j-mcguire-iii");
});

// Report 20035778 (Salazar): the same stocks bought the same day in two accounts.
const twoAccounts = `
                      NVIDIA Corporation - Common Stock P                           10/23/2026 11/01/2026             $1,001 - $15,000
                      (NVDA) [ST]
                      F      S       : New
                      S             O : UBS IRA Account


                      NVIDIA Corporation - Common Stock P                           10/23/2026 11/01/2026             $1,001 - $15,000
                      (NVDA) [ST]
                      F      S       : New
                      S             O : UBS Brokerage Account
`;
// Report 20035042 (Timmons): an amendment, with the filer's own transaction ID before the asset.
const amendment = `
2000164887                 SpaceX (SPCX) [OT]                      P                 06/15/2026 06/22/2026                $50,001 -
                                                                                                                          $100,000
                           F      S        : Amended
                           S              O : SCH Invest
                           L          : US
`;

test("house reports: account (subholding of) and filing status", () => {
  const r = parsePtr(twoAccounts);
  assert.deepEqual(r.map((x) => [x.ticker, x.account, x.amended]), [["NVDA", "UBS IRA Account", false], ["NVDA", "UBS Brokerage Account", false]]);
  const [a] = parsePtr(amendment);
  assert.deepEqual([a.asset, a.ticker, a.account, a.amended, a.min, a.max], ["SpaceX", "SPCX", "SCH Invest", true, 50001, 100000]);
});

const row = (doc, filed, extra = {}) => ({ doc, filed, member: "M", ticker: "XYZ", asset: "X", type: "P", date: "2026-06-01", owner: "Self", min: 1001, max: 15000, account: null, amended: false, ...extra });

test("dedupeReports: same report keeps every line; a later report's copy is dropped and noted", () => {
  const out = dedupeReports([row("2", "2026-07-15"), row("1", "2026-06-18"), row("1", "2026-06-18")]);
  assert.equal(out.length, 2); // report 1's two lines stay; report 2's single copy folds in
  assert.ok(out.every((t) => t.doc === "1"));
  assert.deepEqual(out[0].refiled, ["2"]);
});

test("dedupeReports: a later report with more identical lines keeps the surplus", () => {
  const out = dedupeReports([row("1", "2026-06-18"), row("2", "2026-07-15"), row("2", "2026-07-15")]);
  assert.deepEqual(out.map((t) => t.doc).sort(), ["1", "2"]);
});

test("dedupeReports: different accounts or dates are different trades", () => {
  assert.equal(dedupeReports([row("1", "2026-06-18", { account: "IRA" }), row("2", "2026-07-15", { account: "Brokerage" })]).length, 2);
  assert.equal(dedupeReports([row("1", "2026-06-18"), row("2", "2026-07-15", { date: "2026-06-02" })]).length, 2);
});

test("dedupeReports: an amendment that changes the amount updates the original", () => {
  const out = dedupeReports([row("1", "2026-06-18"), row("2", "2026-07-15", { amended: true, min: 15001, max: 50000 })]);
  assert.equal(out.length, 1);
  assert.deepEqual([out[0].doc, out[0].filed, out[0].min, out[0].max, out[0].amendedIn], ["1", "2026-06-18", 15001, 50000, "2"]);
});

test("dedupeReports: running it twice changes nothing", () => {
  const once = dedupeReports([row("1", "2026-06-18"), row("2", "2026-07-15"), row("3", "2026-08-01", { amended: true, max: 50000 })]);
  assert.deepEqual(dedupeReports(once.map((t) => ({ ...t }))), once);
});

test("dedupeReports: rows without a ticker are never merged across reports", () => {
  assert.equal(dedupeReports([row("1", "2026-06-18", { ticker: null }), row("2", "2026-07-15", { ticker: null })]).length, 2);
});
