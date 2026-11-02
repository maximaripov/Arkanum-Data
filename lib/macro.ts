// The market numbers Foresight shows itself, from sources that allow public display:
//   - 10-year Treasury yield: Federal Reserve (H.15), fetched through FRED's public CSV download.
//   - Bitcoin and gold: CoinGecko's public API, which requires a visible "Powered by CoinGecko" credit.
// Stock and index prices (S&P 500, Nasdaq-100) are licensed for display, so the Markets page
// shows those through TradingView quote widgets instead.
export type Point = [string, number];
export type Series = {
  id: string;
  label: string;
  unit: "pct" | "usd" | "fx" | "k"; // pct: shown with % and changes in points; k: thousands
  decimals: number;
  tone: "price" | "neutral"; // neutral: rises aren't good or bad, so don't color them
  freq: "daily" | "weekly" | "monthly" | "quarterly";
  about: string;
  date: string;
  value: number;
  prev: number | null; // previous observation
  weekAgo: number | null; // about 7 days earlier (daily data only)
  history: Point[];
};
export type Group = { id: string; title: string; blurb: string; source: { text: string; href: string }; series: Series[] };

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const yearsAgo = (n: number) => ymd(new Date(Date.now() - n * 365.25 * 86_400_000));

function finish(base: Omit<Series, "date" | "value" | "prev" | "weekAgo" | "history">, history: Point[]): Series | null {
  if (!history.length) return null;
  const [date, value] = history.at(-1)!;
  const prev = history.length > 1 ? history.at(-2)![1] : null;
  const cutoff = ymd(new Date(Date.parse(date + "T12:00:00Z") - 7 * 86_400_000));
  const wk = base.freq === "daily" ? [...history].reverse().find(([d]) => d <= cutoff) : undefined;
  return { ...base, date, value, prev, weekAgo: wk ? wk[1] : null, history };
}

// ---- FRED (US government series) ------------------------------------------------------
async function fred(id: string, start: string): Promise<Point[]> {
  try {
    // FRED turns away requests without a recognizable client name, so say who we are.
    const r = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${start}`, { headers: { "User-Agent": "Foresight/1.0 (+https://foresightscreener.vercel.app)" }, next: { revalidate: 3600 }, signal: AbortSignal.timeout(15_000) });
    if (!r.ok) return [];
    const out: Point[] = [];
    for (const line of (await r.text()).trim().split("\n").slice(1)) {
      const [d, v] = line.split(",");
      const n = parseFloat(v);
      if (d && Number.isFinite(n)) out.push([d, n]);
    }
    return out;
  } catch { return []; }
}

type Def = Omit<Series, "date" | "value" | "prev" | "weekAgo" | "history"> & { fred: string };
const TEN_YEAR: Def = { id: "t10y", fred: "DGS10", label: "10-year Treasury", unit: "pct", decimals: 2, tone: "neutral", freq: "daily", about: "The benchmark long-term interest rate. Mortgage rates follow it, and when it climbs, stock prices often fall." };

async function fredSeries({ fred: id, ...base }: Def): Promise<Series | null> {
  return finish(base, await fred(id, yearsAgo(1)));
}

// ---- Crypto (CoinGecko) ------------------------------------------------------------------
const COINS = [
  ["bitcoin", "Bitcoin", "The largest cryptocurrency."],
  // No free source may republish the official gold price (LBMA), so we use PAX Gold, a token
  // backed one-for-one by an ounce of London gold; it trades within about 1% of spot.
  ["pax-gold", "Gold", "Price of one ounce of gold, tracked by the PAX Gold token (each token is backed by an ounce of gold held in London vaults)."],
] as const;
const cg = (path: string, revalidate: number) => fetch(`https://api.coingecko.com/api/v3${path}`, {
  headers: process.env.COINGECKO_API_KEY ? { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY } : {},
  next: { revalidate }, signal: AbortSignal.timeout(15_000),
}).then((r) => (r.ok ? r.json() : null)).catch(() => null);

export async function crypto(): Promise<Series[]> {
  const live = (await cg(`/simple/price?ids=${COINS.map((c) => c[0]).join(",")}&vs_currencies=usd&include_last_updated_at=true`, 300)) ?? {};
  const out = await Promise.all(COINS.map(async ([id, label, about]) => {
    const h = await cg(`/coins/${id}/market_chart?vs_currency=usd&days=365`, 21_600);
    const byDay = new Map<string, number>();
    for (const [ms, v] of (h?.prices ?? []) as [number, number][]) byDay.set(ymd(new Date(ms)), v);
    const now = live[id]?.usd;
    if (Number.isFinite(now)) byDay.set(ymd(new Date((live[id].last_updated_at ?? Date.now() / 1000) * 1000)), now);
    const hist = [...byDay].sort((a, b) => a[0].localeCompare(b[0])) as Point[];
    const s = finish({ id, label, unit: "usd", decimals: now >= 100 ? 0 : now >= 1 ? 2 : 4, tone: "price", freq: "daily", about }, hist);
    // Compare with this time yesterday rather than the previous calendar-day close.
    if (s && hist.length > 2) s.prev = hist.at(-2)![1];
    return s;
  }));
  return out.filter((s): s is Series => !!s);
}

export async function markets(): Promise<Group[]> {
  const [tenYear, coins] = await Promise.all([fredSeries(TEN_YEAR), crypto()]);
  const series = [...coins, tenYear].filter((x): x is Series => !!x);
  return series.length ? [{ id: "markets", title: "Markets", blurb: "", source: { text: "Federal Reserve via FRED; crypto powered by CoinGecko", href: "https://www.coingecko.com/" }, series }] : [];
}
