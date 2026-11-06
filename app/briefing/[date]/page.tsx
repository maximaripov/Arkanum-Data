// One past digest at its own address (/briefing/2026-11-06), built once and never changed.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DigestView, PastDigests } from "@/components/DigestView";
import { digestFor, digestIndex } from "@/lib/digestArchive";

export const dynamicParams = false;
export async function generateStaticParams() {
  return (await digestIndex()).map((x) => ({ date: x.date }));
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  const d = await digestFor(date);
  if (!d) return {};
  const description = d.summary.join(" ");
  return {
    title: d.title,
    description,
    alternates: { canonical: `/briefing/${date}` },
    openGraph: { title: `${d.title} · Arkanum Data`, description, url: `/briefing/${date}`, type: "article", images: "/opengraph-image" },
  };
}

export default async function PastDigest({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const d = await digestFor(date);
  if (!d) notFound();
  const others = (await digestIndex()).filter((x) => x.date !== date);
  return (
    <div className="stack">
      <DigestView d={d} />
      <PastDigests list={others} />
    </div>
  );
}
