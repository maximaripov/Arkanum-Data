// The Digest page, rendered on the server with the latest digest and the archive so it
// arrives complete (no "Loading…"); refreshed at most every 5 minutes.
import { readDigest } from "@/lib/alerts";
import { isDigest, type Digest } from "@/components/DigestView";
import { DigestClient, type Entry } from "./DigestClient";

export const revalidate = 300;
const SITE = "https://arkanumdata.vercel.app";
const get = async <T,>(path: string): Promise<T | null> => {
  const r = await fetch(SITE + path, { next: { revalidate: 300 } }).catch(() => null);
  return r?.ok ? ((await r.json()) as T) : null;
};

export default async function DigestPage() {
  const past = (await get<{ digests: Entry[] }>("/data/digests/index.json"))?.digests ?? [];
  let latest: Digest | null = null;
  try { const x = await readDigest(); if (isDigest(x)) latest = x; } catch {}
  if (!latest && past[0]) { const y = await get<unknown>(`/data/digests/${past[0].date}.json`); if (isDigest(y)) latest = y; }
  return <DigestClient initial={latest ?? "none"} initialPast={past} />;
}
