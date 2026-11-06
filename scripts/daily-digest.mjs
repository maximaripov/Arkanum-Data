#!/usr/bin/env node
// Builds the daily digest after the 4 PM close (or, with --weekly, Saturday's week in review)
// and sends every device the same short notification. Everything comes from public-domain
// SEC filings and government calendars. Each digest is also saved as a dated archive page
// (public/data/digests/<date>.json, listed in index.json) that the job commits.
//
//   node scripts/daily-digest.mjs             build + send (GitHub job identity or ALERTS_SECRET)
//   node scripts/daily-digest.mjs --dry-run   build and print, send nothing
//   node scripts/daily-digest.mjs --no-push   update the Digest page without notifying
//   node scripts/daily-digest.mjs --hold      notify at 5:00 PM New York time (now, if it's later)
//   node scripts/daily-digest.mjs --weekly    the week in review (run on Saturday)
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { mergeInsiders } from "../lib/insiderMerge.mjs";
import { companyName, personName, roleLabel, isExecOrDirector } from "../lib/people.mjs";
import { isLateFiling, isUpcoming, notification, summarize } from "../lib/digest.mjs";
import { nyNow } from "../lib/sendTime.mjs";
import { SITE, token, siteFetch } from "./lib/site.mjs";

const DRY = process.argv.includes("--dry-run");
const NO_PUSH = process.argv.includes("--no-push");
const HOLD = process.argv.includes("--hold");
const WEEKLY = process.argv.includes("--weekly");
const load = async (f, d) => { try { return JSON.parse(await readFile(f, "utf8")); } catch { return d; } };

const today = nyNow().date;
const addDays = (ymd, n) => new Date(Date.parse(ymd + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
const pretty = (ymd) => new Date(ymd + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const short = (ymd) => new Date(ymd + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

// Daily: filings made today. Weekly (run on Saturday): filings Monday to Friday.
const from = WEEKLY ? addDays(today, -5) : today;
const inWindow = (ymd) => ymd >= from && ymd <= today;
// "Buying together" always looks back a week.
const weekAgo = addDays(today, -6);

// ---- Shared data built earlier in the job ---------------------------------------------
const ins = mergeInsiders(await load("public/data/insiders.json", { trades: [] }), await load("public/data/insiders-today.json", null));
const funds = await load("public/data/funds.json", { funds: [] });
const allEvents = (await load("public/data/events.json", { events: [] })).events;

// Buys by executives and directors, filed on time (late filings are left out entirely).
const buys = ins.trades.filter((t) => t.code === "P" && (t.value ?? 0) > 0 && isExecOrDirector(t) && !isLateFiling(t));
const windowBuys = buys.filter((t) => inWindow(t.filed)).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

const clusters = (() => {
  const by = new Map();
  for (const t of buys) {
    if (t.filed < weekAgo) continue;
    const x = by.get(t.symbol) ?? { symbol: t.symbol, company: companyName(t.issuer, t.symbol), owners: new Set(), value: 0 };
    x.owners.add(t.owner); x.value += t.value ?? 0; by.set(t.symbol, x);
  }
  // Several insiders averaging under ~$25K each is usually an employee share-purchase plan.
  return [...by.values()].filter((x) => x.owners.size > 1 && x.value / x.owners.size >= 25_000)
    .sort((a, b) => b.owners.size - a.owners.size || b.value - a.value).slice(0, 5)
    .map((x) => ({ symbol: x.symbol, company: x.company, insiders: x.owners.size, value: Math.round(x.value) }));
})();

// Big funds' quarterly 13F filings in the window, one line each.
const fundLines = funds.funds.filter((f) => inWindow(f.filed)).map((f) => ({
  fund: f.name, filed: f.filed,
  newPositions: f.new.slice(0, 3).map((h) => h.t ?? h.name), soldOut: f.sold.slice(0, 3).map((h) => h.t ?? h.name),
  counts: { new: f.new.length, added: f.added.length, cut: f.reduced.length, sold: f.sold.length },
}));

// Releases still ahead (an 8:30 AM report is old news at 5 PM), over the next week.
const events = allEvents.filter((e) => isUpcoming(e) && e.date <= addDays(today, WEEKLY ? 9 : 7)).slice(0, 4)
  .map((e) => ({ date: e.date, time: e.time, kind: e.kind, title: e.title, day: pretty(e.date) }));

const digest = {
  kind: WEEKLY ? "weekly" : "daily",
  generated: new Date().toISOString(), date: today, from,
  title: WEEKLY ? `Week in review · ${short(from)}–${short(addDays(today, -1)).replace(short(from).split(" ")[0] + " ", "")}` : `Daily digest · ${pretty(today)}`,
  totals: { buys: windowBuys.length, value: Math.round(windowBuys.reduce((s, t) => s + (t.value ?? 0), 0)), insiders: new Set(windowBuys.map((t) => t.owner)).size },
  buys: windowBuys.slice(0, 5).map((t) => ({
    symbol: t.symbol, company: companyName(t.issuer, t.symbol), name: personName(t.owner), ownerCik: t.ownerCik,
    role: roleLabel(t.role), value: Math.round(t.value), date: t.date, filed: t.filed,
    // Facts worth a chip; not ones the role already says ("CEO" next to "CEO & director").
    facts: (t.conv?.reasons ?? []).map((r) => r.text).filter((s) => !/insiders buying/.test(s) && !roleLabel(t.role).toLowerCase().includes(s.replace(/^also an? /i, "").toLowerCase())).slice(0, 2),
  })),
  clusters, funds: fundLines, events,
};
digest.summary = summarize(digest);
const note = notification(digest);

// ---- Archive: one file per digest, plus the list ---------------------------------------
if (!process.argv.includes("--no-archive")) {
  await mkdir("public/data/digests", { recursive: true });
  await writeFile(`public/data/digests/${today}.json`, JSON.stringify(digest));
  const index = (await load("public/data/digests/index.json", { digests: [] })).digests.filter((x) => x.date !== today);
  index.unshift({ date: today, kind: digest.kind, title: digest.title, lead: digest.summary[0] });
  index.sort((a, b) => b.date.localeCompare(a.date));
  await writeFile("public/data/digests/index.json", JSON.stringify({ digests: index }));
}

// ---- Everyone gets the same message (the site addresses it per device) ------------------
const auth = await token();
let devices = [];
if (auth) {
  const r = await siteFetch(`${SITE}/api/alerts/devices`, { headers: { Authorization: `Bearer ${auth}` } });
  if (r.ok) devices = await r.json(); else console.log(`Couldn't read devices: HTTP ${r.status}`);
}
const messages = devices.map((d) => ({ id: d.id, ...note }));

if (DRY || !auth) {
  if (!auth && !DRY) console.log("No identity token or ALERTS_SECRET: printing instead of sending.");
  console.log(JSON.stringify({ title: digest.title, summary: digest.summary, notification: note, totals: digest.totals, buys: digest.buys.length, clusters: clusters.length, funds: fundLines.length, events: events.length, devices: devices.length }, null, 2));
  process.exit(0);
}
const res = await siteFetch(`${SITE}/api/alerts/send`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}` },
  body: JSON.stringify({ digest, messages, notify: !NO_PUSH, hold: HOLD }),
});
console.log(`Send: HTTP ${res.status}`, await res.text());
if (!res.ok) process.exit(1);
