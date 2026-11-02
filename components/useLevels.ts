"use client";
import { useCallback, useEffect, useState } from "react";
import { syncSoon } from "@/lib/alertsClient";

export type Level = { id: string; price: number; note: string };
const KEY = "foresight.levels";

const readAll = (): Record<string, Level[]> => {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "{}"); return v && typeof v === "object" ? v : {}; }
  catch { return {}; }
};

/** Price levels you're watching, per symbol, saved in this browser. */
export function useLevels(symbol: string) {
  const [levels, setLevels] = useState<Level[]>([]);
  useEffect(() => {
    setLevels(readAll()[symbol] ?? []);
    // Another device's levels arrived via sync.
    const on = () => setLevels(readAll()[symbol] ?? []);
    window.addEventListener("foresight-levels", on);
    return () => window.removeEventListener("foresight-levels", on);
  }, [symbol]);
  const save = useCallback((next: Level[]) => {
    const all = readAll();
    if (next.length) all[symbol] = next; else delete all[symbol];
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch {}
    setLevels(next);
    syncSoon();
  }, [symbol]);
  const add = (price: number, note: string) =>
    save([...levels, { id: Math.random().toString(36).slice(2, 9), price, note: note.trim() }].sort((a, b) => b.price - a.price));
  const remove = (id: string) => save(levels.filter((l) => l.id !== id));
  return { levels, add, remove };
}
