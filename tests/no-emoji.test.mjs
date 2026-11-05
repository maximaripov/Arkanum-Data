// Owner rule: no emoji anywhere on the site or in its notifications (2026-11-05).
// Plain typographic marks are fine (▲ ▼ › ↗ ×); pictographs and dingbats are not.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{203C}\u{2049}\u{2139}\u{231A}-\u{23FF}\u{24C2}\u{3030}\u{303D}]/u;
const SKIP = new Set(["node_modules", ".next", "data"]);
function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(tsx?|mjs|js|css|json)$/.test(name)) yield p;
  }
}

test("no emoji in the site's code, styles or notification texts", () => {
  const found = [];
  for (const root of ["app", "components", "lib", "scripts"]) {
    for (const f of files(root)) {
      readFileSync(f, "utf8").split("\n").forEach((line, i) => { const m = line.match(EMOJI); if (m) found.push(`${f}:${i + 1} ${m[0]}`); });
    }
  }
  assert.deepEqual(found, [], `Emoji found (the owner doesn't want any):\n${found.join("\n")}`);
});
