// Page 2 of the filing-delay working paper.
import { notFound } from "next/navigation";
import { PAGES, PaperPageView, paperMetadata } from "../paper";

export const dynamicParams = false;
export function generateStaticParams() { return PAGES.slice(1).map((pg) => ({ section: pg.slug })); }
const index = (s: string) => PAGES.findIndex((pg, i) => i > 0 && pg.slug === s);

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const i = index((await params).section);
  return i > 0 ? paperMetadata(i) : {};
}
export default async function PaperSection({ params }: { params: Promise<{ section: string }> }) {
  const i = index((await params).section);
  if (i < 1) notFound();
  return <PaperPageView i={i} />;
}
