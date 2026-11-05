// Readable names and roles (lib/people.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { personName, roleLabel, companyName } from "../lib/people.mjs";

test("SEC surname-first names read naturally", () => {
  assert.equal(personName("HEALY JAMES"), "James Healy");
  assert.equal(personName("Lonegro Frank A"), "Frank A Lonegro");
  assert.equal(personName("SMITH JOHN JR"), "John Smith Jr");
  assert.equal(personName("DOE JANE, ROE RICHARD"), "Jane Doe and others");
  assert.equal(personName("BERKSHIRE HATHAWAY INC"), "Berkshire Hathaway Inc");
});

test("roles are short and plain", () => {
  assert.equal(roleLabel("Chief Executive Officer, Director"), "CEO & director");
  assert.equal(roleLabel("Chief Financial Officer"), "CFO");
  assert.equal(roleLabel("Director, 10% owner"), "director, major shareholder");
  assert.equal(roleLabel("SVP, GC and Government Affairs"), "SVP, GC and Government Affairs");
  assert.equal(roleLabel("Other"), "insider");
});

test("company names: keep the company's own casing and acronyms", () => {
  assert.equal(companyName("MGM Resorts International", "MGM"), "MGM Resorts International");
  assert.equal(companyName("KKR INCOME OPPORTUNITIES FUND", "KIO"), "KKR Income Opportunities Fund");
  assert.equal(companyName("UMH PROPERTIES, INC.", "UMH"), "UMH Properties, Inc.");
  assert.equal(companyName("CHURCH & DWIGHT CO INC /DE/", "CHD"), "Church & Dwight Co Inc");
  assert.equal(companyName("ELI LILLY & Co", "LLY"), "Eli Lilly & Co");
  assert.equal(companyName("BANK OF AMERICA CORP /DE/", "BAC"), "Bank of America Corp");
  assert.equal(companyName("SK HYNIX INC."), "SK Hynix Inc.");
});

test("See Remarks roles don't show as a title", () => {
  assert.equal(roleLabel("SEE REMARKS"), "insider");
  assert.equal(roleLabel("See Remarks, Director"), "director");
});

test("funds and companies filing as insiders keep LLC and LP in capitals", () => {
  assert.equal(personName("ORBIMED ADVISORS LLC"), "Orbimed Advisors LLC");
  assert.equal(personName("TAN LIP BU"), "Lip Bu Tan");
});
