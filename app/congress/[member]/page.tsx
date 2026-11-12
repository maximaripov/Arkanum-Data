import type { Committee, SectorRow } from "@/components/CongressIntel";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MemberView, type CTrade, type Member, type Overview } from "@/components/CongressView";
import { readCongressOverview } from "@/lib/siteData";
import { readCongressMember } from "@/lib/congressFiles";

// One page per House member, built on first visit and refreshed at most hourly (the data
// changes once a day), so the trades are in the HTML for visitors and search engines.
export const revalidate = 3600;
export async function generateStaticParams() { return []; }
// Read from the deployment's own copy, not fetched through the runtime cache (its writes are limited).
const load = (slug: string) => readCongressMember(slug) as Promise<{ member: Member; trades: CTrade[]; returnsAsOf?: string | null; sectors?: SectorRow[]; committees?: Committee[] } | null>;

export async function generateMetadata({ params }: { params: Promise<{ member: string }> }): Promise<Metadata> {
  const slug = (await params).member;
  const d = await load(slug);
  if (!d) return { title: "Member not found" };
  const m = d.member;
  const who = `${m.m} (${m.p ? m.p + "-" : ""}${m.sd})`;
  const title = `${m.m} stock trades`;
  const description = `${who}${m.current ? "" : ", a former member,"} reported ${m.n.toLocaleString("en-US")} stock trades in the last two years: ${m.buys.toLocaleString("en-US")} buys and ${m.sells.toLocaleString("en-US")} sales. Their latest trades from STOCK Act reports, each linked to the filing.`;
  return { title, description, alternates: { canonical: `/congress/${slug}` }, openGraph: { title: `${title} · Arkanum Data`, description, url: `/congress/${slug}` } };
}

export default async function Page({ params }: { params: Promise<{ member: string }> }) {
  const slug = (await params).member;
  const [d, o] = await Promise.all([load(slug), readCongressOverview() as Promise<Overview | null>]);
  if (!d) notFound();
  return <MemberView member={d.member} trades={d.trades.slice(0, 200)} members={(o?.members ?? [d.member]).map(({ m, p, sd, n, usd }) => ({ m, p, sd, n, usd }))} skipped={o?.stats.scannedSkipped ?? 0} returnsAsOf={d.returnsAsOf} sectors={d.sectors ?? []} committees={d.committees ?? []} />;
}
