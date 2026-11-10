// Share picture for a Congress member's page: name, party and seat, two years of stock
// trades, and the latest three.
import { amountRange } from "@/lib/congress.mjs";
import { readCongressMember } from "@/lib/congressFiles";
import { ogImage, ogDay, OG_SIZE } from "@/lib/og";
import type { CTrade, Member } from "@/components/CongressView";

export const revalidate = 3600;
// Returning [] makes each image built on first request and cached, not rebuilt every time.
export async function generateStaticParams() { return []; }
export const alt = "This House member's stock trades on Arkanum";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ member: string }> }) {
  const slug = (await params).member;
  const d = (await readCongressMember(slug)) as { member: Member; trades: CTrade[] } | null;
  if (!d) return ogImage({ section: "Congress trades", title: "House stock trades", empty: "From members' STOCK Act reports" });
  const m = d.member;
  return ogImage({
    section: "Congress trades",
    title: m.m,
    tag: { text: `${m.p ? m.p + "-" : ""}${m.sd}`, tone: m.p === "R" ? "r" : m.p === "D" ? "d" : undefined },
    subtitle: m.current ? "Member of the House" : "Former member of the House",
    stats: [
      { label: "Stock trades · 2 yrs", value: m.n.toLocaleString("en-US") },
      { label: "Buys", value: m.buys.toLocaleString("en-US"), tone: "up" },
      { label: "Sales", value: m.sells.toLocaleString("en-US"), tone: "down" },
    ],
    rows: d.trades.slice(0, 3).map((t) => ({ side: t.y === "P" ? "BUY" : "SELL", text: `${t.t} · ${t.a.replace(/\s*-?\s*(Common Stock|Class [A-C] Common Stock|Ordinary Shares).*$/i, "")}`, amount: amountRange(t.lo, t.hi), when: ogDay(t.d) })),
  });
}
