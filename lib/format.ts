export const fmtPrice = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString(undefined, { minimumFractionDigits: Math.abs(n) < 1 && n !== 0 ? 4 : 2, maximumFractionDigits: Math.abs(n) < 1 ? 6 : 2 });
export const fmtPct = (n: number | null | undefined, d = 2) => (n == null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(d)}%`);
export const fmtBig = (n: number | null | undefined) => {
  if (n == null) return "—";
  const a = Math.abs(n);
  if (a >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (a >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
};
export const tone = (n: number | null | undefined) => (n == null || n === 0 ? "" : n > 0 ? "up" : "down");

/** A US ticker as the SEC lists it (BRK.B, BF-B): anything else is not looked up. */
export const TICKER = /^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
