#!/usr/bin/env node
// After each hourly update, tell devices right away when:
//   - a CEO, CFO, President or Chair (or anyone with an "Unusual" buy) bought a stock
//     on their watchlist, or
//   - an insider they follow bought, or made a large sale, at any company. Reads the trades
// that were new this run from $NEW_TRADES_OUT (written by build-insiders-today.mjs), so
// each buy is alerted once. Devices can switch these off on the Digest page.
//   node scripts/instant-alerts.mjs [--dry-run]
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { roleKind } from "../lib/conviction.mjs";
import { mergeInsiders } from "../lib/insiderMerge.mjs";
import { personName, roleLabel } from "../lib/people.mjs";
import { SITE, token, siteFetch } from "./lib/site.mjs";

const DRY = process.argv.includes("--dry-run");
const NEW_OUT = process.env.NEW_TRADES_OUT || join(tmpdir(), "form4-new-trades.json");
const load = async (f, d) => { try { return JSON.parse(await readFile(f, "utf8")); } catch { return d; } };
const money = (v) => (v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}K` : `$${Math.round(v)}`);

const added = await load(NEW_OUT, []);
const fresh = new Set(added.map((t) => t.accession + t.code));
if (!fresh.size) { console.log("No new insider trades."); process.exit(0); }

// Score the new buys with the full 30-day context (so "3 insiders buying" counts everyone).
const all = mergeInsiders(await load("public/data/insiders.json", null), await load("public/data/insiders-today.json", null)).trades;
const newTrades = all.filter((t) => fresh.has(t.accession + t.code));
const alertable = newTrades.filter((t) => t.code === "P" && !t.planned && (roleKind(t.role) === "top" || t.conv?.tier === "strong"));
const byOwner = new Map();
for (const t of newTrades) if (t.ownerCik) { if (!byOwner.has(t.ownerCik)) byOwner.set(t.ownerCik, []); byOwner.get(t.ownerCik).push(t); }
console.log(`${newTrades.length} new trade(s): ${alertable.length} watchlist-worthy buys, ${byOwner.size} insider(s) who could be followed`);

if (!alertable.length && !byOwner.size) process.exit(0);
const auth = await token();
if (!auth && !DRY) { console.log("No identity token: not sending."); process.exit(0); }
let devices = [];
if (auth) {
  const r = await siteFetch(`${SITE}/api/alerts/devices`, { headers: { Authorization: `Bearer ${auth}` } });
  // Fail loudly: an empty list here would silently skip every alert.
  if (!r.ok) throw new Error(`Couldn't read devices: HTTP ${r.status}`);
  devices = await r.json();
}

const line = (t) => {
  const why = (t.conv?.reasons ?? []).filter((r) => !r.neg).map((r) => r.text).filter((x) => !/^(CEO|CFO|President|Chair)$/.test(x)).slice(0, 2);
  return `${personName(t.owner)} (${roleLabel(t.role)}) ${t.code === "S" ? "sold" : "bought"} ${money(t.value ?? 0)} of ${t.symbol}${why.length ? ` · ${why.join(" · ")}` : ""}`;
};
const messages = [];
for (const d of devices) {
  if (d.instant === false) continue;
  const w = new Set(d.watchlist);
  // People this device follows come first: they asked for every trade by that person.
  const followed = (d.following ?? []).flatMap((cik) => byOwner.get(cik) ?? []);
  const seenIds = new Set(followed.map((t) => t.accession + t.code));
  const watch = alertable.filter((t) => w.has(t.symbol) && !seenIds.has(t.accession + t.code)).sort((a, b) => (b.conv?.score ?? 0) - (a.conv?.score ?? 0));
  const hits = [...followed, ...watch];
  if (!hits.length) continue;
  const t = hits[0];
  const isFollowed = followed.length > 0;
  messages.push(hits.length === 1
    ? { id: d.id, title: isFollowed ? `${personName(t.owner)} traded ${t.symbol}` : `${t.symbol}: insider buy`, body: line(t), url: isFollowed && t.ownerCik ? `/insider/${t.ownerCik}` : `/stock/${encodeURIComponent(t.symbol)}` }
    : { id: d.id, title: !watch.length ? `${hits.length} trades by people you follow` : !followed.length ? `${hits.length} insider buys in your watchlist` : `${hits.length} insider trades for you`, body: hits.slice(0, 3).map(line).join("\n"), url: isFollowed && t.ownerCik ? `/insider/${t.ownerCik}` : `/stock/${encodeURIComponent(t.symbol)}` });
}
console.log(`${messages.length} device(s) to alert`);
if (DRY || !messages.length) { if (DRY) console.log(JSON.stringify({ alertable: alertable.map(line), followable: byOwner.size, sample: messages.slice(0, 2) }, null, 2)); process.exit(0); }

const r = await siteFetch(`${SITE}/api/alerts/instant`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}` }, body: JSON.stringify({ messages }) });
console.log(`Send: HTTP ${r.status}`, await r.text());
if (!r.ok) process.exit(1);
