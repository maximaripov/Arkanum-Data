// Is the US stock market open right now, and which trading day was the last one to finish?
// Uses the S&P 500's session hours from Yahoo, so holidays and early closes are handled.
const ny = (s: number) => new Date(s * 1000).toLocaleDateString("en-CA", { timeZone: "America/New_York" });

export type MarketStatus = { open: boolean; today: string; lastSession: string | null; closesAt: number | null };

export async function marketStatus(): Promise<MarketStatus> {
  const now = Date.now() / 1000;
  const today = ny(now);
  try {
    const r = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?range=5d&interval=1d", {
      headers: { "User-Agent": "Mozilla/5.0 (Foresight personal app)" },
      next: { revalidate: 60 },
    });
    const res = (await r.json()).chart.result[0];
    const reg = res.meta.currentTradingPeriod.regular as { start: number; end: number };
    const todayDone = ny(reg.start) === today && now >= reg.end;
    const sessions = (res.timestamp as number[]).map(ny).filter((d) => d < today || todayDone);
    return { open: now >= reg.start && now < reg.end, today, lastSession: sessions.at(-1) ?? null, closesAt: reg.end };
  } catch {
    return { open: false, today, lastSession: null, closesAt: null };
  }
}
