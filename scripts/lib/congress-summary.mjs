// The files the Congress pages read, built from the full trade list (congress.json):
//   public/data/congress-overview.json   the /congress page (headline numbers, lists, members)
//   public/data/congress/<slug>.json     one per member, for /congress/<slug>
// Member files carry no timestamp, so a daily run only changes the ones with new trades.
//   node scripts/lib/congress-summary.mjs   rebuilds them from congress.json without fetching
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { memberSlug } from "../../lib/congress.mjs";

const DIR = "public/data/congress";
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
const seat = (t) => `${t.state}${t.district ? "-" + t.district : ""}`;
const slim = (t) => ({ m: t.member, p: t.party?.[0] ?? null, sd: seat(t), f: t.filed, d: t.date, o: t.owner, t: t.ticker, a: t.asset, y: t.type, x: t.partial || undefined, du: t.dateUnclear || undefined, lo: t.min, hi: t.max, u: t.url });
const rank = (list, type) => {
  const by = new Map();
  for (const t of list.filter((x) => x.type === type)) { const r = by.get(t.ticker) ?? { t: t.ticker, a: t.asset, members: new Set(), n: 0 }; r.members.add(t.member); r.n++; by.set(t.ticker, r); }
  return [...by.values()].map((r) => ({ t: r.t, a: r.a, members: r.members.size, n: r.n })).sort((a, b) => b.members - a.members || b.n - a.n).slice(0, 10);
};

/** @param {any[]} keep trades, newest filing first @param {number} scannedSkipped */
export async function writeSummaries(keep, scannedSkipped) {
  const stocks = keep.filter((t) => t.ticker && (t.assetType === "ST" || !t.assetType) && t.type !== "E");
  const recent90 = stocks.filter((t) => t.date >= daysAgo(90));
  const members = new Map();
  for (const t of stocks) {
    const m = members.get(t.member) ?? { m: t.member, s: memberSlug(t.member), p: t.party?.[0] ?? null, sd: seat(t), current: t.current, n: 0, buys: 0, sells: 0, last: "", trades: [] };
    m.n++; if (t.type === "P") m.buys++; else m.sells++;
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
  const list = [...members.values()].sort((a, b) => b.n - a.n);
  await writeFile("public/data/congress-overview.json", JSON.stringify({
    updated: new Date().toISOString(),
    stats: { trades30: last30.length, members30: new Set(last30.map((t) => t.member)).size, buys30: last30.filter((t) => t.type === "P").length, sells30: last30.filter((t) => t.type === "S").length, medianDelay: lag.length ? Math.round(lag[Math.floor(lag.length / 2)]) : null, scannedSkipped, total: stocks.length },
    latest: stocks.slice(0, 60).map(slim),
    bought: rank(recent90, "P"), sold: rank(recent90, "S"),
    members: list.map(({ trades, ...m }) => m),
  }));
  await mkdir(DIR, { recursive: true });
  for (const f of await readdir(DIR)) if (!bySlug.has(f.replace(/\.json$/, ""))) await rm(`${DIR}/${f}`);
  for (const { trades, ...m } of list) await writeFile(`${DIR}/${m.s}.json`, JSON.stringify({ member: m, trades }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { trades, scannedSkipped } = JSON.parse(await readFile("public/data/congress.json", "utf8"));
  await writeSummaries(trades, scannedSkipped ?? 0);
  console.log("congress summaries rebuilt");
}
