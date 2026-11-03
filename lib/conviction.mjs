// How much an insider purchase is likely to mean, from what the filing itself says.
// Dollar size alone misleads (a controlling family's $100M buy says less than a CEO
// doubling her stake), so the score weighs who bought, how much of their own position
// it is, how unusual it is for them, and whether others are buying too.
// Plain JS so the site, the daily digest and the alert scripts all score the same way.

const TOP = [
  [/chief executive|\bceo\b/i, "CEO"],
  [/chief financial|\bcfo\b/i, "CFO"],
  [/\bpresident\b/i, "President"],
  [/\bchair/i, "Chair"],
];

/** "top" (CEO, CFO, President, Chair), "officer", "director" or "owner" (10% holder only). */
export function roleKind(role) {
  const parts = String(role ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const officer = parts.filter((p) => !["Director", "10% owner", "Other"].includes(p));
  if (officer.some((p) => TOP.some(([re]) => re.test(p)))) return "top";
  if (officer.length) return "officer";
  if (parts.includes("Director")) return "director";
  return "owner";
}
const topLabel = (role) => TOP.find(([re]) => re.test(role))?.[1] ?? "Executive";

/** Percent increase in the insider's holding from this buy; Infinity for a first stake; null if unknown. */
export function stakeIncrease(t) {
  if (t.ownedAfter == null || !t.shares) return null;
  const before = t.ownedAfter - t.shares;
  if (before < 0) return null; // holding reported for a different account than the purchase
  if (before === 0) return Infinity;
  return (t.shares / before) * 100;
}

const yearsBetween = (a, b) => (Date.parse(b) - Date.parse(a)) / (365.25 * 86_400_000);

/**
 * @param t trade (code "P" only; anything else returns null)
 * @param ctx.insiders distinct executives/directors who bought this stock in the window
 * @returns {{ score: number, tier: "strong"|"notable"|"routine", reasons: {text: string, neg?: boolean}[] } | null}
 */
export function conviction(t, ctx = {}) {
  if (!t || t.code !== "P") return null;
  const reasons = [];
  let s = 0;
  const kind = roleKind(t.role);
  s += { top: 30, officer: 20, director: 14, owner: 4 }[kind];
  if (kind === "top") reasons.push({ text: topLabel(t.role) });
  if (kind === "owner") reasons.push({ text: "Major shareholder, not an executive", neg: true });
  else if (/10% owner/.test(t.role)) { s -= 6; reasons.push({ text: "Also a major shareholder", neg: true }); }

  const inc = stakeIncrease(t);
  if (inc === Infinity) { s += 20; reasons.push({ text: "First shares" }); }
  else if (inc != null) {
    s += inc >= 50 ? 30 : inc >= 20 ? 22 : inc >= 10 ? 15 : inc >= 3 ? 7 : 0;
    if (inc >= 10) reasons.push({ text: `Stake +${inc >= 1000 ? Math.round(inc / 100) * 100 : Math.round(inc)}%` });
  }

  // prevBuy: date of this insider's previous open-market buy of this stock; null = none found
  // in the prevBuyYears looked back; undefined = not checked.
  if (t.prevBuy === null && (t.prevBuyYears ?? 0) >= 2) { s += 18; reasons.push({ text: `First buy in ${t.prevBuyYears}+ years` }); }
  else if (t.prevBuy) {
    const y = yearsBetween(t.prevBuy, t.date || t.filed);
    if (y >= 2) { s += 15; reasons.push({ text: `First buy in ${Math.floor(y)} years` }); }
    else if (y >= 1) { s += 8; reasons.push({ text: "First buy in over a year" }); }
  }

  const n = ctx.insiders ?? 1;
  if (n >= 3) { s += 15; reasons.push({ text: `${n} insiders buying` }); }
  else if (n === 2) { s += 9; reasons.push({ text: "2 insiders buying" }); }

  const v = t.value ?? 0;
  s += v >= 1e6 ? 10 : v >= 250e3 ? 6 : v >= 50e3 ? 3 : 0;

  if (t.planned) { s -= 25; reasons.push({ text: "Pre-planned", neg: true }); }
  // A token purchase can't be a strong signal however unusual it is for the buyer.
  if (v < 10_000) s = Math.min(s, 39); else if (v < 25_000) s = Math.min(s, 59);
  s = Math.max(0, Math.min(100, Math.round(s)));
  return { score: s, tier: s >= 60 ? "strong" : s >= 40 ? "notable" : "routine", reasons };
}

export const TIER_LABEL = { strong: "Strong signal", notable: "Notable", routine: "Routine" };

/** Distinct executive/director buyers per symbol among trades (for the "insiders buying" count). */
export function buyersBySymbol(trades) {
  const m = new Map();
  for (const t of trades) {
    if (t.code !== "P" || roleKind(t.role) === "owner") continue;
    if (!m.has(t.symbol)) m.set(t.symbol, new Set());
    m.get(t.symbol).add(t.ownerCik || t.owner);
  }
  return new Map([...m].map(([k, v]) => [k, v.size]));
}

/** Adds `conv` to every buy, using the whole list to count insiders buying the same stock. */
export function withConviction(trades) {
  const n = buyersBySymbol(trades);
  return trades.map((t) => (t.code === "P" ? { ...t, conv: conviction(t, { insiders: n.get(t.symbol) ?? 1 }) } : t));
}
