// Matching Wikidata's CEOs and chairs to the people who file Form 4s (scripts/lib/famous.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { sameName, matchFamous } from "../scripts/lib/famous.mjs";

test("common names match SEC legal names", () => {
  assert.ok(sameName("Jensen Huang", "Jen Hsun Huang"));
  assert.ok(sameName("Tim Cook", "Timothy D Cook"));
  assert.ok(sameName("Gilbert Cisneros Jr.", "Gilbert Ray Cisneros"));
  assert.ok(!sameName("Andy Jassy", "Jeffrey P Bezos"));
  assert.ok(!sameName("Mary Barra", "Thomas Barra"), "same surname, different first initial");
});

test("each Wikidata CEO is matched to the one filer at that company with that name", () => {
  const directory = {
    1197649: { n: "Jen Hsun Huang", r: "CEO & director", s: "NVDA", c: "NVIDIA Corp", last: "2026-10-20" },
    2: { n: "Colette Kress", r: "CFO", s: "NVDA", c: "NVIDIA Corp", last: "2026-10-01" },
    3: { n: "Jeffrey P Bezos", r: "Executive Chair", s: "AMZN", c: "Amazon", last: "2026-09-01" },
    4: { n: "John Smith", r: "director", s: "ACME", c: "Acme", last: "2026-01-01" },
    5: { n: "Jane Smith", r: "CFO", s: "ACME", c: "Acme", last: "2026-01-01" },
  };
  const tickers = new Map([[1045810, new Set(["NVDA"])], [1018724, new Set(["AMZN"])], [99, new Set(["ACME"])]]);
  const rows = [
    { cik: "0001045810", label: "Jensen Huang", title: "Jensen_Huang" },
    { cik: "0001018724", label: "Jeff Bezos", title: "Jeff_Bezos" },
    { cik: "0001018724", label: "Andy Jassy", title: "Andy_Jassy" }, // not in the directory: left out
    { cik: "0000000099", label: "J. Smith", title: "J._Smith" }, // two Smiths starting with J: ambiguous, left out
    { cik: "0000000123", label: "Nobody Known", title: "Nobody" }, // company without a ticker
  ];
  const got = matchFamous(rows, directory, tickers);
  assert.deepEqual(got.map((x) => [x.cik, x.label]), [["1197649", "Jensen Huang"], ["3", "Jeff Bezos"]]);
  assert.equal(got[0].role, "CEO & director", "the role comes from the filings, not Wikidata");
});
