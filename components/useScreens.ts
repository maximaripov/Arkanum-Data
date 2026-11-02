"use client";
import { useCallback, useEffect, useState } from "react";
import { syncSoon } from "@/lib/alertsClient";

export type ScreenFilter = { text?: string; exch?: string; sector?: string; industry?: string; ranges: Record<string, [number | "", number | ""]> };
export type SavedScreen = { id: string; name: string; filter: ScreenFilter };
const KEY = "foresight.screens";

const read = (): SavedScreen[] => {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};

/** Saved screener filters: stored on the device and synced like the watchlist. */
export function useScreens() {
  const [screens, setScreens] = useState<SavedScreen[]>([]);
  useEffect(() => {
    setScreens(read());
    const on = () => setScreens(read());
    window.addEventListener("foresight-screens", on);
    return () => window.removeEventListener("foresight-screens", on);
  }, []);
  const write = useCallback((next: SavedScreen[]) => {
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    setScreens(next);
    syncSoon();
  }, []);
  const save = (name: string, filter: ScreenFilter) => {
    // Only keep ranges that are set, so the saved filter stays small and readable.
    const ranges = Object.fromEntries(Object.entries(filter.ranges).filter(([, [lo, hi]]) => lo !== "" || hi !== ""));
    const existing = read().find((s) => s.name.toLowerCase() === name.toLowerCase());
    const id = existing?.id ?? Math.random().toString(36).slice(2, 9);
    write([...read().filter((s) => s.id !== id), { id, name, filter: { ...filter, ranges } }].slice(-20));
    return id;
  };
  const remove = (id: string) => write(read().filter((s) => s.id !== id));
  return { screens, save, remove };
}
