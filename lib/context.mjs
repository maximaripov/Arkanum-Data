// Context around an insider trade and a company, from facts the site already has: the trade's
// own filing, the company's other recent insider filings, its 8-K announcements and its
// fundamentals. Every note states a fact and, where the research covers it, what that kind of
// trade was followed by; none is a forecast. Shared by the stock page and the trade lists.

const DAY = 86_400_000;
const at = (d) => Date.parse(String(d).slice(0, 10) + "T12:00:00Z");

/** Weekdays from a to b (exclusive of a), ignoring holidays: enough to spot a late Form 4. */
export function businessDays(a, b) {
  let n = 0;
  for (let t = at(a) + DAY; t <= at(b); t += DAY) { const w = new Date(t).getUTCDay(); if (w !== 0 && w !== 6) n++; }
  return n;
}

/** Facts about the trade itself that change how to read it. tone: "warn" (the research found this
 * kind of trade did worse), "info" (worth knowing, untested). */
export function tradeNotes(t) {
  const out = [];
  const buy = t.code === "P", sale = t.code === "S";
  if (!buy && !sale) return out;
  if (t.price != null && t.price > 0 && t.price < 5) out.push({ tone: "warn", text: "Share price under $5", why: "In our research, buys and sales of stocks under $5 were followed by some of the weakest returns." });
  if (t.planned) out.push({ tone: buy ? "warn" : "info", text: "Pre-planned (10b5-1)", why: buy ? "Scheduled in advance, so it says less about the insider's current view; pre-planned buys did badly in our research." : "Scheduled in advance under a trading plan, so it says less about the insider's current view." });
  if (t.filed && t.date && businessDays(t.date, t.filed) > 2) out.push({ tone: "info", text: `Filed late (${businessDays(t.date, t.filed)} business days)`, why: "Form 4 is due within two business days of the trade." });
  if (buy && t.value != null && t.value < 10_000) out.push({ tone: "info", text: "Small purchase (under $10K)", why: "Token amounts say little about conviction." });
  return out;
}

/** Other insiders trading the same company the same way within `days` of this trade, from the
 * trades on hand (a stock page has the company's latest filings). */
export function othersAround(t, trades, days = 30) {
  const same = (trades ?? []).filter((x) => x.code === t.code && x.symbol === t.symbol && Math.abs(at(x.date) - at(t.date)) <= days * DAY);
  const people = new Set(same.map((x) => x.ownerCik || x.owner));
  people.delete(t.ownerCik || t.owner);
  return people.size;
}

/** The company's 8-K announcements within `days` before or after the trade, with the gap in
 * days (negative: before the trade). */
export function eventsAround(t, news, days = 30) {
  return (news ?? [])
    .map((a) => ({ ...a, gap: Math.round((at(a.date) - at(t.date)) / DAY) }))
    .filter((a) => Math.abs(a.gap) <= days)
    .sort((a, b) => a.gap - b.gap);
}

/** Plain facts from the fundamentals, each marked good / weak / neutral. Not a score, and not
 * tested in our research. */
export function health(f) {
  if (!f) return [];
  const out = [];
  if (f.ni != null) out.push({ tone: f.ni > 0 ? "good" : "weak", text: f.ni > 0 ? `Profitable (net margin ${f.margin ?? "—"}%)` : "Losing money" });
  if (f.growth != null) out.push({ tone: f.growth > 0 ? "good" : "weak", text: `Revenue ${f.growth > 0 ? "growing" : "shrinking"} (${f.growth > 0 ? "+" : ""}${f.growth}%)` });
  if (f.fcf != null) out.push({ tone: f.fcf > 0 ? "good" : "weak", text: f.fcf > 0 ? "Generates cash" : "Burning cash" });
  if (f.de != null) out.push({ tone: f.de > 2 ? "weak" : "neutral", text: `Debt ${f.de > 2 ? "high" : "moderate or low"} (debt/equity ${f.de})` });
  return out;
}

// 8-K items that signal trouble, by the plain-English label lib/news.ts gives them.
const SERIOUS = new Set([
  "Bankruptcy or receivership", "Debt obligation accelerated", "Listing rule notice or delisting",
  "Past financial statements can't be relied on", "Changed auditor", "Cybersecurity incident", "Restructuring or layoffs",
]);

/** Company-level risk flags from facts on hand: serious 8-K events, repeated executive changes,
 * weak finances, a small or very cheap stock, heavy insider selling, out-of-date financials.
 * `ctx`: price (latest insider-trade price), shares (outstanding), trades (the company's recent
 * insider filings), basis (the fundamentals' period, "Last 4 quarters to Sep 2026").
 * tone "warn" counts as a red flag; "info" is worth knowing. Each says where it comes from. */
export function companyRisks(f, news, today = new Date().toISOString().slice(0, 10), ctx = {}) {
  const out = [];
  const recent = (news ?? []).filter((a) => at(today) - at(a.date) <= 365 * DAY);
  for (const a of recent) for (const item of a.items) if (SERIOUS.has(item)) out.push({ tone: "warn", kind: "Events", text: `${item} (8-K, ${a.date})`, link: a.link });
  const exec = (news ?? []).filter((a) => at(today) - at(a.date) <= 183 * DAY && a.items.includes("Executive or board change")).length;
  if (exec >= 2) out.push({ tone: "warn", kind: "Leadership", text: `${exec} executive or board changes in six months`, why: "Several 8-K filings on leadership changes in a short time." });
  if (f) {
    if (f.ni != null && f.ni < 0 && f.fcf != null && f.fcf < 0) out.push({ tone: "warn", kind: "Finances", text: "Losing money and burning cash", why: "Net income and free cash flow both negative in the latest SEC figures." });
    else if (f.ni != null && f.ni < 0) out.push({ tone: "info", kind: "Finances", text: "Losing money", why: "Net income negative in the latest SEC figures." });
    if (f.de != null && f.de > 2) out.push({ tone: "info", kind: "Finances", text: `High debt (debt/equity ${f.de})` });
    if (f.growth != null && f.growth < -10) out.push({ tone: "info", kind: "Finances", text: `Revenue shrinking (${f.growth}%)` });
  }
  const m = /to (\w{3}) (\d{4})/.exec(ctx.basis ?? "");
  if (m && Date.parse(`1 ${m[1]} ${m[2]}`) < at(today) - 456 * DAY) out.push({ tone: "info", kind: "Finances", text: "Financial statements over a year old", why: "The newest figures in SEC's data are more than 15 months old." });
  if (ctx.price != null && ctx.price > 0 && ctx.price < 5) out.push({ tone: "warn", kind: "Stock", text: `Share price under $5 ($${ctx.price.toFixed(2)})`, why: "In our research, insider trades in stocks under $5 were followed by some of the weakest returns." });
  const cap = ctx.price && ctx.shares ? ctx.price * ctx.shares : null;
  if (cap != null && cap < 300e6) out.push({ tone: "warn", kind: "Stock", text: `Small company (about $${Math.round(cap / 1e6)}M market value)`, why: "Small companies' stocks swing more and trade less; from shares outstanding in SEC filings times the latest trade price." });
  const since = (ctx.trades ?? []).filter((t) => at(today) - at(t.date) <= 90 * DAY && t.value);
  const sold = since.filter((t) => t.code === "S").reduce((a, t) => a + t.value, 0), bought = since.filter((t) => t.code === "P").reduce((a, t) => a + t.value, 0);
  if (sold >= 1e6 && sold > 10 * Math.max(bought, 1)) out.push({ tone: "info", kind: "Insiders", text: `Insiders sold far more than they bought in 90 days ($${(sold / 1e6).toFixed(1)}M sold)`, why: "In our research, insider sales on their own weren't a reliable warning; shown as context." });
  return out;
}

/** Buy and sale dollars by month for the last `months` months, oldest first, for small bar charts. */
export function monthly(trades, months = 12, today = new Date().toISOString().slice(0, 10)) {
  const keys = [];
  const d = new Date(today.slice(0, 7) + "-01T12:00:00Z");
  for (let i = months - 1; i >= 0; i--) { const x = new Date(d); x.setUTCMonth(d.getUTCMonth() - i); keys.push(x.toISOString().slice(0, 7)); }
  const rows = new Map(keys.map((k) => [k, { month: k, buy: 0, sell: 0 }]));
  for (const t of trades ?? []) {
    const r = rows.get(String(t.date).slice(0, 7));
    if (!r || !t.value) continue;
    if (t.code === "P") r.buy += t.value; else if (t.code === "S") r.sell += t.value;
  }
  return [...rows.values()];
}
