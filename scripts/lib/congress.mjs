// Reads House Periodic Transaction Reports (STOCK Act). The Clerk publishes each e-filed
// report as a PDF; `pdftotext -layout` turns it into lines like
//   SP   Apple Inc. - Common Stock (AAPL)   S   09/22/2026 09/22/2026   $100,001 -
//        [ST]                                                          $250,000
// The two dates anchor each row: the type (P/S/E) is just before them and the amount
// just after; the following lines carry the rest of the name, ticker, asset code and the
// amount's upper bound. Scanned paper filings have no text and yield nothing.

const ROW = /^(.*?)\s(P|S|S \(partial\)|E)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(.*)$/;
const LABEL = /^\s*(?:[A-Z](?:\s{2,}|\s)[A-Z]?\s*:|\*|[A-Z]\s*$|Digitally Signed|I CERTIFY)/; // "F  S : New", "D : …", section letters
const iso = (d) => { const [m, day, y] = d.split("/"); return `${y}-${m}-${day}`; };
// Most reports give a range; some members give the exact amount ("$710.52").
const money = (s) => { const m = String(s ?? "").match(/\$[\d,]+(?:\.\d+)?/g); return m ? m.map((x) => +x.replace(/[$,]/g, "")) : []; };

/** @returns {{ owner: string, asset: string, ticker: string|null, assetType: string|null, type: "P"|"S"|"E", partial: boolean, date: string, notified: string, min: number|null, max: number|null }[]} */
export function parsePtr(text) {
  const lines = String(text).split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(ROW);
    if (!m) continue;
    let [, lead, type, date, notified, tail] = m;
    lead = lead.trim();
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
    const tick = [...asset.matchAll(/\(([A-Z][A-Z0-9.\-]{0,6})\)/g)].at(-1)?.[1] ?? null;
    const code = asset.match(/\[([A-Z]{2})\]/)?.[1] ?? null;
    const name = asset.replace(/\s*\[[A-Z]{2}\]\s*/g, " ").replace(/\s*\([A-Z][A-Z0-9.\-]{0,6}\)\s*/g, " ").replace(/\s+/g, " ").trim();
    out.push({
      owner, asset: name, ticker: tick, assetType: code, type: type[0], partial: /partial/.test(type),
      date: iso(date), notified: iso(notified),
      min: amounts[0] ?? null, max: over ? null : amounts[1] ?? amounts[0] ?? null,
    });
  }
  return out;
}

/** "OH05" → { state: "OH", district: 5 } ("AL"/"00" at-large → 0). */
export const stateDistrict = (sd) => ({ state: String(sd).slice(0, 2), district: /^\d+$/.test(String(sd).slice(2)) ? +String(sd).slice(2) : 0 });
