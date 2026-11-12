// Columns for the CSV exports, one list per kind of row. Raw filing data only.
import type { InsiderTrade } from "./sec";

const CODE: Record<string, string> = { P: "Purchase", S: "Sale", A: "Award", M: "Option exercise", X: "Option exercise", F: "Tax withholding", G: "Gift" };
export const INSIDER_COLS: [string, string][] = [["filed", "Filed"], ["date", "Traded"], ["symbol", "Ticker"], ["issuer", "Company"], ["owner", "Insider"], ["role", "Role"], ["type", "Transaction"], ["shares", "Shares"], ["price", "Price"], ["value", "Value ($)"], ["ownedAfter", "Owned after"], ["planned", "Pre-planned (10b5-1)"], ["url", "SEC filing"]];
export const insiderRows = (trades: InsiderTrade[]) => trades.map((t) => ({ ...t, type: CODE[t.code] ?? t.code, planned: t.planned ? "yes" : "no" }));

export const HOUSE_COLS: [string, string][] = [["f", "Disclosed"], ["d", "Traded"], ["m", "Member"], ["t", "Ticker"], ["a", "Asset"], ["type", "Transaction"], ["owner", "Owner"], ["ac", "Account"], ["lo", "Amount from ($)"], ["hi", "Amount to ($)"], ["u", "House filing"]];
const OWNER: Record<string, string> = { SP: "Spouse", JT: "Joint", DC: "Dependent child", Self: "Self" };
export const houseRows = (trades: { y: string; o: string; x?: boolean }[]) => trades.map((t) => ({ ...t, type: t.y === "P" ? "Purchase" : t.x ? "Partial sale" : "Sale", owner: OWNER[t.o] ?? t.o }));

export const FUND_COLS: [string, string][] = [["t", "Ticker"], ["name", "Company"], ["cls", "Class"], ["shares", "Shares"], ["value", "Value ($)"], ["pct", "% of fund"], ["change", "Change vs prior quarter"], ["chgPct", "Change in shares (%)"]];
