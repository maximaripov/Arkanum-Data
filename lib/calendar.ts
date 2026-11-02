// Earnings and dividends for a symbol.
//   Earnings: Nasdaq (dates from Zacks; "estimated" until the company confirms), the
//             consensus EPS estimate, and the last 4 quarters' results vs estimates.
//   Dividends: Yahoo's payment history (stocks and ETFs), plus any dividend already
//              declared on Nasdaq's calendar (public/data/dividends.json, rebuilt at 4 PM).
const NASDAQ = "https://api.nasdaq.com/api";
const HEAD = { "User-Agent": "Mozilla/5.0 (Foresight personal app)", Accept: "application/json" };
const DAY = 86_400_000;
const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const us = (s: unknown) => { const m = String(s ?? "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : null; };

/** A number, or null for blanks and "N/A" (Number("") would quietly be 0). */
const n = (v: unknown) => (v == null || String(v).trim() === "" || !Number.isFinite(+String(v).replace(/[$,]/g, "")) ? null : +String(v).replace(/[$,]/g, ""));

async function getJson(url: string, revalidate: number) {
  try {
    const r = await fetch(url, { headers: HEAD, next: { revalidate }, signal: AbortSignal.timeout(15_000) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

export type Earnings = {
  next: { date: string; time: "before open" | "after close" | null; confirmed: boolean; quarter: string | null; epsEstimate: number | null } | null;
  history: { quarter: string; reported: string | null; eps: number | null; estimate: number | null; surprisePct: number | null }[];
};

export async function earnings(symbol: string): Promise<Earnings | null> {
  if (/[=^]|-USD$/.test(symbol)) return null; // indices, FX, futures, crypto
  const s = encodeURIComponent(symbol);
  const [date, surprise, forecast] = await Promise.all([
    getJson(`${NASDAQ}/analyst/${s}/earnings-date`, 21600),
    getJson(`${NASDAQ}/company/${s}/earnings-surprise`, 21600),
    getJson(`${NASDAQ}/analyst/${s}/earnings-forecast`, 21600),
  ]);
  const text: string = date?.data?.reportText ?? "";
  const nextDate = us(text);
  const history = (surprise?.data?.earningsSurpriseTable?.rows ?? []).slice(0, 4).map((r: any) => ({
    quarter: String(r.fiscalQtrEnd ?? ""),
    reported: us(r.dateReported),
    eps: n(r.eps),
    estimate: n(r.consensusForecast),
    surprisePct: n(r.percentageSurprise),
  }));
  if (!nextDate && !history.length) return null; // ETFs and funds don't report earnings
  const f = forecast?.data?.quarterlyForecast?.rows?.[0];
  return {
    next: nextDate && nextDate >= ymd(Date.now() - DAY) ? {
      date: nextDate,
      time: /after market close/i.test(text) ? "after close" : /before market open|pre-market/i.test(text) ? "before open" : null,
      confirmed: !/estimated|algorithm/i.test(text),
      quarter: text.match(/fiscal Quarter ending (\w+ \d{4})/i)?.[1] ?? f?.fiscalEnd ?? null,
      epsEstimate: n(f?.consensusEPSForecast),
    } : null,
    history,
  };
}

export type Dividends = {
  history: { date: string; amount: number }[];
  frequency: "monthly" | "quarterly" | "twice a year" | "yearly" | null;
  ttm: number; // paid per share over the last 12 months
  yieldPct: number | null;
  next: { ex: string; pay: string | null; amount: number | null; estimated: boolean } | null;
};

export async function dividends(symbol: string, declared?: Record<string, { ex: string; pay: string | null; amount: number | null }>): Promise<Dividends | null> {
  if (/[=^]|-USD$/.test(symbol)) return null;
  const d = await getJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2y&interval=1mo&events=div`, 43200);
  const res = d?.chart?.result?.[0];
  const ev = Object.values((res?.events?.dividends ?? {}) as Record<string, { date: number; amount: number }>).sort((a, b) => a.date - b.date);
  const dec = declared?.[symbol];
  if (!ev.length && !dec) return null;
  const now = Date.now();
  const history = ev.map((x) => ({ date: ymd(x.date * 1000), amount: x.amount }));
  const ttm = ev.filter((x) => x.date * 1000 > now - 365 * DAY).reduce((a, x) => a + x.amount, 0);
  // Typical gap between payments → frequency, and an estimate of the next ex-date.
  const gaps = ev.slice(1).map((x, i) => (x.date - ev[i].date) / 86400).sort((a, b) => a - b);
  const gap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : null;
  const frequency = gap == null ? null : gap < 45 ? "monthly" : gap < 135 ? "quarterly" : gap < 270 ? "twice a year" : "yearly";
  let next: Dividends["next"] = null;
  if (dec && dec.ex >= ymd(now - DAY)) next = { ...dec, estimated: false };
  else if (gap && ev.length) {
    let t = ev.at(-1)!.date * 1000;
    while (t < now - DAY) t += gap * DAY;
    // Only estimate if the payer looks active (paid within ~1.5 gaps).
    if (now - ev.at(-1)!.date * 1000 < gap * 1.5 * DAY) next = { ex: ymd(t), pay: null, amount: ev.at(-1)!.amount, estimated: true };
  }
  const price = res?.meta?.regularMarketPrice;
  return { history: history.slice(-8).reverse(), frequency, ttm, yieldPct: price && ttm ? (ttm / price) * 100 : null, next };
}
