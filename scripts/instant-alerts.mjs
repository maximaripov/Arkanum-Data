#!/usr/bin/env node
// After each hourly update: if a CEO, CFO, President or Chair (or anyone with a "Strong
// signal" buy) bought a stock on someone's watchlist, tell them right away. Reads the trades
// that were new this run from $NEW_TRADES_OUT (written by build-insiders-today.mjs), so
// each buy is alerted once. Devices can switch these off on the Digest page.
//   node scripts/instant-alerts.mjs [--dry-run]
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { roleKind } from "../lib/conviction.mjs";
import { mergeInsiders } from "../lib/insiderMerge.mjs";
import { personName, roleLabel } from "../lib/people.mjs";
import { SITE, token } from "./lib/site.mjs";

const DRY = process.argv.includes("--dry-run");
const NEW_OUT = process.env.NEW_TRADES_OUT || join(tmpdir(), "form4-new-trades.json");
const load = async (f, d) => { try { return JSON.parse(await readFile(f, "utf8")); } catch { return d; } };
const money = (v) => (v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}K` : `$${Math.round(v)}`);

const added = await load(NEW_OUT, []);
const fresh = new Set(added.filter((t) => t.code === "P").map((t) => t.accession + t.code));
if (!fresh.size) { console.log("No new insider buys."); process.exit(0); }

// Score the new buys with the full 30-day context (so "3 insiders buying" counts everyone).
const all = mergeInsiders(await load("public/data/insiders.json", null), await load("public/data/insiders-today.json", null)).trades;
const alertable = all.filter((t) => fresh.has(t.accession + t.code) && !t.planned && (roleKind(t.role) === "top" || t.conv?.tier === "strong"));
console.log(`${fresh.size} new buy(s), ${alertable.length} worth an instant alert`);
if (!alertable.length) process.exit(0);

const auth = await token();
if (!auth && !DRY) { console.log("No identity token: not sending."); process.exit(0); }
const devices = auth ? await fetch(`${SITE}/api/alerts/devices`, { headers: { Authorization: `Bearer ${auth}` } }).then((r) => (r.ok ? r.json() : [])) : [];

const line = (t) => {
  const why = (t.conv?.reasons ?? []).filter((r) => !r.neg).map((r) => r.text).filter((x) => !/^(CEO|CFO|President|Chair)$/.test(x)).slice(0, 2);
  return `${personName(t.owner)} (${roleLabel(t.role)}) bought ${money(t.value ?? 0)} of ${t.symbol}${why.length ? ` · ${why.join(" · ")}` : ""}`;
};
const messages = [];
for (const d of devices) {
  if (d.instant === false) continue;
  const w = new Set(d.watchlist);
  const hits = alertable.filter((t) => w.has(t.symbol)).sort((a, b) => (b.conv?.score ?? 0) - (a.conv?.score ?? 0));
  if (!hits.length) continue;
  const t = hits[0];
  messages.push(hits.length === 1
    ? { id: d.id, title: `${t.symbol}: insider buy`, body: line(t), url: `/stock/${encodeURIComponent(t.symbol)}` }
    : { id: d.id, title: `${hits.length} insider buys in your watchlist`, body: hits.slice(0, 3).map(line).join("\n"), url: `/stock/${encodeURIComponent(t.symbol)}` });
}
console.log(`${messages.length} device(s) to alert`);
if (DRY || !messages.length) { if (DRY) console.log(JSON.stringify({ alertable: alertable.map(line), sample: messages.slice(0, 2) }, null, 2)); process.exit(0); }

const r = await fetch(`${SITE}/api/alerts/instant`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}` }, body: JSON.stringify({ messages }) });
console.log(`Send: HTTP ${r.status}`, await r.text());
if (!r.ok) process.exit(1);
