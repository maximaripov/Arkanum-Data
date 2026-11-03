// Merges the 30-day insider file (rebuilt nightly) with today's file (refreshed hourly)
// and scores every buy. Plain JS so the site and the digest script share it.
import { withConviction } from "./conviction.mjs";

export function mergeInsiders(main, today) {
  const days = main?.days ?? [];
  const covered = new Set(days);
  const seen = new Set((main?.trades ?? []).map((t) => t.accession + t.code));
  const extra = (today?.trades ?? []).filter((t) => !covered.has(t.filed) && !seen.has(t.accession + t.code));
  const trades = withConviction([...extra, ...(main?.trades ?? [])]);
  const updated = [main?.updated, today?.updated].filter(Boolean).sort().at(-1) ?? null;
  return { trades, days: [...new Set([...days, ...extra.map((t) => t.filed)])].sort(), updated };
}
