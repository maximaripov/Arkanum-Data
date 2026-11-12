"use client";
// Strategies saved from the research lab, on this device (no accounts). Sent to the server
// with the watchlist while notifications are on, so the insider job can alert on matches.
import { useCallback, useEffect, useState } from "react";
import { syncSoon } from "@/lib/device";
import type { DEFAULT_RULES } from "@/lib/lab.mjs";

export type Saved = { id: string; name: string; rules: typeof DEFAULT_RULES; med: number | null; period: string; saved: string };
const KEY = "arkanum.strategies";
export const MAX_SAVED = 5;
const read = (): Saved[] => { try { const v = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };

export function useStrategies() {
  const [list, setList] = useState<Saved[]>([]);
  useEffect(() => {
    setList(read());
    const on = () => setList(read());
    window.addEventListener("arkanum-strategies", on); window.addEventListener("storage", on);
    return () => { window.removeEventListener("arkanum-strategies", on); window.removeEventListener("storage", on); };
  }, []);
  const write = useCallback((next: Saved[]) => {
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    setList(next); window.dispatchEvent(new Event("arkanum-strategies")); syncSoon();
  }, []);
  const save = useCallback((s: Omit<Saved, "id" | "saved">) => {
    const cur = read();
    if (cur.length >= MAX_SAVED) return false;
    write([...cur, { ...s, id: Math.random().toString(36).slice(2, 10), saved: new Date().toISOString().slice(0, 10) }]);
    return true;
  }, [write]);
  const remove = useCallback((id: string) => write(read().filter((s) => s.id !== id)), [write]);
  return { list, save, remove };
}
