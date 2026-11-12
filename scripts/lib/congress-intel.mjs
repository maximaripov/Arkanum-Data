// House trades read together: which sectors members trade, which stocks several members bought
// at the same time, each member's track record with a 90% range, and the committees they sit on.
// Pure functions over the trade list; scripts/lib/congress-summary.mjs writes the results.
import { estAmount } from "../../lib/congress.mjs";
import { monthBootstrap } from "../../lib/bootstrap.mjs";

/** Sector for a ticker from the screener's sectors, trying the share-class spellings SEC uses. */
export function sectorOf(ticker, sectors) {
  if (!ticker) return null;
  const tries = [ticker, ticker.replace(".", "-"), ticker.replace("-", "."), { GOOG: "GOOGL", FOXA: "FOX", NWSA: "NWS" }[ticker]];
  for (const t of tries) if (t && sectors.get(t)) return sectors.get(t);
  return null;
}

/** Estimated dollars bought and sold per sector, biggest first; trades with no known sector go to "Other or foreign". */
export function sectorExposure(trades, sectors) {
  const by = new Map();
  for (const t of trades) {
    const s = sectorOf(t.ticker, sectors) ?? "Other or foreign";
    const r = by.get(s) ?? { sector: s, buy: 0, sell: 0, n: 0 };
    const usd = estAmount(t.min, t.max);
    if (t.type === "P") r.buy += usd; else r.sell += usd;
    r.n++; by.set(s, r);
  }
  return [...by.values()].map((r) => ({ ...r, buy: Math.round(r.buy), sell: Math.round(r.sell) })).sort((a, b) => b.buy + b.sell - (a.buy + a.sell));
}

const DAY = 86_400_000;
/** Stocks bought by two or more members within `days` of each other: one entry per stock, its
 * largest such group, most members first. */
export function overlaps(trades, { days = 30, since = "0000" } = {}) {
  const buys = trades.filter((t) => t.type === "P" && t.ticker && t.date >= since).sort((a, b) => a.date.localeCompare(b.date));
  const byTicker = new Map();
  for (const t of buys) { if (!byTicker.has(t.ticker)) byTicker.set(t.ticker, []); byTicker.get(t.ticker).push(t); }
  const out = [];
  for (const [ticker, list] of byTicker) {
    let best = null;
    for (let i = 0; i < list.length; i++) {
      const start = Date.parse(list[i].date);
      const win = list.filter((t) => Date.parse(t.date) >= start && Date.parse(t.date) - start <= days * DAY);
      const members = [...new Set(win.map((t) => t.member))];
      if (members.length >= 2 && (!best || members.length > best.members.length)) best = { win, members };
    }
    if (best) out.push({
      t: ticker, a: best.win[0].asset, members: best.members, first: best.win[0].date, last: best.win.at(-1).date,
      n: best.win.length, usd: Math.round(best.win.reduce((s, t) => s + estAmount(t.min, t.max), 0)),
    });
  }
  return out.sort((a, b) => b.members.length - a.members.length || b.usd - a.usd);
}

export const MIN_TRADES = 10, MIN_MONTHS = 6; // half a year of filing months: fewer would rank luck
/** A member's purchases, from when each became public to the latest close, against the S&P 500:
 * median difference, 90% range (whole filing months resampled) and a verdict that only says
 * "beat" or "trailed" when the range excludes zero. `ret` is [stock, S&P] since disclosure. */
export function trackRecord(buys) {
  const ok = buys.filter((t) => t.ret?.[0] != null && t.ret?.[1] != null);
  const diffs = ok.map((t) => t.ret[0] - t.ret[1]);
  const months = ok.map((t) => t.filed.slice(0, 7));
  if (!diffs.length) return null;
  const sorted = [...diffs].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)];
  const r = monthBootstrap(diffs, months);
  const n = diffs.length, m = r?.months ?? new Set(months).size;
  const enough = n >= MIN_TRADES && m >= MIN_MONTHS && r;
  const verdict = !enough ? "too few" : r.lo > 0 ? "beat" : r.hi < 0 ? "trailed" : "no clear edge";
  const k = (x) => Math.round(x * 10000) / 10000;
  return { n, months: m, med: k(med), lo: r ? k(r.lo) : null, hi: r ? k(r.hi) : null, verdict };
}

// House committees and the sectors their work covers most directly. Arkanum's own reading of
// each committee's jurisdiction (house.gov), kept narrow: committees that cover everything
// (Appropriations, Budget, Oversight, Rules) or no industry in particular are left out.
export const COMMITTEE_SECTORS = {
  HSAG: ["Consumer Staples", "Materials"], // Agriculture
  HSAS: ["Industrials"], // Armed Services (defense contractors)
  HSBA: ["Financials", "Real Estate"], // Financial Services
  HSIF: ["Energy", "Utilities", "Health Care", "Communication Services"], // Energy and Commerce
  HSII: ["Energy", "Materials"], // Natural Resources
  HSPW: ["Industrials", "Utilities"], // Transportation and Infrastructure
  HSSY: ["Technology", "Industrials"], // Science, Space, and Technology
  HSHM: ["Technology", "Industrials"], // Homeland Security
  HSVR: ["Health Care"], // Veterans' Affairs
  HSWM: ["Health Care"], // Ways and Means (Medicare, trade, taxes)
};

/** A member's full committees (not subcommittees) from congress-legislators' membership file. */
export function committeesFor(bioguide, membership) {
  return Object.entries(membership ?? {}).filter(([id, list]) => id.length === 4 && list.some((x) => x.bioguide === bioguide)).map(([id]) => id);
}

/** True when the trade's sector is one a committee the member sits on covers. */
export function inCommitteeSector(t, committees, sectors) {
  const s = sectorOf(t.ticker, sectors);
  return !!s && (committees ?? []).some((c) => COMMITTEE_SECTORS[c]?.includes(s));
}
