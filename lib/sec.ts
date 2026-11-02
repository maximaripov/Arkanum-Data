// SEC EDGAR: free, official, no key. SEC asks for a descriptive User-Agent with a
// contact email and at most 10 requests/second.
import { parseForm4 as parseForm4Js } from "./form4.mjs";

const UA = process.env.SEC_USER_AGENT || "Foresight personal app (set SEC_USER_AGENT)";

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

async function secFetch(url: string, revalidate: number, as: "json" | "text" = "json") {
  return gate(async () => {
    const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate } });
    if (!res.ok) throw new Error(`SEC ${res.status} for ${url}`);
    return as === "json" ? res.json() : res.text();
  });
}

export const secJson = (url: string, revalidate: number) => secFetch(url, revalidate, "json");

let tickerMap: { at: number; map: Map<string, { cik: number; name: string }> } | null = null;
export async function cikForTicker(ticker: string) {
  if (!tickerMap || Date.now() - tickerMap.at > 86_400_000) {
    const d = await secFetch("https://www.sec.gov/files/company_tickers_exchange.json", 86400);
    const map = new Map<string, { cik: number; name: string }>();
    for (const [cik, name, t] of d.data as [number, string, string, string][]) map.set(t.toUpperCase(), { cik, name });
    tickerMap = { at: Date.now(), map };
  }
  return tickerMap.map.get(ticker.toUpperCase().replace(".", "-")) ?? null;
}

export type InsiderTrade = {
  accession: string;
  filed: string;
  symbol: string;
  issuer: string;
  owner: string;
  role: string;
  date: string;
  code: string; // P purchase, S sale, A award, M option exercise, F tax withholding, G gift...
  shares: number;
  price: number | null;
  value: number | null;
  acquired: boolean;
  ownedAfter: number | null;
  planned: boolean; // 10b5-1 pre-scheduled trade
  url: string;
};

export const parseForm4 = parseForm4Js as (xml: string, meta: { accession: string; filed: string; url: string }) => InsiderTrade[];

async function fetchForm4(cik: number, accession: string, filed: string, primaryDoc?: string) {
  const folder = `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}`;
  let file = primaryDoc?.split("/").pop(); // primaryDocument points at the XSL-rendered copy; the raw XML has the same name
  if (!file) {
    const idx = await secFetch(`${folder}/index.json`, 86400);
    file = idx.directory?.item?.map((i: any) => i.name).find((n: string) => n.endsWith(".xml"));
  }
  if (!file) return [];
  const xml = await secFetch(`${folder}/${file}`, 86400, "text");
  return parseForm4(xml as string, { accession, filed, url: `${folder}/${accession}-index.htm` });
}

/** Most recent Form 4 trades for one company. */
export async function insidersForTicker(ticker: string, limit = 25): Promise<InsiderTrade[]> {
  const c = await cikForTicker(ticker);
  if (!c) return [];
  const sub = await secFetch(`https://data.sec.gov/submissions/CIK${String(c.cik).padStart(10, "0")}.json`, 900);
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
