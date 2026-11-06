"use client";
// The band under the header: today's insider buys and large sales from the hourly file,
// newest first, with how long ago the data was refreshed. Hidden when there's nothing yet.
import { useEffect, useState } from "react";
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
  useEffect(() => {
    fetch("/data/insiders-today.json").then((r) => (r.ok ? r.json() : null)).then((x) => x && setD(x)).catch(() => {});
  }, []);
  const items = (cleanTrades(d?.trades ?? []) as InsiderTrade[])
    .filter((t) => (t.code === "P" || t.code === "S") && t.value && isExecOrDirector(t))
    .sort((a, b) => (b.filed || b.date).localeCompare(a.filed || a.date) || (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 24);
  if (!d || !items.length) return null;
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
      <span className="ticker-live"><i aria-hidden />Live · {ago(d.updated)}</span>
      <div className="ticker-tape">
        <div className="ticker-run" style={{ animationDuration: `${run.length * 3.5}s` }}>
          <div className="ticker-copy">{run.map((t, i) => chip(t, i, 0))}</div>
          <div className="ticker-copy" aria-hidden>{run.map((t, i) => chip(t, i, 1))}</div>
        </div>
      </div>
    </div>
  );
}
