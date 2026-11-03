// Readable names and roles (lib/people.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { personName, roleLabel } from "../lib/people.mjs";

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
