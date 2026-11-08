// The company's own SEC 8-K filings: official announcements of earnings, executive
// changes, deals and other material events, translated into plain English. Public domain.
import { cikForTicker, secJson } from "./sec";

export type Announcement = { date: string; items: string[]; link: string };

const ITEMS: Record<string, string> = {
  "1.01": "Signed a material agreement", "1.02": "Ended a material agreement", "1.03": "Bankruptcy or receivership",
  "1.05": "Cybersecurity incident", "2.01": "Completed an acquisition or sale", "2.02": "Quarterly results",
  "2.03": "Took on new debt", "2.04": "Debt obligation accelerated", "2.05": "Restructuring or layoffs", "2.06": "Asset write-down",
  "3.01": "Listing rule notice or delisting", "3.02": "Sold unregistered shares", "3.03": "Shareholder rights changed",
  "4.01": "Changed auditor", "4.02": "Past financial statements can't be relied on", "5.01": "Change in control",
  "5.02": "Executive or board change", "5.03": "Amended charter or bylaws", "5.07": "Shareholder vote results",
  "7.01": "Investor presentation or update",
};

export async function announcements(symbol: string, limit = 10): Promise<Announcement[]> {
  const c = await cikForTicker(symbol);
  if (!c) return [];
  const sub = await secJson(`https://data.sec.gov/submissions/CIK${String(c.cik).padStart(10, "0")}.json`, 900);
  const r = sub.filings.recent;
  const out: Announcement[] = [];
  for (let i = 0; i < r.form.length && out.length < limit; i++) {
    if (r.form[i] !== "8-K") continue;
    // 9.01 is just the attached exhibits. 8.01 ("other events") says nothing about what happened,
    // so it is shown only when the filing has nothing more specific, and such filings are skipped.
    const codes = String(r.items[i] ?? "").split(",").map((s: string) => s.trim()).filter((s: string) => s && s !== "9.01" && s !== "8.01");
    if (!codes.length) continue;
    const items = codes.map((s: string) => ITEMS[s] ?? `Item ${s}`);
    // The same kind of announcement again within a week (a correction, a follow-up) is one entry.
    const prev = out.at(-1);
    if (prev && Math.abs(Date.parse(prev.date) - Date.parse(r.filingDate[i])) <= 7 * 86_400_000 && items.every((x: string) => prev.items.includes(x))) continue;
    out.push({
      date: r.filingDate[i],
      items,
      link: `https://www.sec.gov/Archives/edgar/data/${c.cik}/${r.accessionNumber[i].replace(/-/g, "")}/${r.primaryDocument[i]}`,
    });
  }
  return out;
}
