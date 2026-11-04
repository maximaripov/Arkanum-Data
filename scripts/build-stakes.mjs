#!/usr/bin/env node
// Builds public/data/stakes.json: what listed companies (NVIDIA, Amazon, Alphabet…) own in
// other public companies, from SEC filings:
//   - 13F: companies holding over $100M of US-listed stock report every holding each
//     quarter (filed up to 45 days after the quarter ends);
//   - Schedule 13D/13G: anyone crossing 5% of a company must file within days.
// Which companies to track is discovered, not hand-picked: every listed company that filed
// a 13F in the last two quarters, minus banks, insurers and asset managers (SEC industry
// codes 6000-6799), plus a short list of notable investment arms. Refreshed monthly
// (data/stakes-filers.json). Stakes in private companies aren't in SEC data at all.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { getJson, getText, pool } from "./lib/sec.mjs";
import { summarize13F, addTickers } from "./lib/thirteenf.mjs";

const FILERS = "data/stakes-filers.json";
const OUT = "public/data/stakes.json";
// Financial firms whose stakes are strategic rather than fund management.
const ALSO = [/^SOFTBANK GROUP/i];
const ymd = (d) => d.toISOString().slice(0, 10);
const ago = (days) => ymd(new Date(Date.now() - days * 86_400_000));
const titleCase = (s) => String(s).toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
// SEC lists every ticker a company has (share classes, warrants, notes) and not always the
// main one first; the shortest is the common stock (GOOG not GOOGM, AUR not AUROW).
async function mainTickers() {
  const best = new Map();
  for (const c of Object.values((await getJson("https://www.sec.gov/files/company_tickers.json")) ?? {})) {
    const k = String(c.cik_str), t = String(c.ticker);
    if (!best.has(k) || t.length < best.get(k).length) best.set(k, t);
  }
  return best;
}
const FUND_LIKE = 300; // a company reporting hundreds of holdings is managing money, not making investments
const MIN_TOTAL = 10e6;

// ---- 1. Which companies file 13Fs (refreshed monthly) -------------------------------------
let filers = null;
try { filers = JSON.parse(await readFile(FILERS, "utf8")); } catch {}
// Version 2 added companies found only through 5%+ filings.
if (!filers || filers.checked < ago(30) || filers.version !== 2) {
  const quarters = [];
  for (let d = new Date(); quarters.length < 4; d = new Date(d.getTime() - 92 * 86_400_000)) {
    const q = `${d.getUTCFullYear()}/QTR${Math.floor(d.getUTCMonth() / 3) + 1}`;
    if (!quarters.includes(q)) quarters.push(q);
  }
  const listed = await mainTickers();
  const thirteenF = new Map(); // CIK → filer name
  // 5%+ filings list every party: the company owned and whoever owns it. A listed company
  // that appears alongside another listed company may be the owner (NVIDIA in CoreWeave's
  // filing), so it's a candidate; the filing itself later says which side it is on.
  const stakeParties = new Map(); // accession → [[cik, name]]
  for (const [i, q] of quarters.entries()) {
    const idx = await getText(`https://www.sec.gov/Archives/edgar/full-index/${q}/form.idx`);
    for (const line of (idx ?? "").split("\n")) {
      if (i < 2 && line.startsWith("13F-HR ")) {
        const m = line.match(/^13F-HR\s+(.+?)\s{2,}(\d+)\s+\d{4}-\d\d-\d\d/);
        if (m) thirteenF.set(m[2], m[1].trim());
        continue;
      }
      const m = line.match(/^(?:SC 13[DG]|SCHEDULE 13[DG])(?:\/A)?\s+(.+?)\s{2,}(\d+)\s+\d{4}-\d\d-\d\d\s+(\S+)/);
      if (!m || !listed.has(m[2])) continue;
      const acc = m[3].match(/(\d{10}-\d\d-\d{6})/)?.[1];
      if (!acc) continue;
      if (!stakeParties.has(acc)) stakeParties.set(acc, []);
      stakeParties.get(acc).push([m[2], m[1].trim()]);
    }
    console.log(`${q}: ${thirteenF.size} 13F filers, ${stakeParties.size} 5%+ filings with a listed company so far`);
  }
  const stakeOnly = new Map();
  for (const parties of stakeParties.values()) {
    if (new Set(parties.map(([c]) => c)).size < 2) continue;
    for (const [c, n] of parties) if (!thirteenF.has(c)) stakeOnly.set(c, n);
  }
  console.log(`${stakeOnly.size} listed companies appear in another listed company's 5%+ filing`);
  const candidates = [
    ...[...thirteenF].filter(([cik, name]) => listed.has(cik) || ALSO.some((re) => re.test(name))),
    ...stakeOnly,
  ];
  console.log(`${candidates.length} candidates`);
  const found = [];
  await pool(candidates, 4, async ([cik, name]) => {
    const sub = await getJson(`https://data.sec.gov/submissions/CIK${cik.padStart(10, "0")}.json`);
    const sic = Number(sub?.sic) || 0;
    const extra = ALSO.some((re) => re.test(name));
    if (!extra && (!sic || (sic >= 6000 && sic <= 6799))) return; // banks, insurers, brokers, asset managers, REITs
    found.push({ cik, name: titleCase(sub?.name ?? name), ticker: listed.get(cik) ?? null, industry: sub?.sicDescription ?? "", extra, ...(stakeOnly.has(cik) ? { stakesOnly: true } : {}) });
  });
  filers = { version: 2, checked: ymd(new Date()), companies: found.sort((a, b) => a.name.localeCompare(b.name)) };
  await mkdir("data", { recursive: true });
  await writeFile(FILERS, JSON.stringify(filers, null, 1));
  console.log(`Tracking ${found.length} companies: ${found.map((c) => c.ticker ?? c.name).join(", ")}`);
}

// ---- 2. Each company's holdings, and its 5%+ stake filings --------------------------------
let prev = { companies: [] };
try { prev = JSON.parse(await readFile(OUT, "utf8")); } catch {}
const STAKE_FORM = /^(SC 13[DG]|SCHEDULE 13[DG])(\/A)?$/;
// Filings already read that aren't this company's stake in another (someone else's stake in
// it, or an older text filing), so they aren't fetched again every day.
const SKIP = "data/stakes-skip.json";
let skip = {};
try { skip = JSON.parse(await readFile(SKIP, "utf8")); } catch {}
const tag = (xml, name) => xml.match(new RegExp(`<(?:\\w+:)?${name}>\\s*([^<]*?)\\s*</`, "i"))?.[1] ?? null;

async function bigStakes(cik, sub, old) {
  const r = sub?.filings?.recent;
  const known = new Map((old ?? []).map((s) => [s.accession, s]));
  const skipped = new Set(skip[cik] ?? []);
  const fresh = new Set();
  const out = [];
  for (let i = 0; r && i < r.form.length && out.length < 40; i++) {
    if (!STAKE_FORM.test(r.form[i]) || r.filingDate[i] < ago(365)) continue;
    const acc = r.accessionNumber[i];
    if (known.has(acc)) { out.push(known.get(acc)); continue; }
    if (skipped.has(acc)) { fresh.add(acc); continue; }
    // Since 2025 these are structured XML; the subject company tells whether the filing is
    // this company's stake in another (keep) or someone else's stake in this company (skip).
    const doc = String(r.primaryDocument[i] ?? "").split("/").pop();
    if (!/\.xml$/i.test(doc)) { fresh.add(acc); continue; }
    const xml = await getText(`https://www.sec.gov/Archives/edgar/data/${cik}/${acc.replace(/-/g, "")}/${doc}`);
    if (!xml) continue;
    const issuerCik = String(Number(tag(xml, "issuerCik") ?? tag(xml, "issuerCIK") ?? 0) || "");
    if (!issuerCik || issuerCik === String(Number(cik))) { fresh.add(acc); continue; }
    // The percent owned: the largest "percent of class" figure among the reporting persons.
    const pcts = [...xml.matchAll(/<(?:\w+:)?(?:percentOfClass|classPercent|aggregatePercent\w*|percentOfClassRepresented\w*)>\s*([\d.]+)/gi)].map((m) => Number(m[1])).filter((x) => x >= 0 && x <= 100); // 0% = the stake was sold off
    const pct = pcts.length ? Math.max(...pcts) : NaN;
    out.push({
      accession: acc, form: r.form[i], filed: r.filingDate[i],
      issuer: titleCase(tag(xml, "issuerName") ?? ""), issuerCik, cusip: (tag(xml, "issuerCusip") ?? tag(xml, "issuerCUSIP") ?? "").toUpperCase() || null,
      pct: Number.isFinite(pct) ? pct : null,
      url: `https://www.sec.gov/Archives/edgar/data/${cik}/${acc.replace(/-/g, "")}/${acc}-index.htm`,
    });
  }
  // Latest filing per company held (amendments update earlier ones); older ones are skipped.
  const byIssuer = new Map();
  for (const s of out.sort((a, b) => b.filed.localeCompare(a.filed))) if (!byIssuer.has(s.issuerCik)) byIssuer.set(s.issuerCik, s); else fresh.add(s.accession);
  if (fresh.size) skip[cik] = [...fresh]; else delete skip[cik];
  return [...byIssuer.values()];
}

const out = [];
for (const c of filers.companies) {
  try {
    const sub = await getJson(`https://data.sec.gov/submissions/CIK${c.cik.padStart(10, "0")}.json`);
    const old = prev.companies.find((x) => x.cik === c.cik);
    const s = await summarize13F({ cik: c.cik, sub, old });
    const stakes = await bigStakes(c.cik, sub, old?.stakes);
    if (!s && !stakes.length) continue;
    if (!c.extra && s && s.count > FUND_LIKE) { console.log(`${c.name}: ${s.count} holdings, a money manager; skipped`); continue; }
    if ((s?.total ?? 0) < MIN_TOTAL && !stakes.length) { console.log(`${c.name}: holdings too small to show; skipped`); continue; }
    const { unchanged, ...data } = s ?? {};
    out.push({ ...c, ...data, stakes });
    console.log(`${c.name}: ${s ? `${s.count} holdings, $${(s.total / 1e9).toFixed(2)}B (${s.period})${unchanged ? ", unchanged" : ""}` : "no 13F"}; ${stakes.length} 5%+ stake filing(s)`);
  } catch (e) { console.warn(`${c.name}: ${e.message}`); }
}

// Tickers for holdings, and for 5%+ stakes by CUSIP or SEC ID.
await addTickers(out.flatMap((c) => [c.top ?? [], c.new ?? [], c.added ?? [], c.reduced ?? [], c.sold ?? []]));
const tickers = await mainTickers();
for (const c of out) { c.ticker = tickers.get(c.cik) ?? c.ticker; for (const s of c.stakes) s.t = tickers.get(s.issuerCik) ?? null; }

await mkdir("data", { recursive: true });
await writeFile(SKIP, JSON.stringify(skip));
await mkdir("public/data", { recursive: true });
await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString(), companies: out.sort((a, b) => (b.total ?? 0) - (a.total ?? 0)) }));
console.log(`stakes.json: ${out.length} companies`);
