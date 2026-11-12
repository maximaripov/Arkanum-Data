// The files the Congress pages read, built from the full trade list (congress.json):
//   public/data/congress-overview.json   the /congress page (headline numbers, lists, members)
//   public/data/congress/<slug>.json     one per member, for /congress/<slug>
//   public/data/congress-trades.json     every stock trade, for the page's filters and sorting
// Member files carry no timestamp, so a daily run only changes the ones with new trades.
//   node scripts/lib/congress-summary.mjs [--no-returns]   rebuilds them from congress.json
// (fetching prices for the returns after each trade unless --no-returns)
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { memberSlug, estAmount } from "../../lib/congress.mjs";
import { closesFor, dailyCloses, tradeReturns, summarize } from "../../lib/returns.mjs";

const DIR = "public/data/congress";
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
const seat = (t) => `${t.state}${t.district ? "-" + t.district : ""}`;
const r4 = (x) => (x == null ? null : Math.round(x * 10000) / 10000);
// r: [stock since trade, S&P since trade, stock since public, S&P since public] (fractions; null = not available)
const slim = (t) => ({ ...(t.ret ? { r: [r4(t.ret.trade?.[0]), r4(t.ret.trade?.[1]), r4(t.ret.pub?.[0]), r4(t.ret.pub?.[1])] } : {}), m: t.member, p: t.party?.[0] ?? null, sd: seat(t), f: t.filed, d: t.date, o: t.owner, t: t.ticker, a: t.asset, y: t.type, x: t.partial || undefined, du: t.dateUnclear || undefined, lo: t.min, hi: t.max, u: t.url, ac: t.account || undefined, am: t.amendedIn ? 1 : undefined });
const rank = (list, type) => {
  const by = new Map();
  for (const t of list.filter((x) => x.type === type)) { const r = by.get(t.ticker) ?? { t: t.ticker, a: t.asset, members: new Set(), n: 0, usd: 0 }; r.members.add(t.member); r.n++; r.usd += estAmount(t.min, t.max); by.set(t.ticker, r); }
  // Ranked by estimated dollars (range midpoints), then by how many members traded it.
  return [...by.values()].map((r) => ({ t: r.t, a: r.a, members: r.members.size, n: r.n, usd: Math.round(r.usd) })).sort((a, b) => b.usd - a.usd || b.members - a.members).slice(0, 10);
};

/** Adds .ret (see lib/returns.mjs) to each trade whose stock has prices. Returns the date of the latest close, or null. */
async function addReturns(stocks) {
  const from = stocks.reduce((a, t) => (t.date && t.date < a ? t.date : a), "9999");
  const spy = await dailyCloses("SPY", from);
  if (!spy) { console.log("returns: no S&P 500 prices, skipped"); return null; }
  const px = await closesFor(stocks.map((t) => t.ticker), from, { pause: 100 });
  for (const t of stocks) { const s = px.get(t.ticker); if (s) t.ret = tradeReturns(s, spy, { traded: t.dateUnclear ? null : t.date, filed: t.filed }); }
  console.log(`returns: prices for ${px.size} of ${new Set(stocks.map((t) => t.ticker)).size} stocks, as of ${spy.at(-1)[0]}`);
  return spy.at(-1)[0];
}
const summary = (list) => {
  const one = (pairs) => { const x = summarize(pairs); return x && { n: x.n, stock: r4(x.stock), spy: r4(x.spy), beat: r4(x.beat) }; };
  return { trade: one(list.map((t) => t.ret?.trade)), pub: one(list.map((t) => t.ret?.pub)) };
};

/** @param {any[]} keep trades, newest filing first @param {number} scannedSkipped @param {{ returns?: boolean }} [opts] */
export async function writeSummaries(keep, scannedSkipped, { returns = true } = {}) {
  const stocks = keep.filter((t) => t.ticker && (t.assetType === "ST" || !t.assetType) && t.type !== "E");
  const asOf = returns ? await addReturns(stocks) : null;
  const recent90 = stocks.filter((t) => t.date >= daysAgo(90));
  const members = new Map();
  for (const t of stocks) {
    const m = members.get(t.member) ?? { m: t.member, s: memberSlug(t.member), p: t.party?.[0] ?? null, sd: seat(t), current: t.current, n: 0, buys: 0, sells: 0, usd: 0, buyUsd: 0, sellUsd: 0, last: "", trades: [] };
    const usd = estAmount(t.min, t.max);
    m.n++; m.usd += usd; if (t.type === "P") { m.buys++; m.buyUsd += usd; } else { m.sells++; m.sellUsd += usd; }
    if (t.date > m.last) m.last = t.date;
    m.trades.push(slim(t));
    members.set(t.member, m);
  }
  const bySlug = new Map();
  for (const m of members.values()) {
    if (bySlug.has(m.s)) throw new Error(`Two members share the page address ${m.s}: ${bySlug.get(m.s)} and ${m.m}`);
    bySlug.set(m.s, m.m);
  }
  const lag = stocks.filter((t) => t.filed >= daysAgo(365) && !t.dateUnclear).map((t) => (Date.parse(t.filed) - Date.parse(t.date)) / 86_400_000).sort((a, b) => a - b);
  const last30 = stocks.filter((t) => t.filed >= daysAgo(30));
  // The same lists over other windows (by trade date): most bought and sold, and each member's
  // estimated dollars, trades, buys and sales, for the page's 30 days / 90 days / 1 year / 2 years.
  const WINDOWS = [30, 90, 365, 730];
  const windows = Object.fromEntries(WINDOWS.map((d) => { const w = stocks.filter((t) => t.date >= daysAgo(d)); return [d, { bought: rank(w, "P"), sold: rank(w, "S") }]; }));
  for (const m of members.values()) m.w = Object.fromEntries(WINDOWS.map((d) => [d, [0, 0, 0, 0]]));
  for (const t of stocks) for (const d of WINDOWS) if (t.date >= daysAgo(d)) { const w = members.get(t.member).w[d]; w[0] += estAmount(t.min, t.max); w[1]++; w[t.type === "P" ? 2 : 3]++; }
  for (const m of members.values()) {
    for (const d of WINDOWS) m.w[d][0] = Math.round(m.w[d][0]);
    for (const k of ["usd", "buyUsd", "sellUsd"]) m[k] = Math.round(m[k]);
    // How the stocks did after this member's buys and after their sales.
    if (asOf) m.ret = { buys: summary(stocks.filter((t) => t.member === m.m && t.type === "P")), sells: summary(stocks.filter((t) => t.member === m.m && t.type !== "P")) };
  }
  const list = [...members.values()].sort((a, b) => b.usd - a.usd || b.n - a.n); // by estimated dollars traded
  await writeFile("public/data/congress-overview.json", JSON.stringify({
    updated: new Date().toISOString(),
    returnsAsOf: asOf,
    stats: { trades30: last30.length, members30: new Set(last30.map((t) => t.member)).size, buys30: last30.filter((t) => t.type === "P").length, sells30: last30.filter((t) => t.type === "S").length, medianDelay: lag.length ? Math.round(lag[Math.floor(lag.length / 2)]) : null, scannedSkipped, total: stocks.length },
    latest: stocks.slice(0, 60).map(slim),
    bought: rank(recent90, "P"), sold: rank(recent90, "S"), windows,
    members: list.map(({ trades, ...m }) => m),
  }));
  // Every stock trade, for the Congress page's filters and sorting (fetched only when used).
  // Shortened asset names to keep it small; returns kept (the table shows them).
  await writeFile("public/data/congress-trades.json", JSON.stringify({ trades: stocks.map((t) => { const { ac, ...x } = slim(t); return { ...x, a: x.a.replace(/\s*-?\s*(Common Stock|Class [A-C] Common Stock|Ordinary Shares).*$/i, "").slice(0, 40) }; }) }));
  await mkdir(DIR, { recursive: true });
  for (const f of await readdir(DIR)) if (!bySlug.has(f.replace(/\.json$/, ""))) await rm(`${DIR}/${f}`);
  for (const { trades, ...m } of list) await writeFile(`${DIR}/${m.s}.json`, JSON.stringify({ member: m, returnsAsOf: asOf, trades }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { trades, scannedSkipped } = JSON.parse(await readFile("public/data/congress.json", "utf8"));
  await writeSummaries(trades, scannedSkipped ?? 0, { returns: !process.argv.includes("--no-returns") });
  console.log("congress summaries rebuilt");
}
