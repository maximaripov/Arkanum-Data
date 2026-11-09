import InsidersView, { type Overview } from "./InsidersView";
import { HomeIntro } from "@/components/HomeIntro";

export const metadata = { alternates: { canonical: "/" } };
// The overview lists are rendered here so the page arrives with them (crawlers included).
export const revalidate = 900;
const SITE = "https://arkanumdata.vercel.app";

async function overview(): Promise<Overview | null> {
  const r = await fetch(`${SITE}/data/overview.json`, { next: { revalidate: 900 } }).catch(() => null);
  const d = r?.ok ? await r.json().catch(() => null) : null;
  return d?.totals ? (d as Overview) : null;
}

// The homepage: what Arkanum is and what its research found, then the insider overview.
export default async function Home() {
  return (
    <>
      <HomeIntro />
      <InsidersView initial={await overview()} />
    </>
  );
}
