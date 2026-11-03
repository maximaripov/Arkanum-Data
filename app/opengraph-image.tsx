// The picture shown when a Form4 link is shared (messages, X, Reddit, Slack…).
import { ImageResponse } from "next/og";

export const alt = "Form4: what insiders are buying";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BARS = [38, 62, 30, 88, 52, 120, 70, 44, 96, 150, 82, 64];

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0b0e14", color: "#e6e9ef", padding: "70px 80px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40, fontWeight: 700, color: "#e6e9ef" }}>
            <svg width="52" height="52" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#0a0a0a" /><path d="M31 24H21v52h10M69 24h10v52H69" fill="none" stroke="#a3e635" strokeWidth="6.5" /><path d="M56 75V26L35 58h29" fill="none" stroke="#a3e635" strokeWidth="7.5" strokeLinejoin="miter" strokeMiterlimit="3" /></svg>
            Form4
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, maxWidth: 640 }}>What insiders are buying</div>
            <div style={{ fontSize: 30, color: "#8a93a6", maxWidth: 620, lineHeight: 1.35 }}>Executives, directors and big funds, from official SEC filings, in plain English.</div>
          </div>
          <div style={{ fontSize: 24, color: "#8a93a6" }}>Free · no account · form4-insiders.vercel.app</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: "100%", paddingBottom: 10 }}>
          {BARS.map((h, i) => <div key={i} style={{ width: 22, height: h * 2.6, background: "#a3e635", borderRadius: "6px 6px 0 0", opacity: 0.55 + (i / BARS.length) * 0.45 }} />)}
        </div>
      </div>
    ),
    size,
  );
}
