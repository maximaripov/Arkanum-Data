// Reading quarterly 13F holdings reports from SEC EDGAR, shared by the big-funds and
// company-stakes builds: holdings per filing, quarter-over-quarter changes, and
// CUSIP → ticker matching (OpenFIGI's free lookup, cached in data/cusip.json, with a
// company-name fallback for foreign CINS codes).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";
import { getJson, getText, sleep } from "./sec.mjs";

const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true, parseTagValue: false });

/** Holdings in one 13F filing, merged by CUSIP (stock positions only; options left out). */
export async function holdings(cik, accession) {
  const folder = `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}`;
  const idx = await getJson(`${folder}/index.json`);
  const xmls = (idx?.directory?.item ?? []).map((i) => i.name).filter((n) => /\.xml$/i.test(n) && !/primary_doc/i.test(n));
  const byCusip = new Map();
  for (const f of xmls) {
    const doc = parser.parse((await getText(`${folder}/${f}`)) ?? "");
    for (const h of arr(doc?.informationTable?.infoTable)) {
      if (h.putCall) continue; // option positions aren't stock holdings
      const cusip = String(h.cusip ?? "").toUpperCase();
      const value = Number(h.value) || 0; // dollars (since 2023)
      const shares = Number(h.shrsOrPrnAmt?.sshPrnamt) || 0;
      const cur = byCusip.get(cusip) ?? { cusip, name: String(h.nameOfIssuer ?? "").trim(), cls: String(h.titleOfClass ?? "").trim(), value: 0, shares: 0 };
      cur.value += value; cur.shares += shares;
      byCusip.set(cusip, cur);
    }
  }
  return byCusip;
}

/** A filer's latest two 13F-HR filings from its SEC submissions list. */
export function latest13F(sub, n = 2) {
  const r = sub?.filings?.recent;
  const out = [];
  for (let i = 0; r && i < r.form.length && out.length < n; i++)
    if (r.form[i] === "13F-HR") out.push({ accession: r.accessionNumber[i], period: r.reportDate[i], filed: r.filingDate[i] });
  return out;
}

/** Latest holdings plus what changed since the previous quarter. Reuses `old` if nothing new was filed. */
export async function summarize13F({ cik, sub, old, top = 100, changes = 25 }) {
  const filings = latest13F(sub);
  if (!filings.length) return null;
  if (old && old.accession === filings[0].accession) return { ...old, unchanged: true };
  const now = await holdings(cik, filings[0].accession);
  const before = filings[1] ? await holdings(cik, filings[1].accession) : new Map();
  const total = [...now.values()].reduce((a, h) => a + h.value, 0);
  const rows = [...now.values()].map((h) => {
    const b = before.get(h.cusip);
    const change = !b ? "new" : h.shares > b.shares * 1.005 ? "added" : h.shares < b.shares * 0.995 ? "reduced" : "same";
    return { ...h, pct: total ? (h.value / total) * 100 : 0, change, chgPct: b && b.shares ? ((h.shares - b.shares) / b.shares) * 100 : null };
  }).sort((a, b) => b.value - a.value);
  const sold = [...before.values()].filter((b) => !now.has(b.cusip)).sort((a, b) => b.value - a.value).map((b) => ({ ...b, pct: 0, change: "sold", chgPct: -100 }));
  const pick = (list) => list.slice(0, changes);
  return {
    accession: filings[0].accession, period: filings[0].period, filed: filings[0].filed,
    prevPeriod: filings[1]?.period ?? null, total, count: now.size,
    top: rows.slice(0, top),
    new: pick(rows.filter((h) => h.change === "new")),
    added: pick(rows.filter((h) => h.change === "added")),
    reduced: pick(rows.filter((h) => h.change === "reduced")),
    sold: pick(sold),
  };
}

const norm = (n) => ` ${String(n).toUpperCase().replace(/&/g, " AND ").replace(/[^A-Z0-9 ]/g, " ")} `
  .replace(/ HLDNGS | HLDGS | HLDG | HLDGS? /g, " HOLDINGS ").replace(/ HOLDING /g, " HOLDINGS ")
  .replace(/ (INC|CORP|CORPORATION|CO|COMPANY|LTD|LIMITED|PLC|PL|NV|N V|SA|AG|SE|LP|LLC|THE|CL [A-C]|CLASS [A-C]|COM|NEW|DEL|ADR|ADS|ORD|SHS)(?= )/g, " ")
  .replace(/\s+/g, " ").trim();

/** Sets `h.t` (ticker) on every holding in `lists`: CUSIP cache → OpenFIGI → unique company name. */
export async function addTickers(lists) {
  let cache = {};
  try { cache = JSON.parse(await readFile("data/cusip.json", "utf8")); } catch {}
  const all = lists.flat();
  const need = [...new Set(all.map((h) => h.cusip))].filter((c) => c && !(c in cache));
  console.log(`Looking up ${need.length} new CUSIPs…`);
  for (let i = 0; i < need.length; i += 10) {
    const batch = need.slice(i, i + 10);
    try {
      const r = await fetch("https://api.openfigi.com/v3/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch.map((c) => ({ idType: "ID_CUSIP", idValue: c, exchCode: "US" }))),
        signal: AbortSignal.timeout(20_000),
      });
      if (r.status === 429) { await sleep(60_000); i -= 10; continue; } // free limit: 25 requests/minute
      const res = await r.json();
      batch.forEach((c, k) => { cache[c] = res[k]?.data?.[0]?.ticker ?? null; });
    } catch {}
    await sleep(2600);
  }
  // Companies registered abroad (Chubb, Seagate, ASML…) have CINS codes the free tier doesn't
  // map: match the company name against SEC's list, only when exactly one company fits.
  const list = await getJson("https://www.sec.gov/files/company_tickers.json");
  const byName = new Map();
  for (const { cik_str, title, ticker } of Object.values(list ?? {})) {
    const k = norm(title);
    if (!byName.has(k)) byName.set(k, new Map());
    if (!byName.get(k).has(cik_str)) byName.get(k).set(cik_str, ticker); // main share class listed first
  }
  let byNameHits = 0;
  for (const h of all) {
    // OpenFIGI writes share classes as "LEN/B"; Arkanum (like Yahoo) uses "LEN-B".
    h.t = cache[h.cusip]?.replace(/[/ ]/g, "-") ?? null;
    if (h.t) continue;
    const hit = byName.get(norm(h.name));
    if (hit?.size === 1) { h.t = [...hit.values()][0]; byNameHits++; }
  }
  console.log(`Matched ${byNameHits} more holdings by company name`);
  await mkdir("data", { recursive: true });
  await writeFile("data/cusip.json", JSON.stringify(cache));
}
