import type { Metadata } from "next";
import { CongressView, type Overview } from "@/components/CongressView";

export const metadata: Metadata = {
  title: "Congress stock trades",
  description: "What members of the House are buying and selling, from their STOCK Act reports: latest trades, most-bought stocks and every member's trades.",
  openGraph: { title: "Congress stock trades · Arkanum", url: "/congress" },
};

// Rendered on the server and refreshed at most hourly (the data changes once a day).
export const revalidate = 3600;
const SITE = "https://form4-insiders.vercel.app";

export default async function Congress() {
  const r = await fetch(`${SITE}/data/congress-overview.json`, { next: { revalidate: 3600 } }).catch(() => null);
  const initial = r?.ok ? ((await r.json()) as Overview) : null;
  return <CongressView initial={initial} />;
}
