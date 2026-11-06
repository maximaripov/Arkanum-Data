// The picture shown when an Arkanum link is shared (messages, X, Reddit, Slack…).
import { ImageResponse } from "next/og";

export const alt = "Arkanum: what insiders are buying";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BARS = [38, 62, 30, 88, 52, 120, 70, 44, 96, 150, 82, 64];

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#000000", color: "#e9e9e9", padding: "70px 80px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40, fontWeight: 700, color: "#e9e9e9" }}>
            <svg width={52} height={52} viewBox="0 0 100 100"><path d="M71.5 47.5A27 27 0 1 1 57 30.8" fill="none" stroke="#e9e9e9" strokeWidth="12" strokeLinecap="round" /><circle cx="78" cy="22" r="9" fill="#e9e9e9" /></svg>
            arkanum
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, maxWidth: 640 }}>What insiders are buying</div>
            <div style={{ fontSize: 30, color: "#8c8c8c", maxWidth: 620, lineHeight: 1.35 }}>Executives, directors and big funds, from official SEC filings, in plain English.</div>
          </div>
          <div style={{ fontSize: 24, color: "#8c8c8c" }}>Free · no account · form4-insiders.vercel.app</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: "100%", paddingBottom: 10 }}>
          {BARS.map((h, i) => <div key={i} style={{ width: 22, height: h * 2.6, background: "#3ddc84", opacity: 0.55 + (i / BARS.length) * 0.45 }} />)}
        </div>
      </div>
    ),
    size,
  );
}
