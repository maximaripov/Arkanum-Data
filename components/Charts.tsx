"use client";
// Foresight's own charts: a tiny trend line for cards, and an interactive line chart
// (drag or hover to read any day's value).
import { useEffect, useMemo, useRef, useState } from "react";

type Point = [string, number];

export function Spark({ points, color }: { points: Point[]; color: string }) {
  if (points.length < 2) return null;
  const vs = points.map((p) => p[1]), lo = Math.min(...vs), hi = Math.max(...vs), span = hi - lo || 1;
  const d = vs.map((v, i) => `${((i / (vs.length - 1)) * 100).toFixed(2)},${(28 - ((v - lo) / span) * 26).toFixed(2)}`).join(" ");
  return <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden><polyline points={d} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" /></svg>;
}

// long: "Oct 30, 2026"; short (axis labels): "Oct 2026"
const fmtDay = (d: string, long: boolean) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: long ? "numeric" : undefined, year: "numeric", timeZone: "UTC" });

export function LineChart({ points, fmt, color, height = 220, monthly = false }: { points: Point[]; fmt: (v: number) => string; color: string; height?: number; monthly?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 600));
    ro.observe(el); setW(el.clientWidth || 600);
    return () => ro.disconnect();
  }, []);
  useEffect(() => setHover(null), [points]);
  const g = useMemo(() => {
    const vs = points.map((p) => p[1]);
    let lo = Math.min(...vs), hi = Math.max(...vs);
    const pad = (hi - lo || Math.abs(hi) || 1) * 0.08; lo -= pad; hi += pad;
    const top = 8, bottom = height - 22;
    const x = (i: number) => (points.length < 2 ? w / 2 : (i / (points.length - 1)) * (w - 2) + 1);
    const y = (v: number) => bottom - ((v - lo) / (hi - lo)) * (bottom - top);
    const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[1]).toFixed(1)}`).join("");
    return { x, y, line, area: `${line}L${x(points.length - 1).toFixed(1)},${bottom}L${x(0).toFixed(1)},${bottom}Z`, lo, hi, bottom };
  }, [points, w, height]);
  if (points.length < 2) return <p className="muted">Not enough data to chart.</p>;
  const i = hover ?? points.length - 1;
  const pick = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(((clientX - r.left) / r.width) * (points.length - 1)))));
  };
  const gid = `g${color.replace(/\W/g, "")}`;
  return (
    <div className="linechart">
      <div className="lc-read"><strong className="mono">{fmt(points[i][1])}</strong> <span className="muted small">{fmtDay(points[i][0], !monthly)}</span></div>
      <div ref={box} className="lc-box" style={{ height }}
        onPointerMove={(e) => pick(e.clientX)} onPointerDown={(e) => pick(e.clientX)} onPointerLeave={() => setHover(null)}>
        <svg width={w} height={height} role="img" aria-label="Chart">
          <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".25" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
          {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={w} y1={8 + (g.bottom - 8) * f} y2={8 + (g.bottom - 8) * f} stroke="var(--line)" strokeDasharray="3 4" />)}
          <path d={g.area} fill={`url(#${gid})`} />
          <path d={g.line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
          {hover != null ? <>
            <line x1={g.x(i)} x2={g.x(i)} y1="4" y2={g.bottom} stroke="var(--muted)" strokeDasharray="2 3" />
            <circle cx={g.x(i)} cy={g.y(points[i][1])} r="4.5" fill={color} stroke="var(--card)" strokeWidth="2" />
          </> : null}
        </svg>
        <span className="lc-y top">{fmt(g.hi)}</span><span className="lc-y bot">{fmt(g.lo)}</span>
        <span className="lc-x left">{fmtDay(points[0][0], false)}</span><span className="lc-x right">{fmtDay(points.at(-1)![0], false)}</span>
      </div>
    </div>
  );
}
