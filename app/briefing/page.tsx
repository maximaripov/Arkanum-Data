// The Digest page, rendered on the server with the latest digest and the archive so it
// arrives complete (no "Loading…"); refreshed at most every 5 minutes.
import { readDigest } from "@/lib/alerts";
import { readDigestFile } from "@/lib/digestFiles";
import { isDigest, type Digest } from "@/components/DigestView";
import { DigestClient, type Entry } from "./DigestClient";

export const revalidate = 300;
// Past digests are read from the deployment's own copy, not fetched through the runtime cache.

export default async function DigestPage() {
  const past = ((await readDigestFile("index")) as { digests: Entry[] } | null)?.digests ?? [];
  let latest: Digest | null = null;
  try { const x = await readDigest(); if (isDigest(x)) latest = x; } catch {}
  if (!latest && past[0]) { const y = await readDigestFile(past[0].date); if (isDigest(y)) latest = y; }
  return <DigestClient initial={latest ?? "none"} />;
}
