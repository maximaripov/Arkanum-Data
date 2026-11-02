"use client";
import { useEffect } from "react";
import { syncSoon } from "@/lib/device";

export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    // Keep the server's copy current (and the device marked as active) while notifications are on.
    syncSoon();
  }, []);
  return null;
}
