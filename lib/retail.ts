// Retail-investor interest. No free source says how many retail investors bought a
// stock (Robinhood closed its public popularity data in 2020), so we show two proxies:
//
// 1. Reddit chatter (ApeWisdom): mentions across WallStreetBets and other stock
//    subreddits in the last 24 hours, and the change from the day before.
// 2. Retail order flow (FINRA): retail brokers (Robinhood, Schwab, Fidelity…) route most
//    customer orders to a few wholesalers that fill them off-exchange. FINRA publishes
//    each firm's weekly volume per stock with a 2–4 week delay. Shows how much
//    retail-type trading happened, not whether it was buying or selling.
const WHOLESALERS = [/CITADEL SECURITIES/i, /VIRTU AMERICAS/i, /G1 EXECUTION/i, /JANE STREET/i, /TWO SIGMA SECURITIES/i, /HRT FINANCIAL/i];

export type RedditInterest = { rank: number; mentions: number; mentions24hAgo: number; upvotes: number; rankDayAgo: number | null; tracked: number };
export type RetailFlow = { week: string; shares: number; trades: number; avgTradeSize: number; shareOfVolumePct: number | null }[];

let apeCache: { at: number; map: Map<string, RedditInterest>; tracked: number } | null = null;
export async function redditInterest(symbol: string): Promise<RedditInterest | null> {
  if (!apeCache || Date.now() - apeCache.at > 30 * 60_000) {
    const map = new Map<string, RedditInterest>();
    let tracked = 0;
    for (let page = 1; page <= 6; page++) {
      try {
        const r = await fetch(`https://apewisdom.io/api/v1.0/filter/all-stocks/page/${page}`, { headers: { "User-Agent": "Foresight personal app" }, signal: AbortSignal.timeout(10_000) });
        const d = await r.json();
        for (const x of d.results ?? []) map.set(String(x.ticker).toUpperCase(), { rank: +x.rank, mentions: +x.mentions, mentions24hAgo: +x.mentions_24h_ago || 0, upvotes: +x.upvotes || 0, rankDayAgo: x.rank_24h_ago ? +x.rank_24h_ago : null, tracked: 0 });
        tracked = d.count ?? tracked;
        if (page >= (d.pages ?? 1)) break;
      } catch { break; }
    }
    for (const v of map.values()) v.tracked = tracked;
    if (map.size) apeCache = { at: Date.now(), map, tracked };
  }
  return apeCache?.map.get(symbol.toUpperCase()) ?? null;
}

async function finraWeek(symbol: string, week: string) {
  for (const tier of ["T1", "T2"]) {
    try {
      const r = await fetch("https://api.finra.org/data/group/otcMarket/name/weeklySummary", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "Foresight personal app" },
        body: JSON.stringify({ limit: 500, compareFilters: [
          { compareType: "equal", fieldName: "weekStartDate", fieldValue: week },
          { compareType: "equal", fieldName: "tierIdentifier", fieldValue: tier },
          { compareType: "equal", fieldName: "issueSymbolIdentifier", fieldValue: symbol },
        ] }),
        next: { revalidate: 43200 },
        signal: AbortSignal.timeout(15_000),
      });
      if (!r.ok) continue;
      const rows = await r.json();
      if (Array.isArray(rows) && rows.length) return rows;
    } catch {}
  }
  return null;
}

export async function retailFlow(symbol: string): Promise<RetailFlow | null> {
  if (/[=^]|-USD$/.test(symbol)) return null;
  // Weeks start on Monday; try the last 8 and keep the 4 newest FINRA has published.
  const mondays: string[] = [];
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) - 7);
  for (let i = 0; i < 8; i++) { mondays.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() - 7); }
  const weeks = (await Promise.all(mondays.map(async (w) => ({ w, rows: await finraWeek(symbol, w) })))).filter((x) => x.rows).slice(0, 4);
  if (!weeks.length) return null;
  // Total weekly volume (all venues) from Yahoo, to express wholesaler volume as a share.
  const vol = new Map<string, number>();
  try {
    const y = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=3mo&interval=1d`, { headers: { "User-Agent": "Mozilla/5.0 (Foresight personal app)" }, next: { revalidate: 43200 } }).then((r) => r.json());
    const res = y.chart.result[0];
    res.timestamp.forEach((t: number, i: number) => {
      const day = new Date(t * 1000);
      day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
      const wk = day.toISOString().slice(0, 10);
      vol.set(wk, (vol.get(wk) ?? 0) + (res.indicators.quote[0].volume[i] ?? 0));
    });
  } catch {}
  return weeks.map(({ w, rows }) => {
    const ws = rows!.filter((r: any) => r.summaryTypeCode === "OTC_W_SMBL_FIRM" && WHOLESALERS.some((re) => re.test(r.marketParticipantName ?? "")));
    const shares = ws.reduce((a: number, r: any) => a + (r.totalWeeklyShareQuantity ?? 0), 0);
    const trades = ws.reduce((a: number, r: any) => a + (r.totalWeeklyTradeCount ?? 0), 0);
    const total = vol.get(w);
    return { week: w, shares: Math.round(shares), trades, avgTradeSize: trades ? Math.round(shares / trades) : 0, shareOfVolumePct: total ? (shares / total) * 100 : null };
  });
}
