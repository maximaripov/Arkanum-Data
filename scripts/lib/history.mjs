// "First buy in N years": for each executive/director purchase, look back through the
// insider's earlier Form 4s (newest first, up to MAX_FILINGS within YEARS) for a previous
// open-market buy of the same stock. Sets on the trade:
//   prevBuy: "YYYY-MM-DD" of the previous buy, or null if none was found
//   prevBuyYears: how far back the search reached (whole years) when prevBuy is null
// Filings are cached in data/insider-history.json (they never change once filed).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { getJson, getText, pool } from "./sec.mjs";
import { parseForm4 } from "../../lib/form4.mjs";
import { roleKind } from "../../lib/conviction.mjs";

const FILE = "data/insider-history.json";
const YEARS = 5;
const MAX_FILINGS = 25;
const ymd = (d) => d.toISOString().slice(0, 10);
const ago = (days) => ymd(new Date(Date.now() - days * 86_400_000));

export async function addHistory(trades, { keepOwners } = {}) {
  let cache = { filings: {}, owners: {} };
  try { cache = JSON.parse(await readFile(FILE, "utf8")); } catch {}
  const todo = trades.filter((t) => t.code === "P" && t.ownerCik && roleKind(t.role) !== "owner" && !("prevBuy" in t));
  if (!todo.length) return 0;

  // Each insider's Form 4 filings over the last YEARS (their SEC "submissions" list).
  const owners = [...new Set(todo.map((t) => t.ownerCik))].filter((c) => !cache.owners[c] || cache.owners[c].fetched < ago(3));
  await pool(owners, 4, async (cik) => {
    const sub = await getJson(`https://data.sec.gov/submissions/CIK${cik.padStart(10, "0")}.json`);
    const r = sub?.filings?.recent;
    if (!r) return;
    const list = [];
    for (let i = 0; i < r.form.length; i++)
      if ((r.form[i] === "4" || r.form[i] === "4/A") && r.filingDate[i] >= ago(YEARS * 366)) list.push([r.accessionNumber[i], r.filingDate[i], r.primaryDocument[i]]);
    cache.owners[cik] = { fetched: ymd(new Date()), list };
  });

  const filing = async (cik, [acc, date, doc]) => {
    if (cache.filings[acc]) return cache.filings[acc];
    const file = String(doc ?? "").split("/").pop();
    if (!file) return null;
    const xml = await getText(`https://www.sec.gov/Archives/edgar/data/${cik}/${acc.replace(/-/g, "")}/${file}`);
    if (!xml) return null;
    const rows = parseForm4(xml, { accession: acc, filed: date, url: "" });
    const f = { d: date, s: rows[0]?.symbol ?? "", p: [...new Set(rows.filter((x) => x.code === "P").map((x) => x.date))] };
    cache.filings[acc] = f;
    return f;
  };

  let done = 0;
  await pool(todo, 4, async (t) => {
    const list = (cache.owners[t.ownerCik]?.list ?? []).filter(([acc, date]) => date < t.filed && acc !== t.accession);
    let reach = t.filed;
    for (const entry of list.slice(0, MAX_FILINGS)) {
      const f = await filing(t.ownerCik, entry);
      reach = entry[1];
      if (f && f.s === t.symbol && f.p.length) { t.prevBuy = f.p.sort().at(-1); delete t.prevBuyYears; done++; return; }
    }
    // Nothing found: if every filing in the window was checked, the search covered YEARS;
    // otherwise it covered back to the oldest filing read.
    const years = list.length <= MAX_FILINGS ? YEARS : Math.floor((Date.parse(t.filed) - Date.parse(reach)) / (365.25 * 86_400_000));
    t.prevBuy = null;
    t.prevBuyYears = years;
    done++;
  });

  // Keep the cache small: forget insiders no longer in the window and filings over 6 years old.
  if (keepOwners) for (const c of Object.keys(cache.owners)) if (!keepOwners.has(c)) delete cache.owners[c];
  for (const [acc, f] of Object.entries(cache.filings)) if (f.d < ago(6 * 366)) delete cache.filings[acc];
  await mkdir("data", { recursive: true });
  await writeFile(FILE, JSON.stringify(cache));
  return done;
}
