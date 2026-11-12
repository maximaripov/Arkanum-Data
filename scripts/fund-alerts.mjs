#!/usr/bin/env node
// After the daily update, tell devices that follow a fund about its new quarterly 13F report:
// what it started buying and what it sold. Reads the funds that filed a new report this run
// from $FUNDS_NEW_OUT (written by build-funds.mjs), so each report is alerted once. Devices
// follow a fund as "fund:<SEC ID>" (see useFollowing).
//   node scripts/fund-alerts.mjs [--dry-run]
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SITE, token, siteFetch } from "./lib/site.mjs";

const DRY = process.argv.includes("--dry-run");
let fresh = [];
try { fresh = JSON.parse(await readFile(process.env.FUNDS_NEW_OUT || join(tmpdir(), "funds-new.json"), "utf8")); } catch {}
if (!fresh.length) { console.log("No new fund reports."); process.exit(0); }
const byKey = new Map(fresh.map((f) => [`fund:${f.cik}`, f]));
console.log(`${fresh.length} new fund report(s): ${fresh.map((f) => f.name).join(", ")}`);

const auth = await token();
if (!auth && !DRY) { console.log("No identity token: not sending."); process.exit(0); }
let devices = [];
if (auth) {
  const r = await siteFetch(`${SITE}/api/alerts/devices`, { headers: { Authorization: `Bearer ${auth}` } });
  if (!r.ok) throw new Error(`Couldn't read devices: HTTP ${r.status}`); // an empty list would silently skip every alert
  devices = await r.json();
}

const quarter = (p) => { const [y, m] = String(p).split("-"); return `Q${Math.ceil(Number(m) / 3)} ${y}`; };
const messages = [];
for (const d of devices) {
  if (d.instant === false) continue;
  for (const id of d.following ?? []) {
    const f = byKey.get(id);
    if (!f) continue;
    const body = [f.new.length ? `New: ${f.new.join(", ")}` : "", f.sold.length ? `Sold out: ${f.sold.join(", ")}` : ""].filter(Boolean).join("\n") || "See what changed.";
    messages.push({ id: d.id, title: `${f.name} filed its ${quarter(f.period)} holdings`, body, url: `/stakes?view=funds&fund=${f.cik}` });
  }
}
console.log(`${messages.length} alert(s) to send`);
if (DRY || !messages.length) { if (DRY) console.log(JSON.stringify(messages.slice(0, 3), null, 2)); process.exit(0); }
const r = await siteFetch(`${SITE}/api/alerts/instant`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}` }, body: JSON.stringify({ messages }) });
console.log(`Send: HTTP ${r.status}`, await r.text());
if (!r.ok) process.exit(1);
