// PROTOTYPE (not part of the site): how did stocks do after insiders bought?
// Inputs, all public SEC data:
//   - SEC "Insider Transactions Data Sets" (every Form 4, one zip per quarter)
//   - Geode's and State Street's quarterly 13Fs (index managers holding nearly every
//     US stock): value ÷ shares = each stock's quarter-end price
// Method: entry = quarter-end right after the buy; exits = the next two quarter-ends
// (~3 and ~6 months later). The baseline is every stock Vanguard holds over the same
// windows, so the comparison is apples to apples. Companies are matched by ticker
// (13F CUSIPs → tickers via the free OpenFIGI lookup).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { conviction, buyersBySymbol, roleKind } from "../lib/conviction.mjs";

const UA = process.env.SEC_USER_AGENT || "Form4 (set SEC_USER_AGENT)";
const DIR = new URL("./cache/", import.meta.url).pathname;
await mkdir(DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, file, bin = false) {
  const path = DIR + file;
  if (existsSync(path)) return bin ? path : readFile(path, "utf8");
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (r.ok) { const b = Buffer.from(await r.arrayBuffer()); await writeFile(path, b); await sleep(200); return bin ? path : b.toString("utf8"); }
    console.warn(url, r.status); await sleep(5000 * (i + 1));
  }
  throw new Error("failed " + url);
}

// ---- 1. Quarter-end prices from big index managers' 13Fs ------------------------------
const QE = ["2025-03-31", "2025-06-30", "2025-09-30", "2025-12-31", "2026-03-31", "2026-06-30", "2026-09-30"];
const FILERS = [["1214717", "Geode"], ["93751", "StateStreet"]];
const lots = {}; // quarter-end → CUSIP → [prices]
for (const [cik, label] of FILERS) {
  const sub = JSON.parse(await get(`https://data.sec.gov/submissions/CIK${cik.padStart(10, "0")}.json`, `${label}-sub.json`));
  const r = sub.filings.recent;
  const done = new Set();
  for (let i = 0; i < r.form.length; i++) {
    if (r.form[i] !== "13F-HR" || !QE.includes(r.reportDate[i]) || done.has(r.reportDate[i])) continue;
    done.add(r.reportDate[i]);
    const acc = r.accessionNumber[i], folder = `https://www.sec.gov/Archives/edgar/data/${cik}/${acc.replace(/-/g, "")}`;
    const idx = JSON.parse(await get(`${folder}/index.json`, `${label}-${acc}-idx.json`));
    const xmls = idx.directory.item.map((x) => x.name).filter((n) => /\.xml$/i.test(n) && !/primary_doc/i.test(n));
    let n = 0;
    for (const file of xmls) {
      const xml = await get(`${folder}/${file}`, `${label}-${acc}-${file}`);
      for (const m of xml.matchAll(/<(?:\w+:)?infoTable>([\s\S]*?)<\/(?:\w+:)?infoTable>/g)) {
        const t = m[1], f = (tag) => t.match(new RegExp(`<(?:\\w+:)?${tag}>([^<]*)<`))?.[1]?.trim();
        if (f("putCall") || (f("sshPrnamtType") ?? "SH") !== "SH") continue;
        const cusip = f("cusip")?.toUpperCase(), value = +f("value"), sh = +f("sshPrnamt");
        if (!cusip || !(value > 0) || !(sh > 0)) continue;
        ((lots[r.reportDate[i]] ??= {})[cusip] ??= []).push(value / sh); n++;
      }
    }
    console.log(`13F ${label} ${r.reportDate[i]}: ${n} positions`);
  }
}
const prices = Object.fromEntries(Object.entries(lots).map(([q, m]) => [q, Object.fromEntries(Object.entries(m).map(([c, v]) => [c, v.sort((a, b) => a - b)[v.length >> 1]]))]));
const quarters = QE.filter((q) => prices[q]);
console.log("quarter-ends with prices:", quarters.join(", "));

// CUSIP → ticker: the repo's cache first, then OpenFIGI (free: 25 requests/minute, 10 per request).
const cusipTicker = JSON.parse(await readFile(new URL("../data/cusip.json", import.meta.url), "utf8").catch(() => "{}"));
const need = [...new Set(Object.values(prices).flatMap((m) => Object.keys(m)))].filter((c) => !(c in cusipTicker));
console.log(`OpenFIGI lookups needed: ${need.length}`);
for (let i = 0; i < need.length; i += 10) {
  const batch = need.slice(i, i + 10);
  const r = await fetch("https://api.openfigi.com/v3/mapping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(batch.map((c) => ({ idType: "ID_CUSIP", idValue: c, exchCode: "US" }))) });
  if (r.status === 429) { await sleep(61_000); i -= 10; continue; }
  const out = r.ok ? await r.json() : [];
  batch.forEach((c, k) => { cusipTicker[c] = out[k]?.data?.[0]?.ticker?.replace("/", "-") ?? null; });
  await sleep(2600);
}
const tickerCusips = new Map();
for (const [c, t] of Object.entries(cusipTicker)) if (t) { if (!tickerCusips.has(t)) tickerCusips.set(t, []); tickerCusips.get(t).push(c); }

// ---- 2. Insider buys from the SEC's quarterly Form 4 data sets ---------------------------
function tsv(text) {
  const [head, ...rows] = text.split(/\r?\n/).filter(Boolean);
  const h = head.split("\t");
  return rows.map((l) => { const c = l.split("\t"); return Object.fromEntries(h.map((k, i) => [k, c[i] ?? ""])); });
}
const unzip = (zip, name) => execFileSync("unzip", ["-p", zip, name], { maxBuffer: 2e9 }).toString("utf8");
const buys = [];
for (const q of ["2025q1", "2025q2", "2025q3", "2025q4", "2026q1", "2026q2"]) {
  let zip;
  try { zip = await get(`https://www.sec.gov/files/structureddata/data/insider-transactions-data-sets/${q}_form345.zip`, `${q}_form345.zip`, true); }
  catch { console.warn(`no data set for ${q}`); continue; }
  const subm = new Map(tsv(unzip(zip, "SUBMISSION.tsv")).map((s) => [s.ACCESSION_NUMBER, s]));
  const owners = new Map();
  for (const o of tsv(unzip(zip, "REPORTINGOWNER.tsv"))) if (!owners.has(o.ACCESSION_NUMBER)) owners.set(o.ACCESSION_NUMBER, o);
  const by = new Map();
  for (const t of tsv(unzip(zip, "NONDERIV_TRANS.tsv"))) {
    if (t.TRANS_CODE !== "P") continue;
    const s = subm.get(t.ACCESSION_NUMBER), o = owners.get(t.ACCESSION_NUMBER);
    if (!s || !o || s.DOCUMENT_TYPE !== "4") continue;
    const shares = +t.TRANS_SHARES, price = +t.TRANS_PRICEPERSHARE;
    if (!(shares > 0) || !(price > 0)) continue;
    const rel = o.RPTOWNER_RELATIONSHIP ?? "";
    const role = [o.RPTOWNER_TITLE || (/Officer/i.test(rel) ? "Officer" : ""), /Director/i.test(rel) ? "Director" : "", /TenPercentOwner/i.test(rel) ? "10% owner" : ""].filter(Boolean).join(", ") || "Other";
    const k = t.ACCESSION_NUMBER;
    const m = by.get(k) ?? { accession: k, code: "P", symbol: (s.ISSUERTRADINGSYMBOL || "").toUpperCase().split(/[,;\s]+/)[0], issuer: s.ISSUERNAME, issuerCik: s.ISSUERCIK, owner: o.RPTOWNERNAME, ownerCik: o.RPTOWNERCIK, role, date: "", filed: s.FILING_DATE, shares: 0, value: 0, ownedAfter: null, planned: /1|true/i.test(s.AFF10B5ONE ?? "") };
    m.shares += shares; m.value += shares * price;
    const d = new Date(t.TRANS_DATE).toISOString().slice(0, 10);
    if (d > m.date) m.date = d;
    m.ownedAfter = +t.SHRS_OWND_FOLWNG_TRANS || m.ownedAfter;
    by.set(k, m);
  }
  for (const m of by.values()) { m.price = m.value / m.shares; buys.push(m); }
  console.log(`${q}: ${by.size} insider buys`);
}

// ---- 3. Match each insider buy's ticker to a CUSIP with prices --------------------------
const cusipFor = (sym) => { const c = (tickerCusips.get(sym) ?? []).filter((x) => quarters.some((q) => prices[q][x])); return c[0] ?? null; };

// ---- 4. Score and measure ----------------------------------------------------------------
const nextQE = (d) => quarters.find((q) => q >= d);
const exec = buys.filter((t) => roleKind(t.role) !== "owner" && t.symbol);
const rows = [];
for (const t of exec) {
  const window = exec.filter((x) => x.symbol === t.symbol && Math.abs(Date.parse(x.date) - Date.parse(t.date)) < 30 * 86_400_000);
  const c = conviction(t, { insiders: buyersBySymbol(window).get(t.symbol) ?? 1 });
  const cusip = cusipFor(t.symbol);
  const q0 = nextQE(t.date), i0 = quarters.indexOf(q0);
  if (!cusip || i0 < 0) { rows.push({ ...t, conv: c, matched: !!cusip }); continue; }
  const px = (i) => prices[quarters[i]]?.[cusip];
  const e = px(i0), r3 = px(i0 + 1) && e ? px(i0 + 1) / e - 1 : null, r6 = px(i0 + 2) && e ? px(i0 + 2) / e - 1 : null;
  // Sanity: a 13F price wildly off the insider's own price means a bad name match.
  const sane = e && t.price / e < 3 && e / t.price < 3;
  rows.push({ ...t, conv: c, matched: sane, q0, r3: sane ? r3 : null, r6: sane ? r6 : null });
}
// Baseline: every Vanguard holding over each window.
const base = {};
for (let i = 0; i + 1 < quarters.length; i++) for (const k of [1, 2]) {
  if (!quarters[i + k]) continue;
  const a = prices[quarters[i]], b = prices[quarters[i + k]];
  const rr = Object.keys(a).filter((c) => b[c]).map((c) => b[c] / a[c] - 1).filter((x) => x > -0.95 && x < 10).sort((x, y) => x - y);
  base[`${quarters[i]}|${k}`] = { median: rr[rr.length >> 1], mean: rr.reduce((s, x) => s + x, 0) / rr.length, n: rr.length };
}
const stats = (xs) => { const v = xs.filter((x) => x != null).sort((a, b) => a - b); if (!v.length) return null; const mean = v.reduce((s, x) => s + x, 0) / v.length; return { n: v.length, median: v[v.length >> 1], mean, beat: null }; };
const group = (f) => {
  const g = rows.filter((x) => x.matched && f(x));
  const out = {};
  for (const [k, key] of [["r3", 1], ["r6", 2]]) {
    const v = g.filter((x) => x[k] != null);
    const s = stats(v.map((x) => x[k]));
    if (!s) { out[k] = null; continue; }
    const vsBase = v.map((x) => x[k] - (base[`${x.q0}|${key}`]?.median ?? 0));
    const beat = v.filter((x) => x[k] > (base[`${x.q0}|${key}`]?.median ?? 0)).length / v.length;
    out[k] = { ...s, beat, excessMedian: stats(vsBase).median };
  }
  return { count: g.length, ...out };
};
const byQuarter = {};
for (const x of rows.filter((x) => x.matched && x.r3 != null)) {
  const g = (byQuarter[x.q0] ??= { strong: [], all: [] });
  const ex = x.r3 - (base[`${x.q0}|1`]?.median ?? 0);
  g.all.push(ex); if (x.conv?.tier === "strong") g.strong.push(ex);
}
const result = {
  byQuarter: Object.fromEntries(Object.entries(byQuarter).map(([q, g]) => [q, { strongN: g.strong.length, strongExcessMedian: stats(g.strong)?.median ?? null, allN: g.all.length, allExcessMedian: stats(g.all)?.median ?? null }])),
  quarters, totalBuys: buys.length, execBuys: exec.length, matched: rows.filter((x) => x.matched).length,
  tiers: { strong: group((x) => x.conv?.tier === "strong"), notable: group((x) => x.conv?.tier === "notable"), routine: group((x) => x.conv?.tier === "routine"), all: group(() => true) },
  base,
  examples: rows.filter((x) => x.matched && x.conv?.tier === "strong" && x.r6 != null).sort((a, b) => b.conv.score - a.conv.score).slice(0, 12)
    .map((x) => ({ symbol: x.symbol, issuer: x.issuer, owner: x.owner, role: x.role, date: x.date, value: Math.round(x.value), reasons: x.conv.reasons.map((r) => r.text), r3: x.r3, r6: x.r6 })),
};
await writeFile(new URL("./result.json", import.meta.url).pathname, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, base: undefined, examples: result.examples.length }, null, 2));
