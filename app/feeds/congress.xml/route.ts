// RSS: House members' stock trade reports, one item per report (a report can list dozens of
// trades), newest filed first. From the full two-year file the daily Congress job writes.
import { memberSlug, amountRange } from "@/lib/congress.mjs";
import { rss, esc, type FeedItem } from "@/lib/rss";

export const revalidate = 3600;
const SITE = "https://arkanumdata.vercel.app";
type Trade = { member: string; party: string | null; state: string; district: number; filed: string; date: string; owner: string; ticker: string | null; asset: string; assetType: string | null; type: string; min: number | null; max: number | null; url: string };
const OWNER: Record<string, string> = { SP: "spouse", JT: "joint", DC: "child" };
const day = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const asset = (a: string) => a.replace(/\s*-?\s*(Common Stock|Class [A-C] Common Stock|Ordinary Shares).*$/i, "");

export async function GET() {
  const r = await fetch(`${SITE}/data/congress.json`, { next: { revalidate: 3600 } }).catch(() => null);
  const { trades = [] } = r?.ok ? ((await r.json()) as { trades: Trade[] }) : {};
  const reports = new Map<string, Trade[]>();
  for (const t of trades) {
    if (!t.ticker || t.type === "E" || (t.assetType && t.assetType !== "ST")) continue; // stocks only, as on the site
    reports.set(t.url, [...(reports.get(t.url) ?? []), t]);
  }
  const items: FeedItem[] = [...reports.values()]
    .sort((a, b) => b[0].filed.localeCompare(a[0].filed))
    .slice(0, 50)
    .map((list) => {
      const t = list[0];
      const who = `${t.member} (${t.party ? t.party[0] + "-" : ""}${t.state}${t.district ? "-" + t.district : ""})`;
      const buys = list.filter((x) => x.type === "P").length, sales = list.length - buys;
      const summary = list.length === 1
        ? `${t.type === "P" ? "bought" : "sold"} ${t.ticker} (${amountRange(t.min, t.max)})`
        : `reported ${list.length} stock trades: ${[buys ? `${buys} ${buys === 1 ? "buy" : "buys"}` : "", sales ? `${sales} ${sales === 1 ? "sale" : "sales"}` : ""].filter(Boolean).join(", ")}`;
      const rows = list.slice(0, 40).map((x) => `<li>${x.type === "P" ? "Buy" : "Sale"} ${esc(x.ticker!)} (${esc(asset(x.asset))}), ${esc(amountRange(x.min, x.max))}, traded ${day(x.date)}${OWNER[x.owner] ? `, ${OWNER[x.owner]}` : ""}</li>`).join("");
      const html = `<p>${esc(who)}, disclosed ${day(t.filed)}.</p><ul>${rows}</ul>${list.length > 40 ? `<p>and ${list.length - 40} more</p>` : ""}<p><a href="${esc(t.url)}">The report (PDF)</a></p>`;
      return { title: `${who} ${summary}`, link: `/congress/${memberSlug(t.member)}`, guid: t.url, date: t.filed, html };
    });
  return rss({ title: "Arkanum Data: Congress stock trades", path: "/feeds/congress.xml", description: "Stock trades House members disclose in their STOCK Act reports, one item per report, from the U.S. House Clerk.", items });
}
