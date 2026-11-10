// Read from the deployment's own copy, not fetched through Vercel's runtime cache (its writes
// are limited). Kept apart from lib/siteData.ts on purpose: the file name is a parameter, so
// Vercel bundles the whole folder, and only the pages that import this module should carry it.
import { readFile } from "node:fs/promises";
import path from "node:path";

const read = (file: string) => readFile(file, "utf8").then((s) => JSON.parse(s)).catch(() => null);

/** One House member's file (public/data/congress/<slug>.json); null for a bad or unknown slug. */
export const readCongressMember = (slug: string) => /^[a-z0-9-]+$/.test(slug) ? read(path.join(process.cwd(), "public/data/congress", `${slug}.json`)) : Promise.resolve(null);
