// "Trades like this": for a buy or a sale, the research group it belongs to and what trades in
// that group were followed by (six months later, against the month's typical insider trade).
// Numbers come from lib/evidence.json, rebuilt from the research results before every build.
import ev from "./evidence.json";
import { roleKind } from "./conviction.mjs";
import type { InsiderTrade } from "./sec";

type Row = [median: number, share: number, n: number, months?: number, lo?: number | null, hi?: number | null];
const E = ev as unknown as { buys: Side; sales: Side };
type Side = { main: Record<string, Row>; oos: Record<string, Row>; oosFrom: string; oosTo: string };

export type Evidence = { sale: boolean; label: string; main: Row; oos: Row | null; paper: string };

/** The group a buy is judged against: the trait that matters most in the research comes first. */
function buyGroup(t: InsiderTrade): [string, string] {
  const kind = roleKind(t.role);
  const n = Number((t.conv?.reasons ?? []).map((r) => /^(\d+) insiders buying$/.exec(r.text)?.[1]).find(Boolean) ?? 0);
  if (t.price != null && t.price > 0 && t.price < 5) return ["Price under $5", "Buys of stocks under $5"];
  if (t.planned) return ["Pre-planned", "Pre-planned buys"];
  if (n >= 3) return ["3+ insiders buying", "Buys with 3+ insiders buying"];
  if ((t.value ?? 0) >= 1e6) return ["Value $1M+", "Buys of $1M or more"];
  if (kind === "top") return ["Top executive (CEO/CFO/President/Chair)", "Buys by a CEO, CFO, President or Chair"];
  if (kind === "director") return ["Director only", "Buys by directors"];
  return ["All officer/director buys", "Officer and director buys"];
}

function saleGroup(t: InsiderTrade): [string, string] {
  const kind = roleKind(t.role);
  if (t.price != null && t.price > 0 && t.price < 5) return ["Price under $5", "Sales of stocks under $5"];
  if (t.sale?.notable) return ["Notable (site rule)", "Large unplanned sales"];
  if (t.ownedAfter === 0) return ["Sold entire stake", "Sales of a whole stake"];
  if (t.planned) return ["Pre-planned (10b5-1)", "Pre-planned sales"];
  if (kind === "top") return ["Top executive", "Sales by a CEO, CFO, President or Chair"];
  return ["All officer/director sales", "Officer and director sales"];
}

/** Research context for an open-market buy (P) or sale (S); null for other transactions. */
export function evidenceFor(t: InsiderTrade): Evidence | null {
  const sale = t.code === "S";
  if (!sale && t.code !== "P") return null;
  if (roleKind(t.role) === "owner") return null; // the research covers officers and directors only
  const side = sale ? E.sales : E.buys;
  const [group, label] = sale ? saleGroup(t) : buyGroup(t);
  const main = side.main[group];
  if (!main) return null;
  return { sale, label, main, oos: side.oos[group] ?? null, paper: sale ? "/research/insider-sales" : "/research/insider-buys" };
}

/** Research context for a House member's trade: Congress trades aren't covered by the papers. */
export const CONGRESS_NOTE = "Our research covers company insiders, not Congress; the returns shown are this trade's own.";
