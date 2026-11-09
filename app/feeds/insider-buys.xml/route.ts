// RSS: executive and director purchases that score 60+ (the site's top tier), one item per
// filing, newest filed first. From the same 30-day + today data as the Insiders page.
import { loadInsiders } from "@/lib/insiderData";
import { isExecOrDirector, personName, roleLabel, companyName } from "@/lib/people.mjs";
import { fmtBig } from "@/lib/format";
import { rss, esc, type FeedItem } from "@/lib/rss";
import type { InsiderTrade } from "@/lib/sec";

export const revalidate = 3600;
const SITE = "https://arkanumdata.vercel.app";
type Scored = InsiderTrade & { conv?: { score: number; tier: string; reasons: { text: string }[] } | null };
const day = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export async function GET() {
  const data = await loadInsiders(SITE, { next: { revalidate: 1800 } }).catch(() => null);
  const top = ((data?.trades ?? []) as Scored[]).filter((t) => t.code === "P" && t.value && isExecOrDirector(t) && (t.conv?.score ?? 0) >= 60);
  // A filing can list several purchases; one item each, with the amounts added up.
  const filings = new Map<string, { t: Scored; value: number; shares: number }>();
  for (const t of top) {
    const key = `${t.accession}|${t.symbol}`;
    const f = filings.get(key) ?? { t, value: 0, shares: 0 };
    f.value += t.value ?? 0; f.shares += t.shares ?? 0;
    if ((t.conv?.score ?? 0) > (f.t.conv?.score ?? 0)) f.t = t;
    filings.set(key, f);
  }
  const items: FeedItem[] = [...filings.values()]
    .sort((a, b) => (b.t.filed || b.t.date).localeCompare(a.t.filed || a.t.date) || b.value - a.value)
    .slice(0, 50)
    .map(({ t, value, shares }) => {
      const who = personName(t.owner);
      const role = roleLabel(t.role);
      const co = companyName(t.issuer, t.symbol);
      const price = shares ? value / shares : null;
      const facts = (t.conv?.reasons ?? []).map((r) => r.text).join(" · ");
      const html = `<p>${esc(who)} (${esc(role)}) bought $${fmtBig(value)} of ${esc(co)} (${esc(t.symbol)})${shares ? `: ${shares.toLocaleString("en-US")} shares${price ? ` at about $${price.toFixed(2)}` : ""}` : ""}, traded ${day(t.date)}, filed ${day(t.filed || t.date)}.</p>`
        + (facts ? `<p>${esc(facts)}. How unusual: ${t.conv?.score}/100 (a description, not a forecast).</p>` : "")
        + `<p><a href="${esc(t.url)}">SEC filing</a></p>`;
      return { title: `${t.symbol}: ${who}, ${role}, bought $${fmtBig(value)}`, link: `/stock/${encodeURIComponent(t.symbol)}`, guid: `${t.accession}-${t.symbol}`, date: t.filed || t.date, html };
    });
  return rss({ title: "Arkanum Data: unusual insider buys", path: "/feeds/insider-buys.xml", description: "Open-market purchases by executives and directors that Arkanum labels Unusual (score 60+: how out of the ordinary the buy is, not a prediction of returns), from SEC Form 4 filings.", items });
}
