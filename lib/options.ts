// Option chains from Nasdaq (15-minute delayed, consolidated across US options exchanges).
// We load near-the-money strikes for the next ~75 days and compute two simple readings:
//   implied move: at-the-money call + put price ÷ stock price — the expected size of the
//                 move by that expiry (about 0.8 standard deviations, so the stock ends
//                 inside ±that range a bit more than half the time).
//   put/call ratio: put volume ÷ call volume on those strikes (>1 = more puts traded).
import { nasdaq, num } from "./nasdaq";

type Side = { last: number | null; bid: number | null; ask: number | null; volume: number | null; oi: number | null };
export type OptionRow = { strike: number; call: Side; put: Side };
export type Expiry = { date: string; rows: OptionRow[]; impliedMovePct: number | null; impliedMove: number | null; atm: number | null };
export type Chain = { price: number; asOf: string; expiries: Expiry[]; putCallVolume: number | null; putCallOI: number | null };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const side = (r: any, p: "c" | "p"): Side => ({ last: num(r[`${p}_Last`]), bid: num(r[`${p}_Bid`]), ask: num(r[`${p}_Ask`]), volume: num(r[`${p}_Volume`]), oi: num(r[`${p}_Openinterest`]) });
const mid = (s: Side) => (s.bid != null && s.ask != null && s.ask > 0 ? (s.bid + s.ask) / 2 : s.last);

export async function optionChain(symbol: string): Promise<Chain | null> {
  if (/[=^]|-USD$/.test(symbol)) return null;
  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + 75 * 86_400_000).toISOString().slice(0, 10);
  let d: any = null;
  for (const assetclass of ["stocks", "etf"]) {
    d = await nasdaq(`/quote/${encodeURIComponent(symbol)}/option-chain?assetclass=${assetclass}&fromdate=${from}&todate=${to}&money=at&type=all&limit=1500`, 900);
    if (d?.table?.rows?.length) break;
  }
  const rows: any[] = d?.table?.rows ?? [];
  const price = num(String(d?.lastTrade ?? "").match(/\$([\d.,]+)/)?.[1]);
  if (!rows.length || !price) return null;

  // Rows come grouped under header rows like "November 6, 2026".
  const byDate = new Map<string, OptionRow[]>();
  let current: string | null = null;
  for (const r of rows) {
    const g = String(r.expirygroup ?? "").match(/^(\w+) (\d+), (\d{4})$/);
    if (g) { current = `${g[3]}-${String(MONTHS.indexOf(g[1]) + 1).padStart(2, "0")}-${g[2].padStart(2, "0")}`; continue; }
    const strike = num(r.strike);
    if (!current || strike == null) continue;
    if (!byDate.has(current)) byDate.set(current, []);
    byDate.get(current)!.push({ strike, call: side(r, "c"), put: side(r, "p") });
  }
  let cv = 0, pv = 0, coi = 0, poi = 0;
  const expiries: Expiry[] = [...byDate].map(([date, list]) => {
    list.sort((a, b) => a.strike - b.strike);
    for (const r of list) { cv += r.call.volume ?? 0; pv += r.put.volume ?? 0; coi += r.call.oi ?? 0; poi += r.put.oi ?? 0; }
    const atm = list.reduce((best, r) => (Math.abs(r.strike - price) < Math.abs(best.strike - price) ? r : best), list[0]);
    const c = mid(atm.call), p = mid(atm.put);
    const move = c != null && p != null ? c + p : null;
    return { date, rows: list, atm: atm.strike, impliedMove: move, impliedMovePct: move != null ? (move / price) * 100 : null };
  }).filter((e) => e.rows.length >= 3);
  const asOf = String(d.lastTrade ?? "").match(/AS OF (.+)\)/)?.[1] ?? "";
  return { price, asOf, expiries, putCallVolume: cv ? pv / cv : null, putCallOI: coi ? poi / coi : null };
}
