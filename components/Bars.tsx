"use client";
// Bar charts drawn by Arkanum. HBars: ranked rows (label, bar, amount), optionally links.
// VBars: one column per day; tap a column to select it.
import { useState } from "react";
import Link from "next/link";

export type HRow = { key: string; label: React.ReactNode; sub?: React.ReactNode; value: number; text: string; href?: string; tone?: "up" | "down" };

export function HBars({ rows, max }: { rows: HRow[]; max?: number }) {
  const top = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="hbars">{rows.map((r) => {
      const inner = (
        <>
          <div className="hb-text"><span className="hb-label">{r.label}</span>{r.sub ? <span className="hb-sub muted small">{r.sub}</span> : null}</div>
          <div className="hb-track"><div className={`hb-fill ${r.tone ?? "up"}`} style={{ width: `${Math.max(2, (r.value / top) * 100)}%` }} /></div>
          <div className={`hb-value mono ${r.tone ?? "up"}`}>{r.text}</div>
        </>
      );
      return <li key={r.key}>{r.href ? <Link href={r.href} className="hb-row">{inner}</Link> : <div className="hb-row">{inner}</div>}</li>;
    })}</ul>
  );
}

export type VCol = { key: string; label: string; value: number; detail: string };

export function VBars({ cols, selected, onPick, height = 150 }: { cols: VCol[]; selected?: string | null; onPick?: (k: string | null) => void; height?: number }) {
  const [hover, setHover] = useState<string | null>(null);
  const top = Math.max(...cols.map((c) => c.value), 1);
  const show = cols.find((c) => c.key === (hover ?? selected)) ?? null;
  const every = Math.ceil(cols.length / 6);
  return (
    <div className="vbars">
      <div className="vb-read small">{show ? <><strong>{show.label}</strong> · {show.detail}</> : <span className="muted">Tap a bar to see that day&apos;s trades</span>}</div>
      {/* Each bar is at least 24px wide so it is easy to tap; a long run scrolls sideways. */}
      <div className="vb-scroll"><div className="vb-inner" style={{ minWidth: cols.length * 27 }}>
      <div className="vb-cols" style={{ height }} onPointerLeave={() => setHover(null)}>
        {cols.map((c) => (
          <button key={c.key} className={`vb-col${c.key === selected ? " on" : ""}${selected && c.key !== selected ? " dim" : ""}`}
            onPointerEnter={(e) => e.pointerType === "mouse" && setHover(c.key)}
            onClick={() => onPick?.(c.key === selected ? null : c.key)} aria-label={`${c.label}: ${c.detail}`} aria-pressed={c.key === selected}>
            <span className="vb-bar" style={{ height: c.value ? `${Math.max(3, (c.value / top) * 100)}%` : "2px" }} />
          </button>
        ))}
      </div>
      <div className="vb-axis">{cols.map((c, i) => <span key={c.key}>{i % every === 0 ? c.label : ""}</span>)}</div>
      </div></div>
    </div>
  );
}
