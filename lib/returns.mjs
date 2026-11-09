// What a stock did after a trade, alone and against the S&P 500 (SPY), from daily closes
// adjusted for splits and dividends. Two starting points:
//   since the trade   the close on the trade date (or the next trading day): what the trader made
//   since public      the first close after the filing date: what a reader of the filing could have got
// Both run to the latest close. Prices come from Yahoo's chart endpoint and are used only to
// compute these numbers; no prices are published. Plain JS: used by the Congress job and the site.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Daily closes [[YYYY-MM-DD, adjusted close, actual close], ...] from `from` to today, or null.
 *  `init` is passed to fetch (Next caching). */
export async function dailyCloses(symbol, from, { fetchImpl = fetch, init = {} } = {}) {
  const y = await yahooCloses(symbol, from, fetchImpl, init);
  if (y !== undefined) return y;
  // Yahoo's endpoint is unofficial and can be blocked or changed at any time; when it fails
  // (not merely "no such symbol"), fall back to Tiingo's official API if a key is set.
  return tiingoCloses(symbol, from, fetchImpl, init);
}

/** Yahoo: the closes, null for an unknown symbol, or undefined when Yahoo itself failed. */
async function yahooCloses(symbol, from, fetchImpl, init) {
  const y = String(symbol).toUpperCase().replace(/\./g, "-");
  // The window is rounded so the URL (Next's cache key) stays the same all day and is shared by
  // every trade in the same month: start on the 1st of the month (less 10 days of slack), end at
  // the next UTC midnight. With the exact second in it, every page build wrote new cache entries.
  const t = new Date(Date.parse(from)), day = 86400;
  const p1 = Math.floor(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1) / 1000) - day * 10, p2 = Math.ceil(Date.now() / 1000 / day) * day;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(y)}?period1=${p1}&period2=${p2}&interval=1d&events=split,div`;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetchImpl(url, { headers: { "User-Agent": "Mozilla/5.0 (research)" }, signal: AbortSignal.timeout(20_000), ...init });
      if (r.status === 404) return null;
      if (r.status === 429) { await sleep(4000 * (i + 1)); continue; }
      if (!r.ok) return undefined;
      const res = (await r.json()).chart?.result?.[0];
      if (!res) return undefined; // Yahoo changed its format: let the fallback try
      const ts = res?.timestamp ?? [], raw = res?.indicators?.quote?.[0]?.close ?? [], adj = res?.indicators?.adjclose?.[0]?.adjclose ?? raw;
      const out = [];
      for (let k = 0; k < ts.length; k++) if (adj[k] != null) out.push([new Date(ts[k] * 1000).toISOString().slice(0, 10), adj[k], raw[k] ?? null]);
      return out.length ? out : null;
    } catch { await sleep(1500); }
  }
  return undefined;
}

/** Tiingo (official API, free key in TIINGO_API_KEY): same shape as Yahoo, or null. Same rounded
 *  window as Yahoo so the request, and Next's cache key, stays the same all day. */
async function tiingoCloses(symbol, from, fetchImpl, init) {
  const key = typeof process !== "undefined" ? process.env.TIINGO_API_KEY : undefined;
  if (!key) return null;
  const t = new Date(Date.parse(from));
  const start = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1) - 10 * 86_400_000).toISOString().slice(0, 10);
  const end = new Date(Math.ceil(Date.now() / 86_400_000) * 86_400_000).toISOString().slice(0, 10);
  const s = String(symbol).toLowerCase().replace(/\./g, "-");
  try {
    const r = await fetchImpl(`https://api.tiingo.com/tiingo/daily/${encodeURIComponent(s)}/prices?startDate=${start}&endDate=${end}`,
      { headers: { Authorization: `Token ${key}` }, signal: AbortSignal.timeout(20_000), ...init });
    if (!r.ok) return null;
    const rows = await r.json();
    if (!Array.isArray(rows)) return null;
    const out = rows.filter((x) => x?.adjClose != null).map((x) => [String(x.date).slice(0, 10), x.adjClose, x.close ?? null]);
    return out.length ? out : null;
  } catch { return null; }
}

/** Index of the first close on (or, with after, strictly after) a date; -1 if none. */
function startAt(series, date, after) {
  return series.findIndex(([d]) => (after ? d > date : d >= date));
}

/** Change from a starting close to the latest, or null when the start is missing or is the latest close. */
function change(series, date, after) {
  if (!series || !date) return null;
  const i = startAt(series, date, after);
  if (i < 0 || i >= series.length - 1) return null;
  // History that starts well after the date belongs to a later listing under the same symbol.
  if (Date.parse(series[i][0]) - Date.parse(date) > 10 * 86_400_000) return null;
  return series.at(-1)[1] / series[i][1] - 1;
}

/** True when the price paid is within a third of the stock's actual close that day: otherwise
 *  the symbol now belongs to another company (reused after a merger or delisting), or the price is wrong. */
export function priceMatches(series, date, paid) {
  if (!series || !date || !paid) return true; // nothing to check against (Congress reports have no price)
  const i = startAt(series, date, false), c = series[i]?.[2];
  return c == null || (c / paid > 0.67 && c / paid < 1.5);
}

/** { trade: [stock, spy] | null, pub: [stock, spy] | null }, as fractions (0.12 = +12%). With
 *  `paid` (price per share), a series whose price that day doesn't match gives no returns.
 * @param {any} series @param {any} spy
 * @param {{ traded?: string | null, filed?: string | null, paid?: number | null }} opts
 * @returns {{ trade: [number, number] | null, pub: [number, number] | null }} */
export function tradeReturns(series, spy, { traded, filed, paid = null }) {
  if (!priceMatches(series, traded, paid)) return { trade: null, pub: null };
  /** @returns {[number, number] | null} */
  const pair = (date, after) => {
    const a = change(series, date, after), b = change(spy, date, after);
    return a == null || b == null ? null : [a, b];
  };
  return { trade: traded ? pair(traded, false) : null, pub: filed ? pair(filed, true) : null };
}

/** Closes for many symbols, a few at a time; missing ones are left out. */
export async function closesFor(symbols, from, opts = {}) {
  const out = new Map(), list = [...new Set(symbols)];
  for (let i = 0; i < list.length; i += 4) {
    const batch = list.slice(i, i + 4);
    const got = await Promise.all(batch.map((s) => dailyCloses(s, from, opts)));
    batch.forEach((s, k) => got[k] && out.set(s, got[k]));
    if (opts.pause) await sleep(opts.pause);
  }
  return out;
}

/** Median of a list (null when empty). */
export const median = (xs) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

/** Summary of many trades' returns from one starting point: count, median stock and S&P change, share that beat the S&P. */
export function summarize(pairs) {
  const ok = pairs.filter(Boolean);
  if (!ok.length) return null;
  return { n: ok.length, stock: median(ok.map((p) => p[0])), spy: median(ok.map((p) => p[1])), beat: ok.filter((p) => p[0] > p[1]).length / ok.length };
}
