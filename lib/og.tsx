// The picture shown when a stock, insider or Congress member page is shared: the page's
// name, a few numbers and its latest trades, in the site's dark colors. Rendered by
// next/og (flexbox only: every element with more than one child needs display:flex).
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
const C = { bg: "#000000", card: "#0c0c0c", line: "#2b2b2b", text: "#e9e9e9", muted: "#8c8c8c", up: "#3ddc84", down: "#ff5f56", r: "#f87171", d: "#60a5fa" };
export type Tone = "up" | "down" | "r" | "d" | undefined;
const tint = (t: Tone) => (t ? C[t] : C.text);

export const Logo = ({ size = 52 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100"><path d="M71.5 47.5A27 27 0 1 1 57 30.8" fill="none" stroke="#e9e9e9" strokeWidth="12" strokeLinecap="round" /><circle cx="78" cy="22" r="9" fill="#e9e9e9" /></svg>
);

export type OgStat = { label: string; value: string; tone?: Tone };
export type OgRow = { side: "BUY" | "SELL"; text: string; amount: string; when: string };

export function ogImage({ section, title, subtitle, tag, stats = [], rows = [], empty }: {
  section: string; title: string; subtitle?: string; tag?: { text: string; tone?: Tone }; stats?: OgStat[]; rows?: OgRow[]; empty?: string;
}) {
  const titleSize = title.length > 34 ? 50 : title.length > 22 ? 60 : 72;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.bg, color: C.text, padding: "40px 64px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 700 }}>
          <Logo size={44} />
          <span>arkanum</span>
          <span style={{ color: C.muted, fontWeight: 400 }}>· {section}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 24 }}>
          <span style={{ fontSize: titleSize, fontWeight: 800, lineHeight: 1.05 }}>{title}</span>
          {tag ? <span style={{ fontSize: 30, fontWeight: 700, color: tint(tag.tone), border: `2px solid ${tint(tag.tone)}`, borderRadius: 0, padding: "4px 14px" }}>{tag.text}</span> : null}
        </div>
        {subtitle ? <div style={{ fontSize: 30, color: C.muted, marginTop: 10, display: "flex" }}>{subtitle}</div> : null}
        {stats.length ? (
          <div style={{ display: "flex", gap: 20, marginTop: 24 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column", flex: 1, background: C.card, border: `1px solid ${C.line}`, borderRadius: 0, padding: "14px 24px" }}>
                <span style={{ fontSize: 20, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</span>
                <span style={{ fontSize: 42, fontWeight: 800, color: tint(s.tone), marginTop: 4 }}>{s.value}</span>
              </div>
            ))}
          </div>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 22, gap: 10, flex: 1 }}>
          {rows.length ? rows.slice(0, 3).map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 26 }}>
              <span style={{ width: 88, display: "flex", justifyContent: "center", fontWeight: 800, fontSize: 22, color: r.side === "BUY" ? C.up : C.down, border: `2px solid ${r.side === "BUY" ? C.up : C.down}`, borderRadius: 0, padding: "2px 0" }}>{r.side}</span>
              <span style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{r.text}</span>
              <span style={{ fontWeight: 700 }}>{r.amount}</span>
              <span style={{ color: C.muted, width: 170, textAlign: "right" }}>{r.when}</span>
            </div>
          )) : empty ? <div style={{ display: "flex", fontSize: 27, color: C.muted }}>{empty}</div> : null}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: C.muted }}>
          <span>From official filings · free, no account</span>
          <span>form4-insiders.vercel.app</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}

/** "Oct 8" this year, "Oct 8, 2025" otherwise. */
export const ogDay = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.slice(0, 4) === String(new Date().getUTCFullYear()) ? undefined : "numeric", timeZone: "UTC" });
