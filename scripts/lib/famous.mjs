// Well-known insiders: matching Wikidata's CEOs and chairs of SEC-registered companies to the
// people who actually file Form 4s for those companies (the site's insider directory).

const SUFFIX = new Set(["jr", "sr", "ii", "iii", "iv"]);
const words = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]+/g, " ").split(/\s+/).filter((w) => w && !SUFFIX.has(w));

/** Same person? The surname must appear in the filer's name and the first initials must agree
 * ("Jensen Huang" ⇄ "Jen Hsun Huang", "Tim Cook" ⇄ "Timothy D Cook"). */
export function sameName(common, legal) {
  const w = words(common), f = words(legal);
  if (w.length < 2 || !f.length) return false;
  return f.includes(w[w.length - 1]) && w[0][0] === f[0][0];
}

/**
 * @param rows Wikidata rows: { cik: "0001045810", label: "Jensen Huang", title: "Jensen_Huang" }
 * @param directory data/people.json: { [ownerCik]: { n, r, s, c, last } }
 * @param tickersByCik Map of company CIK (number) → Set of its tickers
 * @returns one entry per matched filer: { cik, label, title, name, role, symbol, company, last }
 */
export function matchFamous(rows, directory, tickersByCik) {
  const bySymbol = new Map();
  for (const [cik, p] of Object.entries(directory)) {
    if (!bySymbol.has(p.s)) bySymbol.set(p.s, []);
    bySymbol.get(p.s).push({ cik, ...p });
  }
  const out = new Map();
  for (const row of rows) {
    const tickers = tickersByCik.get(Number(row.cik));
    if (!tickers || !row.title) continue;
    const hits = [...tickers].flatMap((t) => bySymbol.get(t) ?? []).filter((p) => sameName(row.label, p.n));
    if (hits.length !== 1) continue; // none, or ambiguous (two filers fit): leave it out rather than guess
    const p = hits[0];
    if (!out.has(p.cik)) out.set(p.cik, { cik: p.cik, label: row.label, title: row.title, name: p.n, role: p.r, symbol: p.s, company: p.c, last: p.last });
  }
  return [...out.values()];
}
