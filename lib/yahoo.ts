// Yahoo Finance's public chart endpoints. Unofficial: no key, but it can change
// or rate-limit without notice. Fine for a personal app; not licensed for redistribution.
const UA = "Mozilla/5.0 (Foresight personal app)";
const BASE = "https://query1.finance.yahoo.com";

export type Quote = {
  symbol: string;
  price: number | null;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  spark: number[];
  time: number | null;
};

async function yget(path: string, revalidate: number) {
  const res = await fetch(BASE + path, {
    headers: { "User-Agent": UA },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status} for ${path}`);
  return res.json();
}

/** Batch quotes with an intraday sparkline. Yahoo caps a batch at 20 symbols. */
export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += 20) chunks.push(symbols.slice(i, i + 20));
  const results = await Promise.all(
    chunks.map((c) =>
      yget(`/v8/finance/spark?symbols=${encodeURIComponent(c.join(","))}&range=1d&interval=5m`, 5).catch(() => ({}))
    )
  );
  const merged: Record<string, any> = Object.assign({}, ...results);
  return symbols.map((symbol) => {
    const d = merged[symbol];
    if (!d) return { symbol, price: null, prevClose: null, change: null, changePct: null, spark: [], time: null };
    const closes: number[] = (d.close ?? []).filter((x: number | null) => x != null);
    const price = closes.at(-1) ?? d.fulldayPrice ?? null; // regular session; fulldayPrice mixes in extended-hours trades
    const prevClose = d.previousClose ?? d.chartPreviousClose ?? null;
    const change = price != null && prevClose != null ? price - prevClose : null;
    return {
      symbol,
      price,
      prevClose,
      change,
      changePct: change != null && prevClose ? (change / prevClose) * 100 : null,
      spark: closes,
      time: d.timestamp?.at(-1) ?? null,
    };
  });
}

const RANGES: Record<string, { range: string; interval: string; ttl: number }> = {
  "1d": { range: "1d", interval: "2m", ttl: 15 },
  "5d": { range: "5d", interval: "15m", ttl: 60 },
  "1mo": { range: "1mo", interval: "1h", ttl: 300 },
  "6mo": { range: "6mo", interval: "1d", ttl: 900 },
  "1y": { range: "1y", interval: "1d", ttl: 900 },
  "5y": { range: "5y", interval: "1wk", ttl: 3600 },
};

export async function getChart(symbol: string, key: string) {
  const r = RANGES[key] ?? RANGES["1y"];
  const data = await yget(
    `/v8/finance/chart/${encodeURIComponent(symbol)}?range=${r.range}&interval=${r.interval}`,
    r.ttl
  );
  const res = data?.chart?.result?.[0];
  if (!res) throw new Error("No chart data");
  const q = res.indicators?.quote?.[0] ?? {};
  const ts: number[] = res.timestamp ?? [];
  const candles = ts
    .map((t, i) => ({ time: t, open: q.open?.[i], high: q.high?.[i], low: q.low?.[i], close: q.close?.[i], volume: q.volume?.[i] }))
    .filter((c) => c.open != null && c.close != null);
  const m = res.meta;
  return {
    meta: {
      symbol: m.symbol,
      name: m.longName ?? m.shortName ?? m.symbol,
      exchange: m.fullExchangeName ?? m.exchangeName,
      currency: m.currency,
      type: m.instrumentType,
      price: m.regularMarketPrice,
      prevClose: m.chartPreviousClose ?? m.previousClose,
      dayHigh: m.regularMarketDayHigh,
      dayLow: m.regularMarketDayLow,
      volume: m.regularMarketVolume,
      high52: m.fiftyTwoWeekHigh,
      low52: m.fiftyTwoWeekLow,
      timezone: m.exchangeTimezoneName,
    },
    candles,
  };
}

export async function search(q: string) {
  const data = await yget(`/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`, 3600);
  return (data.quotes ?? [])
    .filter((x: any) => x.symbol)
    .map((x: any) => ({ symbol: x.symbol, name: x.longname ?? x.shortname ?? "", type: x.typeDisp ?? x.quoteType ?? "", exchange: x.exchDisp ?? "" }));
}
