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

/** Short sentences about the past week's moves, e.g. "The 10-year Treasury yield fell to 4.94% (−0.11 pts)." */
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
  say("bitcoin", "Bitcoin", 2);
  say("pax-gold", "Gold", 1);
  return out;
}
