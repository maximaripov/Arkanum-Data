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
  return (
    <div className="ticker" aria-label="Today's insider trades">
      <span className="ticker-live"><i aria-hidden />Live · {ago(d.updated)}</span>
      {items.map((t, i) => (
        <Link key={t.accession + t.code + i} href={`/stock/${t.symbol}`} className={t.code === "P" ? "up" : "down"}>
          <span aria-hidden>{t.code === "P" ? "▲" : "▼"}</span> <strong>{t.symbol}</strong> <span className="ticker-v">${fmtBig(t.value ?? 0)}</span>
        </Link>
      ))}
    </div>
  );
}
