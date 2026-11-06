// The digest archive, read from the files the daily job commits (public/data/digests).
// Only used at build time: every dated page is built with the deploy that adds its file.
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Digest } from "@/components/DigestView";

const DIR = path.join(process.cwd(), "public/data/digests");
export type DigestEntry = { date: string; kind: string; title: string; lead?: string };

export async function digestIndex(): Promise<DigestEntry[]> {
  try { return JSON.parse(await readFile(path.join(DIR, "index.json"), "utf8")).digests; } catch { return []; }
}
export async function digestFor(date: string): Promise<Digest | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  try { return JSON.parse(await readFile(path.join(DIR, `${date}.json`), "utf8")); } catch { return null; }
}
