#!/usr/bin/env node
// After the daily Congress update, tell devices that follow a House member about the
// member's newly disclosed stock trades. Reads the trades from reports read for the first
// time this run, from $CONGRESS_NEW_OUT (written by build-congress.mjs), so each report is
// alerted once. Devices follow a member as "house:<slug>" (see useFollowing).
//   node scripts/congress-alerts.mjs [--dry-run]
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { memberSlug, amountRange } from "../lib/congress.mjs";
import { SITE, token, siteFetch } from "./lib/site.mjs";

const DRY = process.argv.includes("--dry-run");
const NEW_OUT = process.env.CONGRESS_NEW_OUT || join(tmpdir(), "congress-new.json");
let fresh = [];
try { fresh = JSON.parse(await readFile(NEW_OUT, "utf8")); } catch {}
const stocks = fresh.filter((t) => t.ticker && t.type !== "E");
if (!stocks.length) { console.log("No new Congress stock trades."); process.exit(0); }

const byMember = new Map();
for (const t of stocks) { const k = `house:${memberSlug(t.member)}`; if (!byMember.has(k)) byMember.set(k, []); byMember.get(k).push(t); }
console.log(`${stocks.length} new stock trade(s) by ${byMember.size} member(s)`);

const auth = await token();
if (!auth && !DRY) { console.log("No identity token: not sending."); process.exit(0); }
let devices = [];
if (auth) {
  const r = await siteFetch(`${SITE}/api/alerts/devices`, { headers: { Authorization: `Bearer ${auth}` } });
  if (!r.ok) throw new Error(`Couldn't read devices: HTTP ${r.status}`); // an empty list would silently skip every alert
  devices = await r.json();
}

const line = (t) => `${t.type === "P" ? "Bought" : "Sold"} ${amountRange(t.min, t.max)} of ${t.ticker}${t.dateUnclear ? "" : ` (traded ${t.date})`}`;
const messages = [];
for (const d of devices) {
  if (d.instant === false) continue;
  for (const id of d.following ?? []) {
    const list = byMember.get(id);
    if (!list) continue;
    const name = list[0].member;
    messages.push({ id: d.id, title: `${name} disclosed ${list.length === 1 ? "a stock trade" : `${list.length} stock trades`}`, body: list.slice(0, 3).map(line).join("\n") + (list.length > 3 ? `\n+${list.length - 3} more` : ""), url: `/congress/${id.slice(6)}` });
  }
}
console.log(`${messages.length} alert(s) to send`);
if (DRY || !messages.length) { if (DRY) console.log(JSON.stringify(messages.slice(0, 3), null, 2)); process.exit(0); }
const r = await siteFetch(`${SITE}/api/alerts/instant`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}` }, body: JSON.stringify({ messages }) });
console.log(`Send: HTTP ${r.status}`, await r.text());
if (!r.ok) process.exit(1);
