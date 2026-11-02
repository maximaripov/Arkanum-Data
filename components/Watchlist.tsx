"use client";
// Your watchlist: prices from TradingView's quotes widget (delayed for stocks), plus a
// list to open or remove each stock. Stored on this device.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useWatchlist } from "./useWatchlist";
import { TradingView } from "./TradingView";
import { tvSymbol } from "@/lib/tv";

export function Watchlist() {
  const { list, toggle } = useWatchlist();
  const [ex, setEx] = useState<Record<string, string | null>>({});
  const key = list.join(",");
  useEffect(() => {
    if (!key) return;
    fetch(`/api/company?symbols=${encodeURIComponent(key)}`).then((r) => r.json()).then((rows: { ticker: string; exchange: string | null }[]) => {
      setEx(Object.fromEntries(rows.map((r) => [r.ticker, r.exchange])));
    }).catch(() => {});
  }, [key]);
  const ready = list.length > 0 && list.every((s) => s in ex);
  return (
    <section className="card">
      <h2>Your watchlist</h2>
      {!list.length ? <p className="muted">Empty. Search for a company above and tap ☆ on its page.</p> : (
        <>
          {ready ? (
            <TradingView widget="market-quotes" height={Math.min(80 + list.length * 46, 640)} config={{
              width: "100%", height: "100%", showSymbolLogo: true,
              symbolsGroups: [{ name: "Watchlist", symbols: list.map((s) => ({ name: tvSymbol(s, ex[s]), displayName: s })) }],
            }} />
          ) : <p className="muted">Loading…</p>}
          <div className="chips">{list.map((s) => (
            <span key={s} className="chip saved"><Link href={`/stock/${encodeURIComponent(s)}`}><button>{s}</button></Link><button onClick={() => toggle(s)} aria-label={`Remove ${s}`}>×</button></span>
          ))}</div>
        </>
      )}
    </section>
  );
}
