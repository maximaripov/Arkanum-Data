// Reads House Periodic Transaction Reports (STOCK Act). The Clerk publishes each e-filed
// report as a PDF; `pdftotext -layout` turns it into lines like
//   SP   Apple Inc. - Common Stock (AAPL)   S   09/22/2026 09/22/2026   $100,001 -
//        [ST]                                                          $250,000
// The two dates anchor each row: the type (P/S/E) is just before them and the amount
// just after; the following lines carry the rest of the name, ticker, asset code and the
// amount's upper bound. Scanned paper filings have no text and yield nothing.

const ROW = /^(.*?)\s(P|S|S \(partial\)|E)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(.*)$/;
// Labelled lines under a row: "F  S : New|Amended" (filing status), "S  O : UBS IRA Account"
// (subholding of: the account), "D : …" (description), "L : US" (location), "C : …" (comment).
const STATUS = /^\s*F\s+S\s*:\s*(.+?)\s*$/;
const ACCOUNT = /^\s*S\s+O\s*:\s*(.+?)\s*$/;
const LABEL = /^\s*(?:[A-Z](?:\s{2,}|\s)[A-Z]?\s*:|\*|[A-Z]\s*$|Digitally Signed|I CERTIFY)/; // "F  S : New", "D : …", section letters
const iso = (d) => { const [m, day, y] = d.split("/"); return `${y}-${m}-${day}`; };
// Most reports give a range; some members give the exact amount ("$710.52").
const money = (s) => { const m = String(s ?? "").match(/\$[\d,]+(?:\.\d+)?/g); return m ? m.map((x) => +x.replace(/[$,]/g, "")) : []; };

/** @returns {{ owner: string, account: string|null, amended: boolean, asset: string, ticker: string|null, assetType: string|null, type: "P"|"S"|"E", partial: boolean, date: string, notified: string, min: number|null, max: number|null }[]} */
export function parsePtr(text) {
  const lines = String(text).split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(ROW);
    if (!m) continue;
    let [, lead, type, date, notified, tail] = m;
    lead = lead.trim().replace(/^\d{6,}\s+/, ""); // some e-filers put their own transaction ID first
    const own = lead.match(/^(SP|JT|DC)\s+(.*)$/);
    const owner = own ? own[1] : "Self";
    let asset = own ? own[2] : lead;
    let amounts = money(tail), over = /over/i.test(tail);
    // Continuation lines: rest of the asset name, "(TICK) [ST]", amount upper bound.
    for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
      const l = lines[j];
      if (!l.trim() || ROW.test(l) || LABEL.test(l)) break;
      const amt = l.match(/\$[\d,]+(?:\.\d+)?\s*$/);
      if (amt && amounts.length === 1) { amounts = [...amounts, ...money(amt[0])]; }
      const txt = (amt ? l.slice(0, amt.index) : l).trim();
      if (txt) asset += " " + txt;
    }
    asset = asset.replace(/\s+/g, " ").trim();
    // The row's labelled lines run until the next row: two rows that look identical are often
    // the same stock bought in two accounts, and "Amended" marks a re-filed trade.
    let account = null, amended = false;
    for (let j = i + 1; j < Math.min(lines.length, i + 12) && !ROW.test(lines[j]); j++) {
      const st = lines[j].match(STATUS), ac = lines[j].match(ACCOUNT);
      if (st) amended = /amend/i.test(st[1]);
      if (ac) account = ac[1].replace(/\s+/g, " ");
    }
    const tick = [...asset.matchAll(/\(([A-Z][A-Z0-9.\-]{0,6})\)/g)].at(-1)?.[1] ?? null;
    const code = asset.match(/\[([A-Z]{2})\]/)?.[1] ?? null;
    const name = asset.replace(/\s*\[[A-Z]{2}\]\s*/g, " ").replace(/\s*\([A-Z][A-Z0-9.\-]{0,6}\)\s*/g, " ").replace(/\s+/g, " ").trim();
    out.push({
      owner, account, amended, asset: name, ticker: tick, assetType: code, type: type[0], partial: /partial/.test(type),
      date: iso(date), notified: iso(notified),
      min: amounts[0] ?? null, max: over ? null : amounts[1] ?? amounts[0] ?? null,
    });
  }
  return out;
}

/** "OH05" → { state: "OH", district: 5 } ("AL"/"00" at-large → 0). */
export const stateDistrict = (sd) => ({ state: String(sd).slice(0, 2), district: /^\d+$/.test(String(sd).slice(2)) ? +String(sd).slice(2) : 0 });

/** One copy per trade across reports. A trade can turn up in two reports: an amendment
 * ("Filing Status: Amended"), or a later report that lists earlier trades again. Rows in the
 * same report are separate lines and all stay (the same stock in two accounts, or two buys).
 * The earliest report keeps the trade, since that's when it became public; a later exact copy
 * is dropped and named in `refiled`; an amendment that changes the amount updates it
 * (`amendedIn`). A later report with more identical lines than the first keeps the surplus.
 * Only rows with a ticker are merged: generic names ("US Treasury Bill", "JP Morgan 3-year
 * auto callable buffer note") can be different instruments.
 * @template {{ doc: string, filed: string, member: string, ticker: string|null, asset: string, type: string, date: string, owner: string, min: number|null, max: number|null, account?: string|null, amended?: boolean }} T
 * @param {T[]} trades @returns {T[]} */
export function dedupeReports(trades) {
  const loose = (t) => [t.member, t.ticker || t.asset, t.type, t.date, t.owner, t.account ?? ""].join("|");
  const exact = (t) => `${loose(t)}|${t.min}|${t.max}`;
  const order = [...trades].sort((a, b) => a.filed.localeCompare(b.filed) || a.doc.localeCompare(b.doc));
  const kept = [], byExact = new Map(), byLoose = new Map();
  // Group each report's rows so "how many identical lines" is counted per report.
  const docs = new Map();
  for (const t of order) { if (!docs.has(t.doc)) docs.set(t.doc, []); docs.get(t.doc).push(t); }
  for (const rows of docs.values()) {
    const used = new Map(); // exact key -> earlier copies matched within this report
    for (const t of rows) {
      if (!t.ticker) { kept.push(t); continue; }
      const k = exact(t), prior = byExact.get(k) ?? [], n = used.get(k) ?? 0;
      const earlier = prior.filter((p) => p.doc !== t.doc);
      if (n < earlier.length) { used.set(k, n + 1); const p = earlier[n]; p.refiled = [...new Set([...(p.refiled ?? []), t.doc])]; continue; }
      if (t.amended) {
        const orig = (byLoose.get(loose(t)) ?? []).find((p) => p.doc !== t.doc && !p.amendedIn);
        if (orig) { orig.min = t.min; orig.max = t.max; orig.amendedIn = t.doc; continue; }
      }
      kept.push(t);
      byExact.set(k, [...prior, t]);
      byLoose.set(loose(t), [...(byLoose.get(loose(t)) ?? []), t]);
    }
  }
  return kept;
}
