// Reading SEC Form 4 filings (lib/form4.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseForm4 } from "../lib/form4.mjs";

const xml = readFileSync(new URL("./fixtures/form4-buy.xml", import.meta.url), "utf8");
const meta = { accession: "0001653042-26-000001", filed: "2026-11-02", url: "https://example.test/index.htm" };

test("reads each transaction with the insider, role and amounts", () => {
  const rows = parseForm4(xml, meta);
  assert.equal(rows.length, 2);
  const [a] = rows;
  assert.equal(a.symbol, "LSTR");
  assert.equal(a.issuer, "LANDSTAR SYSTEM INC");
  assert.equal(a.owner, "Lonegro Frank A");
  assert.equal(a.ownerCik, "1653042"); // leading zeros dropped
  assert.equal(a.role, "President & CEO, Director");
  assert.equal(a.code, "P");
  assert.equal(a.shares, 3000);
  assert.equal(a.price, 142.5);
  assert.equal(a.value, 427500);
  assert.equal(a.ownedAfter, 26100);
  assert.equal(a.planned, false);
  assert.equal(a.accession, meta.accession);
});

test("marks pre-planned (10b5-1) filings", () => {
  const rows = parseForm4(xml.replace("<aff10b5One>0</aff10b5One>", "<aff10b5One>1</aff10b5One>"), meta);
  assert.ok(rows.every((r) => r.planned));
});

test("keeps the first ticker when several are listed", () => {
  const rows = parseForm4(xml.replace("<issuerTradingSymbol>LSTR</issuerTradingSymbol>", "<issuerTradingSymbol>HEI, HEI.A</issuerTradingSymbol>"), meta);
  assert.equal(rows[0].symbol, "HEI");
});

test("skips companies without a tradable ticker", () => {
  for (const t of ["NONE", "N/A", ""]) assert.deepEqual(parseForm4(xml.replace("LSTR", t), meta), []);
});

test("an officer with no title is called Officer", () => {
  const rows = parseForm4(xml.replace("<officerTitle>President &amp; CEO</officerTitle>", ""), meta);
  assert.equal(rows[0].role, "Officer, Director");
});

test("returns nothing for something that isn't a Form 4", () => {
  assert.deepEqual(parseForm4("<html>not a filing</html>", meta), []);
});
