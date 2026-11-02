// Retail order flow (FINRA). Retail brokers (Robinhood, Schwab, Fidelity…) route most
// customer orders to a few wholesalers that fill them off-exchange; FINRA publishes each
// firm's weekly volume per stock with a 2–4 week delay. It shows how much retail-type
// trading happened, not whether it was buying or selling.
//
// FINRA's terms allow showing this data to end users for non-commercial use, with FINRA
// credited as the source and no further redistribution by those users.
const WHOLESALERS = [/CITADEL SECURITIES/i, /VIRTU AMERICAS/i, /G1 EXECUTION/i, /JANE STREET/i, /TWO SIGMA SECURITIES/i, /HRT FINANCIAL/i];

export type RetailFlow = { week: string; shares: number; trades: number; avgTradeSize: number; offExchangeShares: number; wholesalerSharePct: number | null }[];

async function finraWeek(symbol: string, week: string) {
  for (const tier of ["T1", "T2"]) {
    try {
      const r = await fetch("https://api.finra.org/data/group/otcMarket/name/weeklySummary", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "Foresight personal app" },
        body: JSON.stringify({ limit: 500, compareFilters: [
          { compareType: "equal", fieldName: "weekStartDate", fieldValue: week },
          { compareType: "equal", fieldName: "tierIdentifier", fieldValue: tier },
          { compareType: "equal", fieldName: "issueSymbolIdentifier", fieldValue: symbol },
        ] }),
        next: { revalidate: 43200 },
        signal: AbortSignal.timeout(15_000),
      });
      if (!r.ok) continue;
      const rows = await r.json();
      if (Array.isArray(rows) && rows.length) return rows;
    } catch {}
  }
  return null;
}

export async function retailFlow(symbol: string): Promise<RetailFlow | null> {
  if (/[=^]|-USD$/.test(symbol)) return null;
  // Weeks start on Monday; try the last 8 and keep the 4 newest FINRA has published.
  const mondays: string[] = [];
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) - 7);
  for (let i = 0; i < 8; i++) { mondays.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() - 7); }
  const weeks = (await Promise.all(mondays.map(async (w) => ({ w, rows: await finraWeek(symbol, w) })))).filter((x) => x.rows).slice(0, 4);
  if (!weeks.length) return null;
  return weeks.map(({ w, rows }) => {
    const ws = rows!.filter((r: any) => r.summaryTypeCode === "OTC_W_SMBL_FIRM" && WHOLESALERS.some((re) => re.test(r.marketParticipantName ?? "")));
    const shares = ws.reduce((a: number, r: any) => a + (r.totalWeeklyShareQuantity ?? 0), 0);
    const trades = ws.reduce((a: number, r: any) => a + (r.totalWeeklyTradeCount ?? 0), 0);
    // All off-exchange (non-ATS) volume in the stock that week, from the same FINRA data.
    const offEx = rows!.find((r: any) => r.summaryTypeCode === "OTC_W_SMBL")?.totalWeeklyShareQuantity ?? 0;
    return { week: w, shares: Math.round(shares), trades, avgTradeSize: trades ? Math.round(shares / trades) : 0, offExchangeShares: Math.round(offEx), wholesalerSharePct: offEx ? (shares / offEx) * 100 : null };
  });
}
