// Share picture for an insider page: the person, their role, what they bought and sold in
// their latest filings, and the latest three trades.
import { insiderTradesByOwner } from "@/lib/sec";
import { companyName, personName, roleLabel } from "@/lib/people.mjs";
import { fmtBig } from "@/lib/format";
import { ogImage, ogDay, OG_SIZE } from "@/lib/og";

export const revalidate = 21600;
export const alt = "This insider's latest trades on Form4";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ cik: string }> }) {
  const { cik } = await params;
  const r = await insiderTradesByOwner(cik).catch(() => null);
  const trades = r?.trades ?? [];
  const name = personName(r?.name || trades[0]?.owner || "Insider");
  const market = trades.filter((t) => (t.code === "P" || t.code === "S") && t.value);
  const sum = (code: string) => market.filter((t) => t.code === code).reduce((a, t) => a + (t.value ?? 0), 0);
  const latest = trades[0];
  const others = new Set(trades.map((t) => t.symbol)).size - 1;
  const since = trades.length ? ogDay(trades.at(-1)!.date) : null;
  return ogImage({
    section: "Insider",
    title: name,
    subtitle: latest ? `${roleLabel(latest.role)}, ${companyName(latest.issuer, latest.symbol)} (${latest.symbol})${others > 0 ? ` and ${others} more` : ""}` : undefined,
    stats: since ? [
      { label: `Bought since ${since}`, value: sum("P") ? `$${fmtBig(sum("P"))}` : "None", tone: sum("P") ? "up" : undefined },
      { label: `Sold since ${since}`, value: sum("S") ? `$${fmtBig(sum("S"))}` : "None", tone: sum("S") ? "down" : undefined },
    ] : [],
    rows: market.slice(0, 3).map((t) => ({ side: t.code === "P" ? "BUY" : "SELL", text: `${t.symbol} · ${companyName(t.issuer, t.symbol)}`, amount: `$${fmtBig(t.value)}`, when: ogDay(t.date) })),
    empty: "Trades reported to the SEC on Form 4",
  });
}
