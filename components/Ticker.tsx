"use client";
// The band under the header: today's insider buys and large sales from the hourly file,
// newest first, with how long ago the data was refreshed. Hidden when there's nothing yet.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fmtBig } from "@/lib/format";
import { isExecOrDirector } from "@/lib/insider";
import { cleanTrades } from "@/lib/insiderMerge.mjs";
import type { InsiderTrade } from "@/lib/sec";

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  return m < 60 ? `${m} min ago` : m < 48 * 60 ? `${Math.round(m / 60)} h ago` : new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export function Ticker() {
  const [d, setD] = useState<{ updated: string; trades: InsiderTrade[] } | null>(null);
  // On phones there's no hover: a finger on the tape stops it, so a tap lands on the trade
  // under the finger. Sliding the finger moves the tape either way; a moment after the
  // finger lifts it rolls on from where it was left. A drag doesn't count as a tap.
  const [held, setHeld] = useState(false);
  const resume = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ x0: 0, base: 0, pos: 0, moved: false, on: false });
  useEffect(() => () => { if (resume.current) clearTimeout(resume.current); }, []);
  const still = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches; // the tape then just scrolls natively
  const half = () => (runRef.current?.scrollWidth ?? 0) / 2;
  // Keep the position inside one copy's width, so the loop stays seamless however far you drag.
  const wrap = (x: number) => { const h = half(); return h ? (((x % h) - h) % h) : x; };
  const onStart = (e: React.TouchEvent) => {
    if (resume.current) clearTimeout(resume.current);
    setHeld(true);
    const run = runRef.current;
    if (!run || still()) return;
    const x = new DOMMatrixReadOnly(getComputedStyle(run).transform).m41;
    run.style.animationName = "none"; // only the name: the inline duration (speed) must survive
    run.style.transform = `translateX(${x}px)`;
    drag.current = { x0: e.touches[0].clientX, base: x, pos: x, moved: false, on: true };
  };
  const onMove = (e: React.TouchEvent) => {
    const d = drag.current, run = runRef.current;
    if (!d.on || !run) return;
    const dx = e.touches[0].clientX - d.x0;
    if (Math.abs(dx) > 6) d.moved = true;
    d.pos = wrap(d.base + dx);
    run.style.transform = `translateX(${d.pos}px)`;
  };
  const onEnd = () => {
    if (resume.current) clearTimeout(resume.current);
    resume.current = setTimeout(() => {
      setHeld(false);
      const d = drag.current, run = runRef.current, h = half();
      if (!d.on || !run) return;
      d.on = false;
      // Restart the roll part-way through, at the spot the tape was left.
      const dur = parseFloat(run.style.animationDuration) || 0;
      run.style.transform = "";
      run.style.animationName = "";
      run.style.animationDelay = h ? `${(d.pos / h) * dur}s` : "";
    }, 1500);
  };
  useEffect(() => {
    fetch("/data/insiders-today.json").then((r) => (r.ok ? r.json() : null)).then((x) => x && setD(x)).catch(() => {});
  }, []);
  const items = (cleanTrades(d?.trades ?? []) as InsiderTrade[])
    .filter((t) => (t.code === "P" || t.code === "S") && t.value && isExecOrDirector(t))
    .sort((a, b) => (b.filed || b.date).localeCompare(a.filed || a.date) || (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 24);
  if (!d || !items.length) return null;
  // On Saturdays and Sundays (New York time) nothing new is filed, so the tape is the week's trades, not live.
  const weekend = ["Sat", "Sun"].includes(new Date().toLocaleDateString("en-US", { weekday: "short", timeZone: "America/New_York" }));
  // Rolls right to left like an exchange tape: the list is drawn twice and slides by one
  // copy's width, so the loop has no seam. A short list is repeated first so a copy is
  // wider than the screen. Speed stays the same whatever the length (~3.5 s per trade).
  const run = Array.from({ length: Math.ceil(8 / items.length) }, () => items).flat();
  const chip = (t: InsiderTrade, i: number, copy: number) => (
    <Link key={copy + t.accession + t.code + i} href={`/stock/${t.symbol}`} className={t.code === "P" ? "up" : "down"} tabIndex={copy ? -1 : undefined}>
      <span aria-hidden>{t.code === "P" ? "▲" : "▼"}</span> <strong>{t.symbol}</strong> <span className="ticker-v">${fmtBig(t.value ?? 0)}</span>
    </Link>
  );
  return (
    <div className="ticker" aria-label="Today's insider trades">
      {weekend ? <span className="ticker-live">This week</span> : <span className="ticker-live"><i aria-hidden />Live · {ago(d.updated)}</span>}
      <div className={`ticker-tape${held ? " held" : ""}`} onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} onTouchCancel={onEnd}
        onClickCapture={(e) => { if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); drag.current.moved = false; } }}>
        <div className="ticker-run" ref={runRef} style={{ animationDuration: `${run.length * 3.5}s` }}>
          <div className="ticker-copy">{run.map((t, i) => chip(t, i, 0))}</div>
          <div className="ticker-copy" aria-hidden>{run.map((t, i) => chip(t, i, 1))}</div>
        </div>
      </div>
    </div>
  );
}
