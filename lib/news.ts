// Two kinds of news for a symbol:
//  - Headlines from Yahoo Finance search (unofficial). Yahoo tags broad market stories
//    with every big ticker, so stories that name the company are ranked first.
//  - The company's own SEC 8-K filings: official announcements of earnings, executive
//    changes, deals and other material events. Free and reliable.
import { cikForTicker, secJson } from "./sec";

export type Headline = { title: string; publisher: string; link: string; time: number; aboutCompany: boolean };
export type Announcement = { date: string; items: string[]; link: string };

const ITEMS: Record<string, string> = {
  "1.01": "Signed a material agreement", "1.02": "Ended a material agreement", "1.03": "Bankruptcy or receivership",
  "1.05": "Cybersecurity incident", "2.01": "Completed an acquisition or sale", "2.02": "Quarterly results",
  "2.03": "Took on new debt", "2.04": "Debt obligation accelerated", "2.05": "Restructuring or layoffs", "2.06": "Asset write-down",
  "3.01": "Listing rule notice or delisting", "3.02": "Sold unregistered shares", "3.03": "Shareholder rights changed",
  "4.01": "Changed auditor", "4.02": "Past financial statements can't be relied on", "5.01": "Change in control",
  "5.02": "Executive or board change", "5.03": "Amended charter or bylaws", "5.07": "Shareholder vote results",
  "7.01": "Investor presentation or update", "8.01": "Other announcement",
};

async function yahooSearch(q: string) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=1&newsCount=25`,
    { headers: { "User-Agent": "Mozilla/5.0 (Foresight personal app)" }, next: { revalidate: 600 } }
  );
  return res.ok ? res.json() : {};
}

/** Yahoo's per-symbol RSS feed. Used when search has no news (crypto, FX, futures). */
async function yahooRss(symbol: string) {
  const res = await fetch(
    `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`,
    { headers: { "User-Agent": "Mozilla/5.0 (Foresight personal app)" }, next: { revalidate: 600 } }
  );
  if (!res.ok) return [];
  const xml = await res.text();
  const text = (s = "") => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => ({
    title: text(it.match(/<title>([\s\S]*?)<\/title>/)?.[1]),
    link: text(it.match(/<link>([\s\S]*?)<\/link>/)?.[1]),
    publisher: text(it.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]) || "Yahoo Finance",
    providerPublishTime: Date.parse(text(it.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1])) / 1000 || 0,
  }));
}

export async function headlines(symbol: string): Promise<Headline[]> {
  const d = await yahooSearch(symbol);
  const q = d.quotes?.[0];
  // Words that identify the company in a headline: the ticker and the first word of its name.
  const nameWord = String(q?.shortname ?? q?.longname ?? "").split(/[\s,.]+/)[0];
  const raw: any[] = d.news?.length ? d.news : await yahooRss(symbol);
  const isCrypto = /-USD$/.test(symbol);
  const words = [symbol.replace(/[-=^].*$/, "").replace(/^\^/, ""), nameWord.length > 2 ? nameWord : "", isCrypto ? "crypto" : ""].filter(Boolean);
  const re = new RegExp(`\\b(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "i");
  const all: Headline[] = raw
    .filter((n: any) => n.title && n.link)
    .map((n: any) => ({ title: n.title, publisher: n.publisher ?? "", link: n.link, time: n.providerPublishTime ?? 0, aboutCompany: re.test(n.title) }));
  const about = all.filter((h) => h.aboutCompany).sort((a, b) => b.time - a.time);
  const general = all.filter((h) => !h.aboutCompany).sort((a, b) => b.time - a.time);
  // Company stories first; pad with a few market stories only when there are too few.
  return [...about.slice(0, 10), ...general.slice(0, Math.max(0, 5 - about.length))];
}

export async function announcements(symbol: string, limit = 10): Promise<Announcement[]> {
  const c = await cikForTicker(symbol);
  if (!c) return [];
  const sub = await secJson(`https://data.sec.gov/submissions/CIK${String(c.cik).padStart(10, "0")}.json`, 900);
  const r = sub.filings.recent;
  const out: Announcement[] = [];
  for (let i = 0; i < r.form.length && out.length < limit; i++) {
    if (r.form[i] !== "8-K") continue;
    const items = String(r.items[i] ?? "").split(",").map((s: string) => s.trim()).filter((s: string) => s && s !== "9.01");
    out.push({
      date: r.filingDate[i],
      items: items.map((s: string) => ITEMS[s] ?? `Item ${s}`),
      link: `https://www.sec.gov/Archives/edgar/data/${c.cik}/${r.accessionNumber[i].replace(/-/g, "")}/${r.primaryDocument[i]}`,
    });
  }
  return out;
}
