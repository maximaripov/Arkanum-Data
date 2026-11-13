// Every past digest, newest first.
import type { Metadata } from "next";
import { PastDigests } from "@/components/DigestView";
import { digestIndex } from "@/lib/digestArchive";

const description = "Every daily digest and Saturday week in review: the biggest insider buys, insiders buying together and big-fund filings, day by day.";
export const metadata: Metadata = {
  title: { absolute: "Digest archive · Arkanum Data" }, // the layout template did not reach this static page
  description,
  alternates: { canonical: "/briefing/archive" },
  openGraph: { title: "Digest archive · Arkanum Data", description, url: "/briefing/archive", images: "/opengraph-image" },
};

export default async function Archive() {
  const list = await digestIndex();
  return (
    <div className="stack">
      <h1 className="holdings-title">Digest archive</h1>
      {list.length ? <PastDigests list={list} all /> : <section className="card"><p className="muted">No digests yet.</p></section>}
    </div>
  );
}
