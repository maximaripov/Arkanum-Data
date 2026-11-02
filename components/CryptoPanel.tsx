"use client";
import { useEffect, useState } from "react";
import { CRYPTO } from "@/lib/markets";
import { useQuotes } from "./useQuotes";
import { QuoteRow } from "./QuoteRow";

type Tick = { price: number; open: number };

/** Crypto streams tick-by-tick from Coinbase's public websocket (free, no key).
 *  Yahoo polling fills in sparklines and covers any time the socket is down. */
export function CryptoPanel() {
  const { quotes } = useQuotes(CRYPTO, 30_000);
  const [ticks, setTicks] = useState<Record<string, Tick>>({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout>;
    let closed = false;
    const connect = () => {
      ws = new WebSocket("wss://ws-feed.exchange.coinbase.com");
      ws.onopen = () => { setConnected(true); ws?.send(JSON.stringify({ type: "subscribe", product_ids: CRYPTO, channels: ["ticker"] })); };
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.type === "ticker") setTicks((t) => ({ ...t, [m.product_id]: { price: +m.price, open: +m.open_24h } }));
      };
      ws.onclose = () => { setConnected(false); if (!closed) retry = setTimeout(connect, 5000); };
      ws.onerror = () => ws?.close();
    };
    connect();
    return () => { closed = true; clearTimeout(retry); ws?.close(); };
  }, []);

  return (
    <section className="card">
      <h2>Crypto <span className="muted small">{connected ? "streaming · 24h change" : "polling"}</span></h2>
      {CRYPTO.map((s) => {
        const t = ticks[s], q = quotes[s];
        const price = t?.price ?? q?.price ?? null;
        const chg = t ? ((t.price - t.open) / t.open) * 100 : q?.changePct ?? null;
        return <QuoteRow key={s} symbol={s} label={s.replace("-USD", "")} price={price} changePct={chg} spark={q?.spark} live={!!t} />;
      })}
    </section>
  );
}
