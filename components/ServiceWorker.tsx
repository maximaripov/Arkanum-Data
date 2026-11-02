"use client";
import { useEffect } from "react";
import { syncSoon } from "@/lib/device";

export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    // Catch up the server's copy if it changed elsewhere (or weekly, to mark the device active).
    syncSoon();
  }, []);
  return null;
}
