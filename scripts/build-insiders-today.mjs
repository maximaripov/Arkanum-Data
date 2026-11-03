#!/usr/bin/env node
// Hourly: today's insider trades from SEC EDGAR's live feed of new Form 4 filings, so the
// site doesn't wait for the end-of-day index. Writes public/data/insiders-today.json
// (small; the 30-day insiders.json is rebuilt once a day) and lists the trades that are
// new since the last run in $NEW_TRADES_OUT for instant-alerts.mjs.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseForm4 } from "../lib/form4.mjs";
import { getText, getJson, pool, mergeFills, keepTrade } from "./lib/sec.mjs";
import { addHistory } from "./lib/history.mjs";

const OUT = "public/data/insiders-today.json";
const NEW_OUT = process.env.NEW_TRADES_OUT || join(tmpdir(), "form4-new-trades.json");
const MAX_PAGES = 25; // 100 entries each; every filing appears twice (issuer and insider)
const ymd = (d) => d.toISOString().slice(0, 10);

const main = await readFile("public/data/insiders.json", "utf8").then(JSON.parse).catch(() => ({ days: [] }));
let data = { updated: null, checked: [], trades: [] };
try { data = JSON.parse(await readFile(OUT, "utf8")); } catch {}

// Days the 30-day file now covers in full are dropped from here.
const covered = new Set(main.days);
const floor = ymd(new Date(Date.now() - 4 * 86_400_000));
const before = data.trades.length + data.checked.length;
data.trades = data.trades.filter((t) => !covered.has(t.filed) && t.filed >= floor);
data.checked = data.checked.filter(([, filed]) => !covered.has(filed) && filed >= floor);
const pruned = data.trades.length + data.checked.length !== before;
const seen = new Set(data.checked.map(([acc]) => acc));

// Newest filings first; stop at the first page that reaches ones already checked.
const fresh = [];
for (let page = 0; page < MAX_PAGES; page++) {
  const atom = await getText(`https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4&owner=include&count=100&start=${page * 100}&output=atom`);
  const entries = [...(atom ?? "").matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
  // The feed always lists recent filings; nothing at all on the first page means it broke.
  if (!entries.length) { if (page === 0) throw new Error("SEC's live Form 4 feed returned no filings"); break; }
  let reachedSeen = false;
  for (const e of entries) {
    if (!/\(Issuer\)/.test(e)) continue;
    const href = e.match(/href="[^"]*\/edgar\/data\/(\d+)\/\d+\/([\d-]+)-index\.htm"/);
    const filed = e.match(/Filed:(?:<\/b>|&lt;\/b&gt;)\s*([\d-]+)/)?.[1];
    if (!href || !filed) continue;
    if (seen.has(href[2])) { reachedSeen = true; continue; }
    if (filed < floor || covered.has(filed)) { reachedSeen = true; continue; }
    seen.add(href[2]);
    fresh.push({ cik: href[1], acc: href[2], filed });
  }
  if (reachedSeen) break;
}
console.log(`${fresh.length} new Form 4 filing(s)`);

const found = [];
await pool(fresh, 4, async ({ cik, acc, filed }) => {
  const folder = `https://www.sec.gov/Archives/edgar/data/${cik}/${acc.replace(/-/g, "")}`;
  const idx = await getJson(`${folder}/index.json`);
  const file = idx?.directory?.item?.map((i) => i.name).find((n) => n.endsWith(".xml"));
  const xml = file ? await getText(`${folder}/${file}`) : null;
  if (xml) found.push(...parseForm4(xml, { accession: acc, filed, url: `${folder}/${acc}-index.htm` }));
  data.checked.push([acc, filed]);
});

const known = new Set(data.trades.map((t) => t.accession + t.code));
const added = mergeFills(found).filter(keepTrade).filter((t) => !known.has(t.accession + t.code));
await addHistory(added);
await writeFile(NEW_OUT, JSON.stringify(added));
if (!fresh.length && !pruned) { console.log("Nothing new; files unchanged."); process.exit(0); } // no commit, no redeploy
data.trades.push(...added);
data.trades.sort((a, b) => b.filed.localeCompare(a.filed));
data.updated = new Date().toISOString();
await mkdir("public/data", { recursive: true });
await writeFile(OUT, JSON.stringify(data));
console.log(`insiders-today.json: ${data.trades.length} trades (${added.filter((t) => t.code === "P").length} new buys, ${added.filter((t) => t.code === "S").length} new large sales)`);
