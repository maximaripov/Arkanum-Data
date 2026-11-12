// The site's own data files (public/data), read from disk on the server. Each deployment ships
// the files it serves, so there is nothing to fetch or cache: fetching them over HTTP copied
// up to 1 MB into Vercel's runtime cache on every refresh, and its free writes are limited.
// Each path is written out in full so Vercel bundles only these files with the functions.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { mergeInsiders, type InsiderData } from "./insiderData";

const read = (file: string) => readFile(file, "utf8").then((s) => JSON.parse(s)).catch(() => null);

export const readOverview = () => read(path.join(process.cwd(), "public/data/overview.json"));
export const readScreener = () => read(path.join(process.cwd(), "public/data/screener.json"));
export const readCongressOverview = () => read(path.join(process.cwd(), "public/data/congress-overview.json"));
export const readFamous = () => read(path.join(process.cwd(), "public/data/famous.json"));
/** Shares outstanding by ticker (scripts/build-shares.mjs), for market value in risk flags. */
export const readShares = () => read(path.join(process.cwd(), "public/data/shares.json")) as Promise<Record<string, number> | null>;
/** The 30-day insider file plus today's, merged (as loadInsiders does over HTTP). */
export async function readInsiders(): Promise<InsiderData> {
  const [main, today] = await Promise.all([
    read(path.join(process.cwd(), "public/data/insiders.json")),
    read(path.join(process.cwd(), "public/data/insiders-today.json")),
  ]);
  return mergeInsiders(main, today);
}
