// Market and economy data for the Markets page, from sources that allow public display:
//   - Interest rates, energy prices and economic reports: US government data (Federal
//     Reserve, Treasury, EIA, BLS, BEA), fetched through FRED's public CSV download.
//   - Exchange rates: European Central Bank reference rates (free to reuse with the source named).
//   - Crypto: CoinGecko's public API, which requires a visible "Powered by CoinGecko" credit.
// Stock and index prices are deliberately absent: exchanges license those for display.

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

type Def = Omit<Series, "date" | "value" | "prev" | "weekAgo" | "history"> & { fred: string; years?: number; derive?: (p: Point[]) => Point[] };
const yoy = (p: Point[]) => p.flatMap(([d, v], i) => (i >= 12 ? [[d, +((v / p[i - 12][1] - 1) * 100).toFixed(2)] as Point] : []));
const diff = (p: Point[]) => p.flatMap(([d, v], i) => (i >= 1 ? [[d, Math.round(v - p[i - 1][1])] as Point] : []));

const RATES: Def[] = [
  { id: "fedfunds", fred: "DFF", label: "Fed funds rate", unit: "pct", decimals: 2, tone: "neutral", freq: "daily", about: "The overnight rate the Federal Reserve sets. Most other interest rates start from it." },
  { id: "t3m", fred: "DGS3MO", label: "3-month Treasury", unit: "pct", decimals: 2, tone: "neutral", freq: "daily", about: "Yield on 3-month US government debt. Follows where traders expect the Fed's rate to be soon." },
  { id: "t2y", fred: "DGS2", label: "2-year Treasury", unit: "pct", decimals: 2, tone: "neutral", freq: "daily", about: "Moves with expectations for Fed rate changes over the next two years." },
  { id: "t10y", fred: "DGS10", label: "10-year Treasury", unit: "pct", decimals: 2, tone: "neutral", freq: "daily", about: "The benchmark long-term rate. Mortgage rates follow it, and when it climbs, stock prices often fall." },
  { id: "t30y", fred: "DGS30", label: "30-year Treasury", unit: "pct", decimals: 2, tone: "neutral", freq: "daily", about: "Yield on 30-year US government debt." },
];
const ENERGY: Def[] = [
  { id: "wti", fred: "DCOILWTICO", label: "US crude oil (WTI)", unit: "usd", decimals: 2, tone: "price", freq: "daily", about: "The US benchmark oil price, per barrel. Feeds into gasoline, shipping and inflation." },
  { id: "brent", fred: "DCOILBRENTEU", label: "Brent crude oil", unit: "usd", decimals: 2, tone: "price", freq: "daily", about: "The international benchmark oil price, per barrel." },
  { id: "natgas", fred: "DHHNGSP", label: "Natural gas", unit: "usd", decimals: 2, tone: "price", freq: "daily", about: "Henry Hub price per million BTU. Drives heating and electricity costs." },
  { id: "gasoline", fred: "GASREGW", label: "Gasoline at the pump", unit: "usd", decimals: 2, tone: "price", freq: "weekly", about: "Average US price of a gallon of regular gasoline, surveyed every Monday." },
];
const ECONOMY: Def[] = [
  { id: "cpi", fred: "CPIAUCSL", years: 11, derive: yoy, label: "Inflation", unit: "pct", decimals: 1, tone: "neutral", freq: "monthly", about: "How much consumer prices rose over the past 12 months (CPI). The Fed aims for about 2%." },
  { id: "unemployment", fred: "UNRATE", years: 10, label: "Unemployment", unit: "pct", decimals: 1, tone: "neutral", freq: "monthly", about: "Share of people looking for work who can't find a job." },
  { id: "jobs", fred: "PAYEMS", years: 10, derive: diff, label: "Jobs added", unit: "k", decimals: 0, tone: "neutral", freq: "monthly", about: "How many jobs US employers added (or cut) in the month, in thousands." },
  { id: "gdp", fred: "A191RL1Q225SBEA", years: 10, label: "Economic growth", unit: "pct", decimals: 1, tone: "neutral", freq: "quarterly", about: "How fast the US economy grew last quarter, at an annual rate, after inflation (real GDP)." },
];

async function fredGroup(defs: Def[]): Promise<Series[]> {
  const out = await Promise.all(defs.map(async ({ fred: id, years = 1, derive, ...base }) => {
    const raw = await fred(id, yearsAgo(years + (derive === yoy ? 1 : 0)));
    return finish(base, derive ? derive(raw) : raw);
  }));
  return out.filter((s): s is Series => !!s);
}

// ---- European Central Bank exchange rates -----------------------------------------------
async function currencies(): Promise<Series[]> {
  try {
    const r = await fetch(`https://data-api.ecb.europa.eu/service/data/EXR/D.USD+JPY+GBP+CNY.EUR.SP00.A?startPeriod=${yearsAgo(1)}&format=csvdata`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(15_000) });
    if (!r.ok) return [];
    const [head, ...lines] = (await r.text()).trim().split("\n");
    const cols = head.split(",");
    const [ci, di, vi] = ["CURRENCY", "TIME_PERIOD", "OBS_VALUE"].map((c) => cols.indexOf(c));
    const perEur = new Map<string, Map<string, number>>(); // currency → date → units per euro
    for (const l of lines) {
      const c = l.split(","), v = parseFloat(c[vi]);
      if (!Number.isFinite(v)) continue;
      if (!perEur.has(c[ci])) perEur.set(c[ci], new Map());
      perEur.get(c[ci])!.set(c[di], v);
    }
    const usd = perEur.get("USD") ?? new Map();
    const cross = (cur: string, invert: boolean): Point[] => [...usd].flatMap(([d, u]) => {
      if (cur === "EUR") return [[d, u] as Point];
      const x = perEur.get(cur)?.get(d);
      return x ? [[d, invert ? u / x : x / u] as Point] : [];
    }).sort((a, b) => a[0].localeCompare(b[0]));
    const fx = (id: string, label: string, cur: string, invert: boolean, decimals: number, about: string) =>
      finish({ id, label, unit: "fx", decimals, tone: "neutral", freq: "daily", about }, cross(cur, invert));
    return [
      fx("eurusd", "Euro (EUR/USD)", "EUR", false, 4, "Dollars per euro. Up means the euro got stronger against the dollar."),
      fx("gbpusd", "Pound (GBP/USD)", "GBP", true, 4, "Dollars per British pound. Up means the pound got stronger."),
      fx("usdjpy", "Yen (USD/JPY)", "JPY", false, 2, "Yen per dollar. Up means the dollar got stronger against the yen."),
      fx("usdcny", "Yuan (USD/CNY)", "CNY", false, 4, "Chinese yuan per dollar. Up means the dollar got stronger."),
    ].filter((s): s is Series => !!s);
  } catch { return []; }
}

// ---- Crypto (CoinGecko) ------------------------------------------------------------------
const COINS = [
  ["bitcoin", "Bitcoin", "The largest cryptocurrency."],
  ["ethereum", "Ethereum", "The second-largest cryptocurrency; many crypto apps run on it."],
  ["solana", "Solana", "A fast blockchain popular for trading apps."],
  ["ripple", "XRP", "A cryptocurrency built for moving money between banks."],
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
  const [rates, energy, fx, economy, coins] = await Promise.all([fredGroup(RATES), fredGroup(ENERGY), currencies(), fredGroup(ECONOMY), crypto()]);
  const FRED = { text: "Federal Reserve Bank of St. Louis (FRED)", href: "https://fred.stlouisfed.org/" };
  return [
    { id: "rates", title: "Interest rates", blurb: "What it costs to borrow. When these climb, stocks, especially fast-growing companies, often struggle.", source: { text: "Federal Reserve and US Treasury, via FRED", href: FRED.href }, series: rates },
    { id: "energy", title: "Energy", blurb: "Oil and gas prices feed into inflation, into what you pay to drive and heat, and into energy companies' profits.", source: { text: "US Energy Information Administration, via FRED", href: FRED.href }, series: energy },
    { id: "fx", title: "Currencies", blurb: "What a dollar is worth abroad. A stronger dollar makes imports cheaper and hurts US companies that sell overseas.", source: { text: "European Central Bank reference rates", href: "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html" }, series: fx },
    { id: "crypto", title: "Crypto", blurb: "Trades around the clock and swings far more than stocks. Prices refresh every few minutes.", source: { text: "Powered by CoinGecko", href: "https://www.coingecko.com/" }, series: coins },
    { id: "economy", title: "Economy", blurb: "The big government reports the Fed watches when it decides on interest rates.", source: { text: "Bureau of Labor Statistics and Bureau of Economic Analysis, via FRED", href: FRED.href }, series: economy },
  ].filter((g) => g.series.length);
}
