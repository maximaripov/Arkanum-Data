"use client";
import { useEffect } from "react";
import { syncNow } from "@/lib/alertsClient";

export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    // Load the shared watchlist and levels on open and whenever the app comes back to
    // the foreground, so every device (and the 4 PM briefing) shows the same list.
    syncNow();
    const onShow = () => { if (document.visibilityState === "visible") syncNow(); };
    document.addEventListener("visibilitychange", onShow);
    return () => document.removeEventListener("visibilitychange", onShow);
  }, []);
  return null;
}
