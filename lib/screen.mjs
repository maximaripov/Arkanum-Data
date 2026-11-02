// Screener filtering, shared by the Screener page and the daily digest (saved screens),
// so a saved screen matches the same stocks in both places.
//
// A filter: { text, exch, sector, industry, ranges: { key: [min, max] } } where min/max
// are numbers or "" (no limit). Units as shown on the page: revenue, income and free
// cash flow in $M, insider buys in $K, everything else as stored (%, ratios).

export const SCALE = { rev: 1e6, ni: 1e6, fcf: 1e6, ins: 1e3 };

/** @param {Record<string, any>} r screener row  @param {any} f filter */
export function matchesFilter(r, f) {
  if (!f) return true;
  if (f.exch && f.exch !== "All" && r.x !== f.exch) return false;
  if (f.sector && f.sector !== "All" && r.sector !== f.sector) return false;
  if (f.industry && f.industry !== "All" && r.ind !== f.industry) return false;
  const q = String(f.text ?? "").trim().toLowerCase();
  if (q && !String(r.t).toLowerCase().startsWith(q) && !String(r.n).toLowerCase().includes(q)) return false;
  for (const [k, [lo, hi]] of Object.entries(f.ranges ?? {})) {
    if (lo === "" && hi === "") continue;
    let v = r[k];
    if (v == null) return false;
    v = v / (SCALE[k] ?? 1);
    if (lo !== "" && v < lo) return false;
    if (hi !== "" && v > hi) return false;
  }
  return true;
}

/** Officer & director open-market buys over the last 30 days, by symbol (dollars). */
export function execBuysBySymbol(trades) {
  const isExec = (role) => String(role).split(",").map((s) => s.trim()).some((p) => p && p !== "10% owner" && p !== "Other");
  const m = new Map();
  for (const t of trades ?? []) if (t.code === "P" && t.value && isExec(t.role)) m.set(t.symbol, (m.get(t.symbol) ?? 0) + t.value);
  return m;
}
