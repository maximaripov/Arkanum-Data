// Search: stock symbols over SEC's list of US-listed companies, plus insiders by name
// (from the site's insider directory, public/data/people.json).
import { searchCompanies } from "@/lib/sec";

type Person = [cik: string, name: string, symbol: string, role: string];
const words = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);

async function searchPeople(q: string, origin: string) {
  const terms = words(q);
  if (!terms.length || q.replace(/\s/g, "").length < 3) return [];
  const r = await fetch(new URL("/data/people.json", origin), { next: { revalidate: 3600 } });
  if (!r.ok) return [];
  const people = (await r.json()) as Person[];
  const out: Person[] = [];
  for (const p of people) {
    const name = words(p[1]);
    // Every typed word must start one of the name's words ("jen hua" finds Jensen Huang).
    if (terms.every((t) => name.some((w) => w.startsWith(t)))) out.push(p);
    if (out.length >= 5) break;
  }
  return out.map(([cik, name, symbol, role]) => ({ symbol, name, type: "Insider", exchange: `${symbol} · ${role}`, href: `/insider/${cik}` }));
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return Response.json([]);
  const [companies, people] = await Promise.all([
    searchCompanies(q).then((hits) => hits.map((c) => ({ symbol: c.ticker, name: c.name, type: "Stock", exchange: c.exchange ?? "" }))).catch(() => []),
    searchPeople(q, req.url).catch(() => []),
  ]);
  // A ticker match first, then people, then the rest of the companies.
  const exact = companies.filter((c) => c.symbol.toLowerCase() === q.toLowerCase());
  const hits = [...exact, ...people, ...companies.filter((c) => !exact.includes(c))].slice(0, 10);
  return Response.json(hits, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
