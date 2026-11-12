// One search for everything on the site: stock symbols (SEC's list of US-listed companies),
// insiders by name (public/data/people.json), House members (congress-overview.json) and
// the tracked investment funds by name or manager (funds.json).
import { searchCompanies } from "@/lib/sec";
import { memberSlug } from "@/lib/congress.mjs";

type Person = [cik: string, name: string, symbol: string, role: string, common?: string];
type Member = { m: string; p: string | null; sd: string; n: number; current?: boolean };
type Fund = { cik: number; name: string; who?: string };
export type Hit = { symbol: string; name: string; type: "Stock" | "Insider" | "Congress" | "Fund"; exchange: string; href?: string };

const words = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
/** Every typed word must start one of the name's words ("jen hua" finds Jensen Huang). */
const matches = (terms: string[], text: string) => { const w = words(text); return terms.every((t) => w.some((x) => x.startsWith(t))); };

// Site data files are kept in memory for an hour (people.json is over the fetch cache's size limit).
const cache = new Map<string, { at: number; data: unknown }>();
async function load<T>(path: string, origin: string, fallback: T): Promise<T> {
  const c = cache.get(path);
  if (c && Date.now() - c.at < 3_600_000) return c.data as T;
  const r = await fetch(new URL(path, origin), { cache: "no-store" }).catch(() => null);
  if (!r?.ok) return (c?.data as T) ?? fallback;
  const data = (await r.json()) as T;
  cache.set(path, { at: Date.now(), data });
  return data;
}

async function searchPeople(terms: string[], origin: string): Promise<Hit[]> {
  const people = await load<Person[]>("/data/people.json", origin, []);
  const out: Person[] = [];
  for (const p of people) {
    if (matches(terms, p[4] ? `${p[1]} ${p[4]}` : p[1])) out.push(p);
    if (out.length >= 4) break;
  }
  return out.map(([cik, name, symbol, role, common]) => ({ symbol, name: common ?? name, type: "Insider", exchange: `${symbol} · ${role}`, href: `/insider/${cik}` }));
}

async function searchMembers(terms: string[], origin: string): Promise<Hit[]> {
  const o = await load<{ members: Member[] } | null>("/data/congress-overview.json", origin, null);
  return (o?.members ?? []).filter((m) => matches(terms, m.m)).slice(0, 3)
    .map((m) => ({ symbol: m.sd, name: m.m, type: "Congress", exchange: `${m.p ? `${m.p}-` : ""}${m.sd} · House${m.current === false ? " (former)" : ""}`, href: `/congress/${memberSlug(m.m)}` }));
}

async function searchFunds(terms: string[], origin: string): Promise<Hit[]> {
  const f = await load<{ funds: Fund[] } | null>("/data/funds.json", origin, null);
  return (f?.funds ?? []).filter((x) => matches(terms, `${x.name} ${x.who ?? ""}`)).slice(0, 3)
    .map((x) => ({ symbol: "", name: x.name, type: "Fund", exchange: x.who ?? "Investment fund", href: `/stakes?view=funds&fund=${x.cik}` }));
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return Response.json([]);
  const terms = words(q);
  const named = terms.length && q.replace(/\s/g, "").length >= 3; // names need 3+ letters; symbols can be shorter
  const [companies, people, members, funds] = await Promise.all([
    searchCompanies(q).then((hits) => hits.map((c): Hit => ({ symbol: c.ticker, name: c.name, type: "Stock", exchange: c.exchange ?? "" }))).catch(() => [] as Hit[]),
    named ? searchPeople(terms, req.url).catch(() => []) : [],
    named ? searchMembers(terms, req.url).catch(() => []) : [],
    named ? searchFunds(terms, req.url).catch(() => []) : [],
  ]);
  // An exact ticker first, then politicians, funds and insiders by name, then the rest of the companies.
  const exact = companies.filter((c) => c.symbol.toLowerCase() === q.toLowerCase());
  const hits = [...exact, ...members, ...funds, ...people, ...companies.filter((c) => !exact.includes(c))].slice(0, 12);
  return Response.json(hits, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
