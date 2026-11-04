// House transaction reports (scripts/lib/congress.mjs), from real pdftotext -layout output.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePtr, stateDistrict } from "../scripts/lib/congress.mjs";

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
