// Numbers for the insider-buys paper, read from the backtest output (docs/backtest/results.json)
// at build time, so the paper and the data can't drift apart.
import results from "../docs/backtest/results.json";
import oos from "../docs/backtest/oos-2026.json";
import sales from "../docs/backtest/sales.json";

export type Stat = { n: number; mean: number; median: number; hit: number; t: number };
export type Horizon = "1 month" | "3 months" | "6 months";
export const HORIZONS: Horizon[] = ["1 month", "3 months", "6 months"];
type Table = [string, Record<Horizon, Stat>][];
const tables = results.tables as unknown as { month: Table; iwm: Table; spy: Table };

export const SAMPLE = { scored: results.scored, kept: results.kept, mismatched: results.mismatched, from: results.from, to: results.to, generated: results.generated };
export type Bench = keyof typeof tables;
export const BENCH: Record<Bench, string> = { month: "Other insider buys filed the same month", iwm: "Small-company stocks (IWM)", spy: "S&P 500 (SPY)" };

/** Plain-English names for the backtest's group labels. */
const NAME: Record<string, string> = {
  "All officer/director buys": "All officer and director buys",
  "Strong (60+)": "Score 60+", "Notable (40–59)": "Score 40–59", "Routine (<40)": "Score under 40",
  "Score <20": "Score under 20",
  "Top executive (CEO/CFO/President/Chair)": "CEO, CFO, President or Chair",
  "Director only": "Directors only", "Other officer": "Other officers",
  "Stake +50% or more": "Stake up 50% or more", "Stake under +10%": "Stake up under 10%",
  "Alone": "Only insider buying", "Value $1M+": "$1M or more", "Value $100K–1M": "$100K to $1M", "Value under $100K": "Under $100K",
  "Pre-planned": "Pre-planned (Rule 10b5-1)", "Price $5+": "Share price $5+", "Price under $5": "Share price under $5",
  "Strong, price $5+": "Score 60+, price $5+", "Routine, price $5+": "Score under 40, price $5+",
};
export const nameOf = (g: string) => NAME[g] ?? g;

export function stat(bench: Bench, group: string, h: Horizon): Stat {
  const row = tables[bench].find(([g]) => g === group);
  if (!row) throw new Error(`No backtest group "${group}"`);
  return row[1][h];
}
export const groups = (bench: Bench = "month") => tables[bench].map(([g]) => g);
/** Percent, one decimal, for charts. */
export const p = (x: number) => Math.round(x * 1000) / 10;

/** The same test on purchases filed in 2026 (January to September), which the score was never examined on. */
const oosTables = oos.tables as unknown as { month: Table };
export const OOS = { kept: oos.kept, from: oos.from, to: oos.to };
export function oosStat(group: string, h: Horizon): Stat {
  const row = oosTables.month.find(([g]) => g === group);
  if (!row) throw new Error(`No 2026 group "${group}"`);
  return row[1][h];
}

// ---- Working paper no. 2: insider sales (docs/backtest/sales.json) ----------------------------
/** "below": the share of sales followed by a worse return than the benchmark. */
export type SaleStat = { n: number; mean: number; median: number; below: number; t: number };
type SaleTable = [string, Record<Horizon, SaleStat>][];
const saleTables = sales.tables as unknown as Record<Bench, SaleTable>;
export const SALES = { tested: sales.tested, kept: sales.kept, mismatched: sales.mismatched, noPrices: sales.noPrices, symbols: sales.symbols, from: sales.from, to: sales.to, generated: sales.generated };
export function saleStat(bench: Bench, group: string, h: Horizon): SaleStat {
  const row = saleTables[bench].find(([g]) => g === group);
  if (!row) throw new Error(`No sales group "${group}"`);
  return row[1][h];
}
export const saleGroups = () => saleTables.month.map(([g]) => g);
const SALE_NAME: Record<string, string> = {
  "All officer/director sales": "All officer and director sales", "Notable (site rule)": "Notable (Arkanum's rule)",
  "Pre-planned (10b5-1)": "Pre-planned (Rule 10b5-1)", "Top executive": "CEO, CFO, President or Chair", "Other officer": "Other officers",
  "Director only": "Directors only", "Top exec, not pre-planned": "Top executive, not pre-planned",
  "Value $1M+": "$1M or more", "Value $100K–1M": "$100K to $1M", "Value under $100K": "Under $100K",
  "Alone": "Only insider selling", "Price $5+": "Share price $5+", "Price under $5": "Share price under $5",
};
export const saleName = (g: string) => SALE_NAME[g] ?? g;
