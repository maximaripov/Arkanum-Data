import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MemberView, type CTrade, type Member, type Overview } from "@/components/CongressView";

// One page per House member, built on first visit and refreshed at most hourly (the data
// changes once a day), so the trades are in the HTML for visitors and search engines.
export const revalidate = 3600;
export async function generateStaticParams() { return []; }
const SITE = "https://form4-insiders.vercel.app";

const get = async <T,>(path: string): Promise<T | null> => {
  const r = await fetch(SITE + path, { next: { revalidate: 3600 } }).catch(() => null);
  return r?.ok ? ((await r.json()) as T) : null;
};
const load = (slug: string) => /^[a-z0-9-]+$/.test(slug) ? get<{ member: Member; trades: CTrade[] }>(`/data/congress/${slug}.json`) : Promise.resolve(null);

export async function generateMetadata({ params }: { params: Promise<{ member: string }> }): Promise<Metadata> {
  const slug = (await params).member;
  const d = await load(slug);
  if (!d) return { title: "Member not found" };
  const m = d.member;
  const who = `${m.m} (${m.p ? m.p + "-" : ""}${m.sd})`;
  const title = `${m.m} stock trades`;
  const description = `${who}${m.current ? "" : ", a former member,"} reported ${m.n.toLocaleString("en-US")} stock trades in the last two years: ${m.buys.toLocaleString("en-US")} buys and ${m.sells.toLocaleString("en-US")} sales. Their latest trades from STOCK Act reports, each linked to the filing.`;
  return { title, description, alternates: { canonical: `/congress/${slug}` }, openGraph: { title: `${title} · Arkanum`, description, url: `/congress/${slug}` } };
}

export default async function Page({ params }: { params: Promise<{ member: string }> }) {
  const slug = (await params).member;
  const [d, o] = await Promise.all([load(slug), get<Overview>("/data/congress-overview.json")]);
  if (!d) notFound();
  return <MemberView member={d.member} trades={d.trades.slice(0, 200)} members={(o?.members ?? [d.member]).map(({ m, p, sd, n }) => ({ m, p, sd, n }))} skipped={o?.stats.scannedSkipped ?? 0} />;
}
