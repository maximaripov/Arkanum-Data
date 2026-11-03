// Share picture for a stock page: ticker, company, and last-30-days insider activity.
import { ImageResponse } from "next/og";
import { cikForTicker } from "@/lib/sec";
import type { InsiderTrade } from "@/lib/sec";
import { isExecOrDirector } from "@/lib/insider";
import { fmtBig } from "@/lib/format";

export const alt = "Insider trades on Form4";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

const titleCase = (s: string) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());

export default async function Image({ params }: { params: Promise<{ symbol: string }> }) {
  const symbol = decodeURIComponent((await params).symbol).toUpperCase();
  const [co, ins] = await Promise.all([
    cikForTicker(symbol).catch(() => null),
    fetch("https://form4-insiders.vercel.app/data/insiders.json", { next: { revalidate: 3600 } }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  const mine = ((ins?.trades ?? []) as InsiderTrade[]).filter((t) => t.symbol === symbol && isExecOrDirector(t));
  const sum = (code: string) => mine.filter((t) => t.code === code).reduce((a, t) => a + (t.value ?? 0), 0);
  const bought = sum("P"), sold = sum("S");
  const buyers = new Set(mine.filter((t) => t.code === "P").map((t) => t.owner)).size;
  const max = Math.max(bought, sold, 1);
  const name = co?.name ? titleCase(co.name) : "";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0b0e14", color: "#e6e9ef", padding: "64px 80px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32, fontWeight: 700, color: "#4ade80" }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, border: "4px solid #4ade80", display: "flex", overflow: "hidden" }}><div style={{ width: "50%", background: "#4ade80" }} /></div>
          Form4
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 110, fontWeight: 800, lineHeight: 1 }}>{symbol}</div>
          <div style={{ fontSize: 40, color: "#8a93a6", maxWidth: 1000, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{name}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 28, color: "#8a93a6" }}>Executives &amp; directors, last 30 days</div>
          {bought || sold ? (
            [["Bought", bought, "#22c55e", buyers ? ` · ${buyers} ${buyers === 1 ? "insider" : "insiders"}` : ""], ["Sold", sold, "#ef4444", ""]].map(([label, v, color, extra]) => (
              <div key={label as string} style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <div style={{ width: 120, fontSize: 32 }}>{label as string}</div>
                <div style={{ display: "flex", width: 540, height: 34, background: "#1a202b", borderRadius: 17 }}>{v ? <div style={{ width: `${Math.max(3, ((v as number) / max) * 100)}%`, background: color as string, borderRadius: 17 }} /> : null}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 34, fontWeight: 700, color: v ? (color as string) : "#8a93a6", whiteSpace: "nowrap" }}>{v ? `$${fmtBig(v as number)}` : "None"}<span style={{ fontSize: 26, color: "#8a93a6", fontWeight: 400 }}>{extra as string}</span></div>
              </div>
            ))
          ) : <div style={{ fontSize: 36 }}>No insider buys or large sales in the last 30 days</div>}
        </div>
      </div>
    ),
    size,
  );
}
