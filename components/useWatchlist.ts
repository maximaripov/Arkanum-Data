"use client";
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_WATCHLIST } from "@/lib/markets";
import { syncSoon } from "@/lib/device";

const KEY = "foresight.watchlist";
const read = (): string[] => {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "null"); return Array.isArray(v) ? v : DEFAULT_WATCHLIST; }
  catch { return DEFAULT_WATCHLIST; }
};

export function useWatchlist() {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    setList(read());
    const on = () => setList(read());
    window.addEventListener("foresight-watchlist", on);
    window.addEventListener("storage", on);
    return () => { window.removeEventListener("foresight-watchlist", on); window.removeEventListener("storage", on); };
  }, []);
  const save = useCallback((next: string[]) => {
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    setList(next);
    window.dispatchEvent(new Event("foresight-watchlist"));
    syncSoon();
  }, []);
  const toggle = useCallback((s: string) => { const cur = read(); save(cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]); }, [save]);
  return { list, toggle, save, has: (s: string) => list.includes(s) };
}
