// SEC's quarterly Insider Transactions Data Sets: every Form 3/4/5 of a quarter as TSV files
// in a zip (SUBMISSION, REPORTINGOWNER, NONDERIV_TRANS, ...). Shared by the backtest and the
// insider-directory backfill. Needs `unzip` and a User-Agent with contact details.
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** "2024q3" ⇄ a running quarter number, and every quarter from `from` to `to`. */
export const qNum = (s) => { const [y, n] = s.toLowerCase().split("q"); return +y * 4 + (+n - 1); };
export const qName = (n) => `${Math.floor(n / 4)}q${(n % 4) + 1}`;
export const quarterRange = (from, to) => { const out = []; for (let n = qNum(from); n <= qNum(to); n++) out.push(qName(n)); return out; };

/** One TSV file from the zip: header, column lookup and rows. */
export function tsv(zip, file) {
  const text = execFileSync("unzip", ["-p", zip, file], { maxBuffer: 1 << 30, encoding: "latin1" });
  const lines = text.split(/\r?\n/);
  const head = lines[0].split("\t").map((h) => h.trim().toUpperCase());
  const col = (name) => head.indexOf(name);
  return { head, col, rows: lines.slice(1).filter(Boolean).map((l) => l.split("\t")) };
}

const MON = { JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06", JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12" };
/** "05-NOV-2026" or "2026-11-05..." -> "2026-11-05". */
export function isoDate(s) {
  s = (s ?? "").trim();
  let m = s.match(/^(\d{1,2})-([A-Z]{3})-(\d{4})/i); if (m) return `${m[3]}-${MON[m[2].toUpperCase()]}-${m[1].padStart(2, "0")}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}
export const truthy = (v) => /^(1|true|y|yes)$/i.test(String(v ?? "").trim());

/** Role string in the site's format: "<officer title>, Director, 10% owner". */
export function roleOf(rel, title) {
  const r = String(rel ?? "").toLowerCase(), parts = [];
  if (r.includes("officer")) parts.push((title ?? "").trim() || "Officer");
  if (r.includes("director")) parts.push("Director");
  if (r.includes("ten") || r.includes("10")) parts.push("10% owner");
  if (!parts.length && r.includes("other")) parts.push("Other");
  return parts.join(", ");
}

/** The quarter's zip (downloaded into `tmp`, or found in `local`); null if not published yet. */
export async function getZip(quarter, { tmp, local = null, ua }) {
  const file = local ? `${local}/${quarter}.zip` : `${tmp}/${quarter}.zip`;
  if (existsSync(file)) return file;
  if (local) return null; // a local set has only the quarters it has
  const url = `https://www.sec.gov/files/structureddata/data/insider-transactions-data-sets/${quarter}_form345.zip`;
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { "User-Agent": ua } });
    if (r.ok) {
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.subarray(0, 2).toString() !== "PK") throw new Error(`${quarter}: not a zip (SEC refused? check SEC_USER_AGENT)`);
      await writeFile(file, buf); return file;
    }
    if (r.status === 404) return null;
    await sleep(2000 * (i + 1));
  }
  throw new Error(`${quarter}: download failed`);
}
