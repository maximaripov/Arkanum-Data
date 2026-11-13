"use client";
// Arrivals from the old address (proxy.ts) bring their saved settings in the URL fragment
// (#arkanum-move=...; fragments never reach a server). Anything this browser doesn't already
// have on the new address is saved, then the fragment is removed.
import { useEffect } from "react";

export function MoveIn() {
  useEffect(() => {
    const m = /^#arkanum-move=(.+)$/.exec(location.hash);
    if (!m) return;
    try {
      const d = JSON.parse(decodeURIComponent(m[1])) as Record<string, string>;
      for (const [k, v] of Object.entries(d)) if (/^(foresight|form4|arkanum)\./.test(k) && typeof v === "string" && localStorage.getItem(k) === null) localStorage.setItem(k, v);
    } catch {}
    history.replaceState(null, "", location.pathname + location.search);
    location.reload(); // so the watchlist and follows show without waiting for another visit
  }, []);
  return null;
}
