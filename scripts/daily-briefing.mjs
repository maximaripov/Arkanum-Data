#!/usr/bin/env node
// Builds the daily market briefing at the 4 PM Eastern close and sends it to your phone.
// Runs in the 4:02 PM GitHub job right after closing prices are refreshed.
//
//   node scripts/daily-briefing.mjs            build + send (needs ALERTS_SECRET, SITE_URL)
//   node scripts/daily-briefing.mjs --dry-run  build and print, send nothing
//
// Optional: FRED_API_KEY adds jobs report, CPI, PPI and retail sales dates.
import { readFile } from "node:fs/promises";

const DRY = process.argv.includes("--dry-run");
const SITE = (process.env.SITE_URL || "https://foresightscreener.vercel.app").replace(/\/$/, "");
// Inside GitHub Actions the job asks GitHub for a signed identity token; the site checks
// it against GitHub's keys. Locally, ALERTS_SECRET can be used instead.
async function githubToken() {
  const { ACTIONS_ID_TOKEN_REQUEST_URL: url, ACTIONS_ID_TOKEN_REQUEST_TOKEN: bearer } = process.env;
  if (!url || !bearer) return null;
  const r = await fetch(`${url}&audience=foresight-alerts`, { headers: { Authorization: `Bearer ${bearer}` } });
  return r.ok ? (await r.json()).value : null;
}
const SECRET = process.env.ALERTS_SECRET || (await githubToken());
const FRED = process.env.FRED_API_KEY;
const UA = process.env.SEC_USER_AGENT || "Foresight personal app (set SEC_USER_AGENT)";
const notes = [];

async function getJson(url, headers = {}) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, ...headers }, signal: AbortSignal.timeout(20_000) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}
async function getText(url) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) });
    return r.ok ? await r.text() : null;
  } catch { return null; }
}

// ---- Dates in New York time -------------------------------------------------------
const nyDate = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "America/New_York" }); // YYYY-MM-DD
const today = nyDate();
const addDays = (ymd, n) => new Date(Date.parse(ymd + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
const horizon = addDays(today, 7);
const weekday = (ymd) => new Date(ymd + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
const pretty = (ymd) => new Date(ymd + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

// ---- What you follow (from the site) ----------------------------------------------
let state = { watchlist: [], levels: {} };
if (SECRET) {
  const s = await getJson(`${SITE}/api/alerts/state`, { Authorization: `Bearer ${SECRET}` });
  if (s) state = s;
  else notes.push("Couldn't read your watchlist from the site.");
}
// Your Markets-tab watchlist as last synced from your phone, in the same order. The
// default list is only used if no device has ever synced (an empty list stays empty).
const watchlist = state.updated ? state.watchlist ?? [] : ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "TSLA"];

// ---- Prices -----------------------------------------------------------------------
const MARKETS = [
  { title: "US stocks", items: [["^GSPC", "S&P 500"], ["^IXIC", "Nasdaq"], ["^DJI", "Dow"], ["^RUT", "Russell 2000"], ["^VIX", "VIX"]] },
  { title: "Rates, dollar, commodities, crypto", items: [["^TNX", "10Y yield", "yield"], ["DX-Y.NYB", "Dollar index"], ["CL=F", "Oil (WTI)"], ["GC=F", "Gold"], ["BTC-USD", "Bitcoin"]] },
];
const SECTORS = [["XLK", "Technology"], ["XLF", "Financials"], ["XLV", "Health Care"], ["XLE", "Energy"], ["XLI", "Industrials"], ["XLY", "Consumer Discretionary"], ["XLP", "Consumer Staples"], ["XLU", "Utilities"], ["XLB", "Materials"], ["XLRE", "Real Estate"], ["XLC", "Communication Services"]];
const levelSymbols = Object.keys(state.levels ?? {});
const all = [...new Set([...MARKETS.flatMap((g) => g.items.map((i) => i[0])), ...SECTORS.map((s) => s[0]), ...watchlist, ...levelSymbols])];

const quotes = {};
for (let i = 0; i < all.length; i += 20) {
  const batch = all.slice(i, i + 20);
  const d = await getJson(`https://query1.finance.yahoo.com/v8/finance/spark?symbols=${encodeURIComponent(batch.join(","))}&range=5d&interval=1d`, { "User-Agent": "Mozilla/5.0 (Foresight personal app)" });
  for (const [sym, s] of Object.entries(d ?? {})) {
    const pts = (s?.timestamp ?? []).map((t, k) => [t, s.close?.[k]]).filter(([, c]) => c != null);
    if (pts.length < 2) continue;
    const [t, last] = pts.at(-1), prev = pts.at(-2)[1];
    quotes[sym] = { last, prev, date: nyDate(new Date(t * 1000)) };
  }
}
const move = (symbol, label, unit) => {
  const q = quotes[symbol];
  const changePct = !q ? null : unit === "yield" ? q.last - q.prev : ((q.last - q.prev) / q.prev) * 100; // yields: change in points
  return { symbol, label, price: q?.last ?? null, changePct, ...(unit ? { unit } : {}) };
};
const marketDate = quotes["^GSPC"]?.date ?? today;
const closed = marketDate !== today;

const markets = MARKETS.map((g) => ({ title: g.title, items: g.items.map(([s, l, u]) => move(s, l, u)) }));
const sectors = SECTORS.map(([s, l]) => move(s, l)).filter((m) => m.changePct != null).sort((a, b) => b.changePct - a.changePct);
const wl = watchlist.map((s) => move(s, s)).filter((m) => m.price != null);

// ---- Breadth and big movers from tonight's screener file -------------------------
let breadth = null, movers = { gainers: [], losers: [] };
try {
  const sc = JSON.parse(await readFile("public/data/screener.json", "utf8"));
  const rows = sc.rows.map((r) => Object.fromEntries(sc.fields.map((f, i) => [f, r[i]])));
  breadth = { up: rows.filter((r) => r.chg > 0).length, down: rows.filter((r) => r.chg < 0).length, flat: rows.filter((r) => r.chg === 0).length };
  const big = rows.filter((r) => r.mcap >= 10e9 && r.chg != null).sort((a, b) => b.chg - a.chg);
  const toMove = (r) => ({ symbol: r.t, label: r.t, price: r.p, changePct: r.chg });
  movers = { gainers: big.slice(0, 3).map(toMove), losers: big.slice(-3).reverse().map(toMove) };
} catch { notes.push("Screener data unavailable, so no market breadth."); }

// ---- Your price levels -------------------------------------------------------------
const levels = [];
for (const [symbol, list] of Object.entries(state.levels ?? {})) {
  const q = quotes[symbol];
  if (!q) continue;
  for (const l of list) {
    const crossed = closed ? false : (q.prev - l.price) * (q.last - l.price) <= 0 && q.prev !== q.last;
    const distPct = ((l.price - q.last) / q.last) * 100;
    if (crossed || Math.abs(distPct) <= 5) levels.push({ symbol, price: l.price, note: l.note, last: q.last, distPct, crossed });
  }
}
levels.sort((a, b) => Number(b.crossed) - Number(a.crossed) || Math.abs(a.distPct) - Math.abs(b.distPct));

// ---- Insider buys by officers and directors, from tonight's insider file -----------
const isExec = (role) => role.split(",").map((s) => s.trim()).some((p) => p && p !== "10% owner" && p !== "Other");
let insiders = { watchlist: [], top: [], filed: null };
try {
  const ins = JSON.parse(await readFile("public/data/insiders.json", "utf8"));
  const filed = ins.trades.map((t) => t.filed).sort().at(-1) ?? null;
  const buys = ins.trades.filter((t) => t.filed === filed && t.code === "P" && isExec(t.role));
  const slim = (t) => ({ symbol: t.symbol, issuer: t.issuer, owner: t.owner, role: t.role, value: t.value, date: t.date });
  const wset = new Set(watchlist);
  insiders = {
    filed,
    watchlist: buys.filter((t) => wset.has(t.symbol)).map(slim),
    top: buys.filter((t) => !wset.has(t.symbol)).sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 3).map(slim),
  };
} catch { notes.push("Insider data unavailable."); }

// ---- Catalysts in the next 7 days --------------------------------------------------
const catalysts = [];
const inWindow = (d) => d > today && d <= horizon;

// BEA: GDP, PCE inflation (Personal Income and Outlays), trade.
const bea = await getText("https://www.bea.gov/news/schedule/ics/online-calendar-subscription.ics");
if (bea) {
  const BEA = [[/^GDP/i, "GDP"], [/Personal Income and Outlays/i, "PCE inflation, income & spending"], [/Trade in Goods and Services/i, "Trade balance"]];
  for (const ev of bea.replace(/\r?\n[ \t]/g, "").split("BEGIN:VEVENT").slice(1)) {
    const start = ev.match(/DTSTART[^:]*:(\d{8})T?(\d{4})?/), summary = ev.match(/SUMMARY[^:]*:(.*)/)?.[1]?.replace(/\\,/g, ",").trim();
    if (!start || !summary) continue;
    const label = BEA.find(([re]) => re.test(summary));
    if (!label || /State|County|Industry|Multinational/i.test(summary)) continue;
    const d = `${start[1].slice(0, 4)}-${start[1].slice(4, 6)}-${start[1].slice(6, 8)}`;
    const period = summary.includes(",") ? summary.split(",").at(-1).trim() : ""; // e.g. "September 2026"
    if (inWindow(d)) catalysts.push({ date: d, time: "8:30 AM ET", kind: "econ", title: period ? `${label[1]} (${period})` : label[1] });
  }
} else notes.push("Couldn't read the BEA release calendar.");

// FOMC: rate decision on the second day of each meeting.
const fomc = await getText("https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm");
if (fomc) {
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  for (const year of [Number(today.slice(0, 4)), Number(today.slice(0, 4)) + 1]) {
    const i = fomc.indexOf(`${year} FOMC Meetings`);
    if (i < 0) continue;
    const seg = fomc.slice(i, fomc.indexOf("FOMC Meetings", i + 20) > 0 ? fomc.indexOf("FOMC Meetings", i + 20) : i + 20000);
    for (const [, month, days] of seg.matchAll(/fomc-meeting__month[^>]*>\s*<strong>([^<]+)<\/strong>[\s\S]*?fomc-meeting__date[^>]*>([^<]+)</g)) {
      const m = month.split("/").at(-1).trim(); // "Apr/May" → decision falls in May
      const mi = MONTHS.findIndex((x) => x.startsWith(m.slice(0, 3)));
      const day = Number(days.replace(/\*/, "").split("-").at(-1));
      if (mi < 0 || !day) continue;
      const d = `${year}-${String(mi + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (inWindow(d)) catalysts.push({ date: d, time: "2:00 PM ET", kind: "fed", title: `Fed rate decision${days.includes("*") ? " + economic projections" : ""}` });
    }
  }
} else notes.push("Couldn't read the Fed meeting calendar.");

// FRED (optional key): jobs report, CPI, PPI, retail sales, jobless claims.
if (FRED) {
  const d = await getJson(`https://api.stlouisfed.org/fred/releases/dates?api_key=${FRED}&file_type=json&realtime_start=${addDays(today, 1)}&realtime_end=${horizon}&include_release_dates_with_no_data=true&limit=1000&sort_order=asc`);
  const WANT = [[/^Employment Situation$/i, "Jobs report"], [/^Consumer Price Index$/i, "CPI inflation"], [/^Producer Price Index$/i, "PPI inflation"], [/Advance Monthly Sales for Retail/i, "Retail sales"], [/Unemployment Insurance Weekly Claims/i, "Jobless claims"], [/Job Openings and Labor Turnover/i, "Job openings (JOLTS)"]];
  if (!d) notes.push("Couldn't read FRED release dates.");
  for (const r of d?.release_dates ?? []) {
    const hit = WANT.find(([re]) => re.test(r.release_name));
    if (hit && inWindow(r.date)) catalysts.push({ date: r.date, time: "8:30 AM ET", kind: "econ", title: hit[1] });
  }
} else notes.push("Jobs report and CPI dates appear once a free FRED_API_KEY is added.");

// Earnings: your watchlist, plus companies worth $100B+.
const wset = new Set(watchlist);
for (let k = 1; k <= 7; k++) {
  const d = addDays(today, k);
  if (["Sat", "Sun"].includes(weekday(d))) continue;
  const e = await getJson(`https://api.nasdaq.com/api/calendar/earnings?date=${d}`, { Accept: "application/json", "User-Agent": "Mozilla/5.0 (Foresight personal app)" });
  const capOf = (r) => Number(String(r.marketCap ?? "").replace(/[$,]/g, "")) || 0;
  const rows = (e?.data?.rows ?? []).filter((r) => !/\.A$/.test(r.symbol)); // one line per company (BRK.A/BRK.B)
  const big = rows.filter((r) => !wset.has(r.symbol) && capOf(r) >= 100e9).sort((a, b) => capOf(b) - capOf(a)).slice(0, 5);
  for (const r of [...rows.filter((r) => wset.has(r.symbol)), ...big]) {
    const when = { "time-pre-market": "before open", "time-after-hours": "after close" }[r.time] ?? null;
    catalysts.push({ date: d, time: when, kind: "earnings", title: `${r.symbol} earnings${wset.has(r.symbol) ? " (watchlist)" : ""}` });
  }
}
catalysts.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === "earnings") - (b.kind === "earnings"));

// ---- Compose -----------------------------------------------------------------------
const pct = (m) => (m.changePct == null ? "n/a" : m.unit === "yield" ? `${m.price.toFixed(2)}%` : `${m.changePct > 0 ? "+" : "−"}${Math.abs(m.changePct).toFixed(1)}%`);
const sp = markets[0].items[0], nq = markets[0].items[1], tnx = markets[1].items[0];
const topWl = [...wl].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 3);
const nextUp = catalysts.filter((c) => c.kind !== "earnings" || wset.has(c.title.split(" ")[0])).slice(0, 2);
const crossed = levels.filter((l) => l.crossed);

const headline = [
  closed ? `US markets were closed today. Last close (${pretty(marketDate)}): S&P 500 ${pct(sp)}, Nasdaq ${pct(nq)}.` : `S&P 500 ${pct(sp)}, Nasdaq ${pct(nq)}, 10-year yield ${pct(tnx)}.`,
  sectors.length ? `Best sector: ${sectors[0].label} ${pct(sectors[0])}. Worst: ${sectors.at(-1).label} ${pct(sectors.at(-1))}.` : null,
  breadth ? `${breadth.up.toLocaleString()} stocks rose and ${breadth.down.toLocaleString()} fell.` : null,
  topWl.length ? `Your biggest movers: ${topWl.map((m) => `${m.symbol} ${pct(m)}`).join(", ")}.` : null,
  crossed.length ? `Crossed your levels: ${crossed.map((l) => `${l.symbol} ${l.price}${l.note ? ` (${l.note})` : ""}`).join(", ")}.` : null,
  insiders.watchlist.length ? `Insider buying in your watchlist: ${insiders.watchlist.map((t) => t.symbol).join(", ")}.` : null,
  catalysts.length ? `Coming up: ${catalysts.slice(0, 4).map((c) => `${c.title} ${weekday(c.date)}`).join(", ")}.` : "No major scheduled catalysts in the next 7 days.",
].filter(Boolean);

const body = [
  closed ? `Markets closed. Last: S&P ${pct(sp)} · Nasdaq ${pct(nq)}` : `S&P ${pct(sp)} · Nasdaq ${pct(nq)} · 10Y ${pct(tnx)}`,
  topWl.length ? `You: ${topWl.map((m) => `${m.symbol} ${pct(m)}`).join(", ")}` : null,
  crossed.length ? `Crossed: ${crossed.map((l) => `${l.symbol} ${l.price}`).join(", ")}` : insiders.watchlist.length ? `Insider buy: ${insiders.watchlist.map((t) => t.symbol).join(", ")}` : null,
  nextUp.length ? `Next: ${nextUp.map((c) => `${c.title.replace(/ \(watchlist\)/, "")} ${weekday(c.date)}`).join(" · ")}` : null,
].filter(Boolean).join("\n");

const briefing = {
  generated: new Date().toISOString(),
  marketDate, closed,
  title: closed ? `Markets closed · ${pretty(today)}` : `Market close · ${pretty(marketDate)}`,
  body, headline, markets, sectors, breadth, movers, watchlist: wl, levels, insiders, catalysts, notes,
};

if (DRY || !SECRET) {
  if (!SECRET && !DRY) console.log("No GitHub identity token or ALERTS_SECRET: printing the briefing instead of sending it.");
  console.log(JSON.stringify({ title: briefing.title, body: briefing.body, headline, catalysts, levels, insiders, notes }, null, 2));
  process.exit(0);
}
const res = await fetch(`${SITE}/api/alerts/send`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${SECRET}` },
  body: JSON.stringify(briefing),
});
const out = await res.json().catch(() => ({}));
console.log(`Send: HTTP ${res.status}`, out);
if (!res.ok) process.exit(1);
