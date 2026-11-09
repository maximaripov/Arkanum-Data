import InsidersView, { type Overview } from "./InsidersView";
import { HomeIntro } from "@/components/HomeIntro";
import { readOverview } from "@/lib/siteData";

export const metadata = { alternates: { canonical: "/" } };
// The overview lists are rendered here so the page arrives with them (crawlers included).
export const revalidate = 900;

async function overview(): Promise<Overview | null> {
  const d = await readOverview();
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
