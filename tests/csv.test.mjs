// CSV export (lib/csv.mjs): quoting and formula-injection guard.
import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "../lib/csv.mjs";

test("toCsv quotes commas, quotes and newlines; keeps numbers", () => {
  const out = toCsv([{ a: 'Smith, "Jr."', b: -12.5, c: null, d: "line\nbreak" }], [["a", "Name"], ["b", "Value"], ["c", "Empty"], ["d", "Note"]]);
  assert.equal(out, 'Name,Value,Empty,Note\r\n"Smith, ""Jr.""",-12.5,,"line\nbreak"\r\n');
});

test("toCsv neutralises spreadsheet formulas", () => {
  assert.equal(toCsv([{ a: "=HYPERLINK(\"x\")" }, { a: "@SUM(A1)" }, { a: "-5" }], [["a", "A"]]), 'A\r\n"\'=HYPERLINK(""x"")"\r\n\'@SUM(A1)\r\n-5\r\n');
});
