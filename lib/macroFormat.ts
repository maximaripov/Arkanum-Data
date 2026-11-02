// Formatting and plain-English summaries for market series (shared by the page and the digest).
import type { Group, Series } from "./macro";

export function fmtValue(s: Pick<Series, "unit" | "decimals">, v: number) {
  if (s.unit === "pct") return `${v.toFixed(s.decimals)}%`;
  if (s.unit === "usd") return "$" + v.toLocaleString("en-US", { minimumFractionDigits: s.decimals, maximumFractionDigits: s.decimals });
  if (s.unit === "k") return `${v > 0 ? "+" : ""}${Math.round(v).toLocaleString("en-US")}K`;
  return v.toFixed(s.decimals);
}

/** Change from `from` to `to`: points for rates and other percentages, otherwise percent. */
export function fmtChange(s: Pick<Series, "unit" | "decimals">, from: number | null, to: number) {
  if (from == null || !Number.isFinite(from)) return null;
  if (s.unit === "pct") { const d = to - from; return { text: `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(2)} pts`, dir: Math.sign(+d.toFixed(2)) }; }
  if (s.unit === "k") { const d = to - from; return { text: `${d >= 0 ? "+" : "−"}${Math.abs(Math.round(d)).toLocaleString("en-US")}K vs prior`, dir: Math.sign(d) }; }
  if (!from) return null;
  const p = (to / from - 1) * 100;
  return { text: `${p >= 0 ? "+" : "−"}${Math.abs(p).toFixed(Math.abs(p) < 10 ? 2 : 1)}%`, dir: Math.sign(+p.toFixed(2)) };
}

export const asOf = (s: Series) => {
  const d = new Date(s.date + "T12:00:00Z");
  if (s.freq === "monthly") return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  if (s.freq === "quarterly") return `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
};
export const sinceLabel = (s: Series) => ({ daily: "vs day before", weekly: "vs week before", monthly: "vs month before", quarterly: "vs quarter before" })[s.freq];

/** Short sentences about the past week's notable moves, e.g. "The 10-year Treasury yield fell to 4.94% (−0.11 pts)." */
export function weekSummary(groups: Group[]): string[] {
  const all = new Map(groups.flatMap((g) => g.series.map((s) => [s.id, s] as const)));
  const out: string[] = [];
  const say = (id: string, name: string, small: number) => {
    const s = all.get(id);
    if (!s || s.weekAgo == null) return;
    const c = fmtChange(s, s.weekAgo, s.value)!;
    const moved = s.unit === "pct" ? Math.abs(s.value - s.weekAgo) >= small : Math.abs(s.value / s.weekAgo - 1) * 100 >= small;
    const verb = !moved ? "was little changed at" : c.dir > 0 ? "rose to" : "fell to";
    out.push(`${name} ${verb} ${fmtValue(s, s.value)}${moved ? ` (${c.text})` : ""} this week.`);
  };
  say("t10y", "The 10-year Treasury yield", 0.05);
  say("wti", "Oil", 1);
  say("eurusd", "The euro", 0.5);
  say("bitcoin", "Bitcoin", 2);
  return out;
}
