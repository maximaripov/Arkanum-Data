// The Insiders overview's numbers and lists, from the merged 30-day + today trades.
// The hourly and daily jobs write it to public/data/overview.json (a few KB) so the home
// page doesn't download the whole 30-day file; the page computes it itself as a fallback.
// Plain JS so the scripts and the site share it.
import { isExecOrDirector } from "./people.mjs";

const KEEP = ["accession", "code", "symbol", "issuer", "owner", "ownerCik", "role", "value", "shares", "price", "date", "filed", "url", "planned", "conv", "sale"];
const slim = (t) => Object.fromEntries(KEEP.filter((k) => t[k] !== undefined).map((k) => [k, t[k]]));
const when = (t) => t.filed || t.date;
const byScore = (a, b) => (b.conv?.score ?? 0) - (a.conv?.score ?? 0) || (b.value ?? 0) - (a.value ?? 0);

/**
 * @param data {{ trades, days, updated }} from mergeInsiders (trades already scored)
 * @param now ms timestamp; the "this week" cut-off for the phone's lead buy
 */
export function buildOverview({ trades = [], days = [], updated = null }, now = Date.now()) {
  // Executive and director buys only: the trades that carry a signal.
  const buys = trades.filter((t) => t.code === "P" && isExecOrDirector(t) && t.value);
  const sales = trades.filter((t) => t.code === "S" && isExecOrDirector(t));

  // Strongest buys: each company's highest-scoring purchase, strongest first.
  const best = new Map();
  for (const t of buys) { const b = best.get(t.symbol); if (!b || (t.conv?.score ?? 0) > (b.conv?.score ?? 0)) best.set(t.symbol, t); }
  const strongest = [...best.values()].sort(byScore).slice(0, 10);

  // Phones lead with one buy: the strongest filed in the last 7 days (or 30 if none).
  const week = new Date(now - 7 * 86_400_000).toISOString().slice(0, 10);
  const recent = buys.filter((t) => when(t) >= week && (t.value ?? 0) >= 25_000).sort(byScore)[0];
  const heroT = recent ?? strongest[0] ?? null;

  // Several insiders buying one stock. Under ~$25K per insider is usually an employee
  // share-purchase plan, not conviction buying.
  const by = new Map();
  for (const t of trades.filter((x) => x.code === "P" && isExecOrDirector(x))) {
    const c = by.get(t.symbol) ?? { symbol: t.symbol, issuer: t.issuer, value: 0, last: "", names: new Set() };
    c.value += t.value ?? 0; c.names.add(t.owner);
    if (when(t) > c.last) c.last = when(t);
    by.set(t.symbol, c);
  }
  const clusters = [...by.values()].filter((c) => c.names.size > 1 && c.value / c.names.size >= 25_000)
    .sort((a, b) => b.names.size - a.names.size || b.value - a.value)
    .map(({ names, ...c }) => ({ ...c, people: names.size }));

  // Buying by day (filing date), every day in the window even when empty.
  const daily = new Map(days.map((d) => [d, { key: d, value: 0, people: new Set(), cos: new Set() }]));
  for (const t of buys) {
    const d = daily.get(when(t)) ?? { key: when(t), value: 0, people: new Set(), cos: new Set() };
    d.value += t.value ?? 0; d.people.add(t.owner); d.cos.add(t.symbol); daily.set(when(t), d);
  }
  const byDay = [...daily.values()].sort((a, b) => a.key.localeCompare(b.key)).map((d) => ({ key: d.key, value: d.value, people: d.people.size, cos: d.cos.size }));

  const latest = trades.filter((t) => (t.code === "P" || t.code === "S") && t.value && isExecOrDirector(t))
    .sort((a, b) => when(b).localeCompare(when(a)) || (b.value ?? 0) - (a.value ?? 0)).slice(0, 8);
  const notableSales = sales.filter((t) => t.sale?.notable)
    .sort((a, b) => when(b).localeCompare(when(a)) || (b.value ?? 0) - (a.value ?? 0)).slice(0, 8);

  return {
    updated,
    totals: {
      value: buys.reduce((a, t) => a + (t.value ?? 0), 0), buys: buys.length,
      people: new Set(buys.map((t) => t.owner)).size, cos: new Set(buys.map((t) => t.symbol)).size,
      strong: buys.filter((t) => t.conv?.tier === "strong").length,
      // The 30-day file keeps only sales of $250K or more, so these are "large sales".
      sales: sales.length, salesValue: sales.reduce((a, t) => a + (t.value ?? 0), 0),
      notableSales: sales.filter((t) => t.sale?.notable).length,
    },
    hero: heroT ? { t: slim(heroT), recent: !!recent } : null,
    strongest: strongest.map(slim),
    clusters: clusters.slice(0, 6), clusterCount: clusters.length,
    byDay, latest: latest.map(slim), notableSales: notableSales.map(slim),
  };
}
