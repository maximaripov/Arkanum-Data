#!/usr/bin/env node
// Research (owner-only, run on GitHub): the buy-score backtest rerun on purchases filed in
// 2026 (data the score was never examined on), to see whether the 2023–2025 findings hold.
// Runs scripts/backtest.mjs unchanged and prints its results file to the log.
//   node scripts/diagnose/oos-2026.mjs [2026q1] [2026q3] [2021q1]
import { readFile } from "node:fs/promises";
const [from = "2026q1", to = "2026q3", hist = "2021q1"] = process.argv.slice(2);
const OUT = "/tmp/oos-2026";
process.argv = [process.argv[0], "backtest.mjs", "--from", from, "--to", to, "--history-from", hist, "--out", OUT];
await import("../backtest.mjs");
console.log("RESULT_JSON_START");
console.log(await readFile(`${OUT}/results.json`, "utf8"));
console.log("RESULT_JSON_END");
