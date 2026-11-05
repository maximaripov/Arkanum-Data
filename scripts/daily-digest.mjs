#!/usr/bin/env node
// Builds the daily digest after the 4 PM close and sends each device its own notification.
// Everything comes from public-domain or freely shareable data: SEC filings (insider
// trades, 13F fund holdings, 8-K announcements, fundamentals) and government calendars.
//
//   node scripts/daily-digest.mjs             build + send (GitHub job identity or ALERTS_SECRET)
//   node scripts/daily-digest.mjs --dry-run   build and print, send nothing
//   node scripts/daily-digest.mjs --no-push   update the Digest page without notifying
import { readFile } from "node:fs/promises";
import { mergeInsiders } from "../lib/insiderMerge.mjs";
import { SITE, token, siteFetch } from "./lib/site.mjs";

const DRY = process.argv.includes("--dry-run");
const NO_PUSH = process.argv.includes("--no-push");
const UA = process.env.SEC_USER_AGENT || "Form4 (set SEC_USER_AGENT)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const load = async (f, d) => { try { return JSON.parse(await readFile(f, "utf8")); } catch { return d; } };
const money = (v) => (v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}K` : `$${Math.round(v)}`);

async function sec(url) {
  try { const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) }); return r.ok ? r.json() : null; } catch { return null; }
}

const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const addDays = (ymd, n) => new Date(Date.parse(ymd + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
const pretty = (ymd) => new Date(ymd + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const weekday = (ymd) => new Date(ymd + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

// ---- Shared data built earlier in the job ---------------------------------------------
// The 30-day file plus today's hourly file, with every buy scored for conviction.
const ins = mergeInsiders(await load("public/data/insiders.json", { trades: [] }), await load("public/data/insiders-today.json", null));
const funds = await load("public/data/funds.json", { funds: [] });
const events = (await load("public/data/events.json", { events: [] })).events.filter((e) => e.date >= today && e.date <= addDays(today, 7));

const isExec = (role) => String(role).split(",").map((s) => s.trim()).some((p) => p && p !== "10% owner" && p !== "Other");
const filed = ins.trades.map((t) => t.filed).sort().at(-1) ?? null; // latest filing day in the data
const latest = ins.trades.filter((t) => t.filed === filed);
// Strongest first (conviction score), then size.
const execBuys = latest.filter((t) => t.code === "P" && isExec(t.role)).sort((a, b) => (b.conv?.score ?? 0) - (a.conv?.score ?? 0) || (b.value ?? 0) - (a.value ?? 0));
const weekAgo = addDays(today, -7);
const clusters = (() => {
  const by = new Map();
  for (const t of ins.trades) {
    if (t.code !== "P" || !isExec(t.role) || t.filed < weekAgo) continue;
    const x = by.get(t.symbol) ?? { symbol: t.symbol, issuer: t.issuer, owners: new Set(), value: 0 };
    x.owners.add(t.owner); x.value += t.value ?? 0; by.set(t.symbol, x);
  }
  // Several insiders averaging under ~$25K each is usually an employee share-purchase plan.
  return [...by.values()].filter((x) => x.owners.size > 1 && x.value / x.owners.size >= 25_000).sort((a, b) => b.owners.size - a.owners.size || b.value - a.value).slice(0, 5).map((x) => ({ symbol: x.symbol, issuer: x.issuer, insiders: x.owners.size, value: x.value }));
})();
const newFilings = funds.funds.filter((f) => f.filed >= weekAgo).map((f) => ({
  fund: f.name, period: f.period, filed: f.filed,
  newPositions: f.new.slice(0, 3).map((h) => h.t ?? h.name), soldOut: f.sold.slice(0, 3).map((h) => h.t ?? h.name),
}));
const slim = (t) => ({ symbol: t.symbol, issuer: t.issuer, owner: t.owner, ownerCik: t.ownerCik, role: t.role, value: t.value, date: t.date, conv: t.conv ?? null });

const digest = {
  generated: new Date().toISOString(), date: today, filed,
  title: `Daily digest · ${pretty(today)}`,
  topBuys: execBuys.slice(0, 5).map(slim),
  clusters, fundFilings: newFilings, events,
};

// ---- One line on markets: bitcoin, gold and the 10-year yield, each vs the day before ------------
const marketLine = await (async () => {
  try {
    const r = await fetch(`${SITE}/api/markets`, { signal: AbortSignal.timeout(30_000) });
    const all = new Map((await r.json()).groups.flatMap((g) => g.series.map((x) => [x.id, x])));
    const part = (id, name, pct) => {
      const x = all.get(id);
      if (!x) return null;
      const v = x.unit === "pct" ? `${x.value.toFixed(2)}%` : x.value >= 1000 ? `$${(x.value / 1000).toFixed(1)}K` : `$${x.value.toFixed(2)}`;
      if (x.prev == null) return `${name} ${v}`;
      const d = pct ? (x.value / x.prev - 1) * 100 : x.value - x.prev;
      return `${name} ${v} (${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(pct ? 1 : 2)}${pct ? "%" : ""})`;
    };
    return [part("bitcoin", "BTC", true), part("pax-gold", "Gold", true), part("t10y", "10Y", false)].filter(Boolean).join(" · ") || null;
  } catch { return null; }
})();

// ---- Each device's own message ----------------------------------------------------------
const auth = await token();
let devices = [];
if (auth) {
  const r = await siteFetch(`${SITE}/api/alerts/devices`, { headers: { Authorization: `Bearer ${auth}` } });
  if (r.ok) devices = await r.json(); else console.log(`Couldn't read devices: HTTP ${r.status}`);
}

// Today's 8-K announcements for every symbol any device follows (one SEC request each).
const ITEMS = { "1.01": "material agreement", "1.03": "bankruptcy", "2.01": "acquisition or sale completed", "2.02": "quarterly results", "2.05": "restructuring or layoffs", "2.06": "write-down", "3.01": "delisting notice", "4.02": "restated financials", "5.01": "change in control", "5.02": "executive or board change", "5.07": "shareholder vote", "7.01": "investor update", "8.01": "announcement" };
const followed = [...new Set(devices.flatMap((d) => d.watchlist))].slice(0, 400);
const tickers = followed.length ? await sec("https://www.sec.gov/files/company_tickers.json") : null;
const cikOf = new Map(Object.values(tickers ?? {}).map((c) => [String(c.ticker).toUpperCase(), c.cik_str]));
const filingsToday = new Map();
for (const s of followed) {
  const cik = cikOf.get(s.replace(".", "-"));
  if (!cik) continue;
  const sub = await sec(`https://data.sec.gov/submissions/CIK${String(cik).padStart(10, "0")}.json`);
  await sleep(130);
  const r = sub?.filings?.recent;
  if (!r) continue;
  const items = [];
  for (let i = 0; i < r.form.length && r.filingDate[i] >= today; i++) {
    if (r.form[i] !== "8-K") continue;
    for (const it of String(r.items[i] ?? "").split(",").map((x) => x.trim())) if (ITEMS[it]) items.push(ITEMS[it]);
  }
  if (items.length) filingsToday.set(s, [...new Set(items)]);
}


const messages = [];
for (const d of devices) {
  const w = new Set(d.watchlist);
  const lines = [];
  // Insider trades in your watchlist (latest filing day): buys and sizable sales.
  const mine = latest.filter((t) => w.has(t.symbol) && isExec(t.role) && (t.code === "P" || (t.code === "S" && (t.value ?? 0) >= 1e6)));
  for (const t of mine.slice(0, 2)) lines.push(`${t.symbol}: ${t.owner.split(",")[0]} ${t.code === "P" ? "bought" : "sold"} ${t.value ? money(t.value) : "shares"}`);
  // Company announcements filed today.
  for (const [s, items] of [...filingsToday].filter(([s]) => w.has(s)).slice(0, 2)) lines.push(`${s} filed: ${items.slice(0, 2).join(", ")}`);
  // New 13F filings touching your stocks.
  for (const f of funds.funds.filter((f) => f.filed >= addDays(today, -1))) {
    const hit = [...f.new, ...f.sold].find((h) => w.has(h.t));
    if (hit) lines.push(`${f.name} ${hit.change === "sold" ? "sold all of" : "bought"} ${hit.t}`);
  }
  // Fill with market-wide highlights if nothing personal happened.
  if (!lines.length && clusters[0]) lines.push(`${clusters[0].insiders} insiders bought ${clusters[0].symbol} this week (${money(clusters[0].value)})`);
  if (lines.length < 3 && execBuys[0] && !lines.some((l) => l.startsWith(execBuys[0].symbol))) lines.push(`Most unusual insider buy: ${execBuys[0].symbol} ${money(execBuys[0].value ?? 0)}`);
  if (lines.length < 4 && events[0]) lines.push(`Next: ${events[0].title} ${weekday(events[0].date)}`);
  const body = marketLine ? [...lines.slice(0, 3), marketLine] : lines.slice(0, 4);
  messages.push({ id: d.id, title: digest.title, body: body.join("\n") });
}

if (DRY || !auth) {
  if (!auth && !DRY) console.log("No identity token or ALERTS_SECRET: printing instead of sending.");
  console.log(JSON.stringify({ digest: { ...digest, events: digest.events.length }, devices: devices.length, followed: followed.length, sample: messages.slice(0, 2) }, null, 2));
  process.exit(0);
}
const res = await siteFetch(`${SITE}/api/alerts/send`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}` },
  body: JSON.stringify({ digest, messages, notify: !NO_PUSH }),
});
console.log(`Send: HTTP ${res.status}`, await res.text());
if (!res.ok) process.exit(1);
