"use client";
// Your watchlist: one card per stock with TradingView's quote (price, change, mini chart),
// a link to the stock's page and a remove button. Stored on this device.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useWatchlist } from "./useWatchlist";
import { TradingView } from "./TradingView";
import { tvSymbol } from "@/lib/tv";

export function Watchlist() {
  const { list, toggle } = useWatchlist();
  const [co, setCo] = useState<Record<string, { name: string | null; exchange: string | null }>>({});
  const key = list.join(",");
  useEffect(() => {
    if (!key) return;
    fetch(`/api/company?symbols=${encodeURIComponent(key)}`).then((r) => r.json()).then((rows: { ticker: string; name: string | null; exchange: string | null }[]) => {
      setCo(Object.fromEntries(rows.map((r) => [r.ticker, { name: r.name, exchange: r.exchange }])));
    }).catch(() => {});
  }, [key]);
  return (
    <section className="card">
      <div className="card-head"><h2>Your watchlist</h2><span className="muted small">prices delayed 15 min</span></div>
      {!list.length ? (
        <div className="empty">
          <p><strong>Your watchlist is empty.</strong></p>
          <p className="muted">Search for a company at the top, open it, and tap ☆ to follow it here. Your daily digest will then tell you when its insiders trade or big funds move.</p>
        </div>
      ) : (
        <div className="quote-grid">
          {list.map((s) => (
            <div key={s} className="quote-card">
              {s in co ? <TradingView widget="mini-symbol-overview" height={140} config={{ symbol: tvSymbol(s, co[s]?.exchange), width: "100%", height: "100%", dateRange: "1D", chartOnly: false, noTimeScale: true }} label="TradingView" /> : <div style={{ height: 140 }} />}
              <div className="quote-foot">
                <Link href={`/stock/${encodeURIComponent(s)}`} className="quote-link">Open {s} ›</Link>
                <button className="icon" onClick={() => toggle(s)} aria-label={`Remove ${s} from watchlist`} title="Remove">×</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
