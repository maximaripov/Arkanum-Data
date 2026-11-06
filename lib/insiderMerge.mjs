// Merges the 30-day insider file (rebuilt nightly) with today's file (refreshed hourly)
// and scores every buy. Plain JS so the site and the digest script share it.
import { withConviction } from "./conviction.mjs";
import { priceAndValue } from "./form4.mjs";

// Trades saved before the price-box check (lib/form4.mjs) existed get the same correction.
// A corrected sale under $250K was only kept because of the wrong amount: drop it (as the jobs would have).
const fixPrice = (t) => (t.price > 1000 && t.value > 1e9 ? { ...t, ...priceAndValue(t.shares, t.price) } : t);
const stillKept = (t) => t.code !== "S" || (t.value ?? 0) >= 250_000;

export function mergeInsiders(main, today) {
  const days = main?.days ?? [];
  const covered = new Set(days);
  const seen = new Set((main?.trades ?? []).map((t) => t.accession + t.code));
  const extra = (today?.trades ?? []).filter((t) => !covered.has(t.filed) && !seen.has(t.accession + t.code));
  const trades = withConviction([...extra, ...(main?.trades ?? [])].map(fixPrice).filter(stillKept));
  const updated = [main?.updated, today?.updated].filter(Boolean).sort().at(-1) ?? null;
  return { trades, days: [...new Set([...days, ...extra.map((t) => t.filed)])].sort(), updated };
}
