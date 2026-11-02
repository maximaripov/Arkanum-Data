"use client";
import { useEffect } from "react";
import { syncSoon } from "@/lib/alertsClient";

export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    // Every time the app opens, send this device's watchlist and levels to the server so
    // the 4 PM briefing matches the Markets tab even if nothing was changed today.
    syncSoon();
  }, []);
  return null;
}
