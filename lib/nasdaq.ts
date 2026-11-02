// Nasdaq's public JSON API (used by nasdaq.com). Unofficial; delayed data.
const HEAD = { "User-Agent": "Mozilla/5.0 (Foresight personal app)", Accept: "application/json" };
export async function nasdaq(path: string, revalidate: number) {
  try {
    const r = await fetch(`https://api.nasdaq.com/api${path}`, { headers: HEAD, next: { revalidate }, signal: AbortSignal.timeout(15_000) });
    return r.ok ? (await r.json())?.data ?? null : null;
  } catch { return null; }
}
/** "1,234" / "--" / "" → number or null */
export const num = (v: unknown) => {
  const s = String(v ?? "").replace(/[$,%]/g, "").trim();
  return s === "" || s === "--" || s === "N/A" || !Number.isFinite(+s) ? null : +s;
};
