// Shared pieces of the daily digest: what counts as news today, the plain-English summary
// and the one-line notification. Used by scripts/daily-digest.mjs (and its tests).
import { nyNow } from "./sendTime.mjs";

/** Minutes past midnight from "8:30 AM ET" / "2:00 PM ET"; null when there's no time. */
export function eventMinutes(time) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(String(time ?? ""));
  if (!m) return null;
  return ((Number(m[1]) % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0)) * 60 + Number(m[2]);
}

/** Still ahead: a later day, or later today (an untimed event today counts as ahead). */
export function isUpcoming(e, now = new Date()) {
  const { date, minutes } = nyNow(now);
  if (e.date !== date) return e.date > date;
  const at = eventMinutes(e.time);
  return at == null || at > minutes;
}

const dayMs = 86_400_000;
const daysBetween = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / dayMs);
/** Form 4s are due within two business days; anything traded over a week before it was filed is a late filing. */
export const LATE_DAYS = 7;
export const isLateFiling = (t) => !t.date || !t.filed || daysBetween(t.date, t.filed) > LATE_DAYS;

export const money = (v) => (v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}K` : `$${Math.round(v)}`);
const NUM = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const words = (n) => (n <= 10 ? NUM[n] : String(n));
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const plural = (n, one, many = one + "s") => `${words(n)} ${n === 1 ? one : many}`;
const shortTitle = (t) => t.replace(/ \(.*\)$/, "");
/** "Upbound Group, Inc." → "Upbound Group", for use inside a sentence. */
export const bareCompany = (c) => String(c).replace(/,?\s+(Inc|Corp|Corporation|Co|Company|Ltd|Limited|LLC|L\.?P|N\.?V|plc|S\.?A|AG|SE|Holdings?)\.?$/i, "").replace(/,$/, "");

/** Two or three plain sentences: the day (or week) in insider buying, then what's next. */
export function summarize(d) {
  const week = d.kind === "weekly";
  const when = week ? "this week" : "today";
  const out = [];
  if (d.totals.buys) {
    const b = d.buys[0];
    out.push(`${cap(plural(d.totals.buys, "insider buy"))} ${d.totals.buys === 1 ? "was" : "were"} filed ${when}, ${money(d.totals.value)} in total; the biggest ${b.entity ? "" : "by a person "}was ${b.name} at ${b.symbol}, ${money(b.value)}.`);
  } else out.push(`No executive or director bought shares in a filing ${when}.`);
  const c = d.clusters[0];
  if (c) out.push(`${cap(words(c.insiders))} insiders at ${bareCompany(c.company)} (${c.symbol}) bought ${week ? "this week" : "over the past week"}, ${money(c.value)} together.`);
  if (d.funds.length) out.push(d.funds.length === 1 ? `${d.funds[0].fund} filed its quarterly holdings.` : `${cap(words(d.funds.length))} big funds filed their quarterly holdings.`);
  const e = d.events[0];
  if (e && out.length < 3) out.push(`Next: ${shortTitle(e.title)}, ${e.day}.`);
  return out.slice(0, 3);
}

/** The notification is just its title (Saturday's says "Weekly Digest"): tapping it opens the digest. */
export const notification = (d) => ({ title: d.kind === "weekly" ? "Weekly Digest" : "Daily Digest", body: "" });
