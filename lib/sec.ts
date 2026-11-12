// SEC EDGAR: free, official, no key. SEC asks for a descriptive User-Agent with a
// contact email and at most 10 requests/second.
import { parseForm4 as parseForm4Js } from "./form4.mjs";

const UA = process.env.SEC_USER_AGENT || "Arkanum (set SEC_USER_AGENT)";

// Simple concurrency gate so one page load never bursts past SEC's limit.
let active = 0;
const queue: (() => void)[] = [];
async function gate<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= 5) await new Promise<void>((r) => queue.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    queue.shift()?.();
  }
}

// Every SEC request gives up after 15 seconds, body included. Without a limit, one stalled
// response held a gate slot for good; five of them froze every SEC lookup in that server
// instance until Vercel killed each request at its time limit (2026-11-12: 214 timeouts).
const SEC_TIMEOUT_MS = 15_000;

async function secFetch(url: string, revalidate: number | false, as: "json" | "text" = "json") {
  return gate(async () => {
    const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate }, signal: AbortSignal.timeout(SEC_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`SEC ${res.status} for ${url}`);
    return as === "json" ? res.json() : res.text();
  });
}

export const secJson = (url: string, revalidate: number | false) => secFetch(url, revalidate, "json");
/** The first 64 KB of a document: enough for a press release's headline. SEC ignores byte
 * ranges, so the download is cut off after 64 KB instead of fetching a 6 MB exhibit. Not
 * cached here; callers cache the result. */
export async function secTextHead(url: string): Promise<string> {
  return gate(async () => {
    // One controller ends both the wait and the download: after 64 KB we abort instead of
    // awaiting reader.cancel(), which could leave this gate slot held indefinitely.
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), SEC_TIMEOUT_MS);
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store", signal: ctl.signal });
      if (!res.ok || !res.body) throw new Error(`SEC ${res.status} for ${url}`);
      const reader = res.body.getReader(), parts: Uint8Array[] = [];
      let size = 0;
      while (size < 65_536) { const { done, value } = await reader.read(); if (done) break; parts.push(value); size += value.length; }
      return new TextDecoder().decode(Buffer.concat(parts)).slice(0, 65_536);
    } finally {
      clearTimeout(timer);
      ctl.abort(); // drop the rest of the document (and close the connection) without waiting
    }
  });
}

export type Company = { cik: number; name: string; ticker: string; exchange: string | null };
let tickerMap: { at: number; map: Map<string, Company>; list: Company[] } | null = null;
async function companies() {
  if (!tickerMap || Date.now() - tickerMap.at > 86_400_000) {
    const d = await secFetch("https://www.sec.gov/files/company_tickers_exchange.json", 86400);
    const map = new Map<string, Company>();
    const list: Company[] = [];
    for (const [cik, name, t, exchange] of d.data as [number, string, string, string | null][]) {
      const c = { cik, name, ticker: t.toUpperCase(), exchange };
      if (!map.has(c.ticker)) { map.set(c.ticker, c); list.push(c); }
    }
    tickerMap = { at: Date.now(), map, list };
  }
  return tickerMap;
}
export async function cikForTicker(ticker: string) {
  return (await companies()).map.get(ticker.toUpperCase().replace(".", "-")) ?? null;
}
/** Company search over SEC's list of US-listed companies: ticker first, then name. */
export async function searchCompanies(q: string, limit = 8): Promise<Company[]> {
  const s = q.trim().toUpperCase();
  if (!s) return [];
  const { map, list } = await companies();
  const exact = map.get(s.replace(".", "-"));
  const listed = (c: Company) => c.exchange && c.exchange !== "OTC";
  const starts = list.filter((c) => c !== exact && listed(c) && c.ticker.startsWith(s));
  const named = list.filter((c) => c !== exact && listed(c) && !c.ticker.startsWith(s) && c.name.toUpperCase().includes(s));
  return [...(exact ? [exact] : []), ...starts, ...named].slice(0, limit);
}

export type Conviction = { score: number; tier: "strong" | "notable" | "routine"; reasons: { text: string; neg?: boolean }[] };

export type InsiderTrade = {
  /** Stock and S&P 500 change since the trade and since it was public (insider pages only; lib/returns.mjs). */
  ret?: { trade: [number, number] | null; pub: [number, number] | null };
  /** On the homepage lists: stock (s) and S&P 500 (m) since the first close after filing, over d trading days. */
  since?: { s: number; m: number; d: number; asOf?: string };
  accession: string;
  filed: string;
  symbol: string;
  issuer: string;
  owner: string;
  ownerCik?: string; // SEC ID of the insider (missing on rows saved before it was recorded)
  role: string;
  date: string;
  code: string; // P purchase, S sale, A award, M option exercise, F tax withholding, G gift...
  shares: number;
  price: number | null;
  value: number | null;
  acquired: boolean;
  ownedAfter: number | null; // this account only
  ownedTotal?: number | null; // all accounts in the filing (newer rows only)
  planned: boolean; // 10b5-1 pre-scheduled trade
  url: string;
  prevBuy?: string | null; // this insider's previous open-market buy of this stock (null: none found)
  prevBuyYears?: number; // how many years back that search reached
  conv?: Conviction | null;
  sale?: SaleFlags | null; // sales only: what stands out about it
};
export type SaleFlags = { notable: boolean; pct: number | null; flags: { text: string }[] };

export const parseForm4 = parseForm4Js as (xml: string, meta: { accession: string; filed: string; url: string }) => InsiderTrade[];

async function fetchForm4(cik: number, accession: string, filed: string, primaryDoc?: string) {
  const folder = `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}`;
  let file = primaryDoc?.split("/").pop(); // primaryDocument points at the XSL-rendered copy; the raw XML has the same name
  if (!file) {
    const idx = await secFetch(`${folder}/index.json`, false); // a filing never changes: cache it once, never rewrite it
    file = idx.directory?.item?.map((i: any) => i.name).find((n: string) => n.endsWith(".xml"));
  }
  if (!file) return [];
  const xml = await secFetch(`${folder}/${file}`, false, "text");
  return parseForm4(xml as string, { accession, filed, url: `${folder}/${accession}-index.htm` });
}

/** Most recent Form 4 trades for one company. */
export async function insidersForTicker(ticker: string, limit = 25): Promise<InsiderTrade[]> {
  const c = await cikForTicker(ticker);
  if (!c) return [];
  const sub = await secFetch(`https://data.sec.gov/submissions/CIK${String(c.cik).padStart(10, "0")}.json`, 1800); // as often as the stock page itself rebuilds
  const r = sub.filings.recent;
  const picks: number[] = [];
  for (let i = 0; i < r.form.length && picks.length < limit; i++) if (r.form[i] === "4" || r.form[i] === "4/A") picks.push(i);
  const all = await Promise.all(
    picks.map((i) => fetchForm4(c.cik, r.accessionNumber[i], r.filingDate[i], r.primaryDocument[i]).catch(() => []))
  );
  return all.flat().sort((a, b) => b.date.localeCompare(a.date));
}

/** Market-wide: the latest Form 4 filings from EDGAR's live feed. */
export async function latestInsiders(limit = 60): Promise<InsiderTrade[]> {
  const atom = (await secFetch(
    "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4&owner=include&count=100&output=atom",
    600,
    "text"
  )) as string;
  const entries = [...atom.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
  const seen = new Set<string>();
  const jobs: { cik: number; acc: string; filed: string }[] = [];
  for (const e of entries) {
    if (!/\(Issuer\)/.test(e)) continue; // each filing appears twice: once as Issuer, once as Reporting owner
    const href = e.match(/href="[^"]*\/edgar\/data\/(\d+)\/\d+\/([\d-]+)-index\.htm"/);
    const filed = e.match(/<b>Filed:<\/b> ([\d-]+)/)?.[1] ?? e.match(/&lt;b&gt;Filed:&lt;\/b&gt; ([\d-]+)/)?.[1] ?? "";
    if (!href || seen.has(href[2])) continue;
    seen.add(href[2]);
    jobs.push({ cik: Number(href[1]), acc: href[2], filed });
    if (jobs.length >= limit) break;
  }
  const all = await Promise.all(jobs.map((j) => fetchForm4(j.cik, j.acc, j.filed).catch(() => [])));
  return all.flat();
}

/** One insider's recent Form 4 trades across every company they report for. */
export async function insiderTradesByOwner(ownerCik: string, limit = 30): Promise<{ name: string; trades: InsiderTrade[] } | null> {
  const cik = Number(ownerCik);
  if (!Number.isInteger(cik) || cik <= 0) return null;
  // Only "no such filer" is a null; an SEC outage throws, so a cached page never turns into a 404.
  const sub = await secFetch(`https://data.sec.gov/submissions/CIK${String(cik).padStart(10, "0")}.json`, 3600)
    .catch((e) => { if (/SEC 404 /.test(String(e?.message))) return null; throw e; });
  const r = sub?.filings?.recent;
  if (!r) return null;
  const picks: number[] = [];
  for (let i = 0; i < r.form.length && picks.length < limit; i++) if (r.form[i] === "4" || r.form[i] === "4/A") picks.push(i);
  const all: InsiderTrade[] = [];
  // A few at a time: SEC asks clients to stay under 10 requests a second.
  for (let k = 0; k < picks.length; k += 5) {
    const batch = await Promise.all(picks.slice(k, k + 5).map((i) => fetchForm4(cik, r.accessionNumber[i], r.filingDate[i], r.primaryDocument[i]).catch(() => [])));
    all.push(...batch.flat());
  }
  return { name: String(sub.name ?? ""), trades: all.sort((a, b) => b.date.localeCompare(a.date)) };
}
