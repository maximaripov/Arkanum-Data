// Shape of the daily briefing built by scripts/daily-briefing.mjs.
export type Move = { symbol: string; label: string; price: number | null; changePct: number | null; unit?: "yield" };
export type InsiderBuy = { symbol: string; issuer: string; owner: string; role: string; value: number | null; date: string };
export type Briefing = {
  generated: string;
  marketDate: string;
  closed: boolean;
  title: string;
  body: string;
  headline: string[];
  markets: { title: string; items: Move[] }[];
  sectors: Move[];
  breadth: { up: number; down: number; flat: number } | null;
  movers: { gainers: Move[]; losers: Move[] };
  watchlist: Move[];
  levels: { symbol: string; price: number; note: string; last: number; distPct: number; crossed: boolean }[];
  insiders: { watchlist: InsiderBuy[]; top: InsiderBuy[]; filed: string | null };
  catalysts: { date: string; time: string | null; kind: "econ" | "fed" | "earnings" | "dividend"; title: string }[];
  screens?: { name: string; count: number; added: string[]; dropped: number; first: boolean }[];
  notes: string[];
};
