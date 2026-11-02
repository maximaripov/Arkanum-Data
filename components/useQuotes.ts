"use client";
import { useEffect, useState } from "react";
import type { Quote } from "@/lib/yahoo";

/** Polls /api/quotes; pauses while the tab is hidden so it costs nothing in the background. */
export function useQuotes(symbols: string[], everyMs = 10_000) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [updated, setUpdated] = useState<Date | null>(null);
  const key = symbols.join(",");
  useEffect(() => {
    if (!key) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (document.visibilityState === "visible") {
        try {
          const r = await fetch(`/api/quotes?symbols=${encodeURIComponent(key)}`);
          const list: Quote[] = await r.json();
          if (!stop && Array.isArray(list)) {
            setQuotes(Object.fromEntries(list.map((q) => [q.symbol, q])));
            setUpdated(new Date());
          }
        } catch {}
      }
      if (!stop) timer = setTimeout(tick, everyMs);
    };
    tick();
    const onVis = () => document.visibilityState === "visible" && (clearTimeout(timer), tick());
    document.addEventListener("visibilitychange", onVis);
    return () => { stop = true; clearTimeout(timer); document.removeEventListener("visibilitychange", onVis); };
  }, [key, everyMs]);
  return { quotes, updated };
}
