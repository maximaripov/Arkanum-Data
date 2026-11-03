"use client";
// Insiders this device follows (by SEC ID, with the name for display). Stored on the
// device; sent to the server with the watchlist while notifications are on, so the
// hourly job can alert when one of them trades.
import { useCallback, useEffect, useState } from "react";
import { syncSoon } from "@/lib/device";

export type Followed = { cik: string; name: string };
const KEY = "foresight.following";
const read = (): Followed[] => {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(v) ? v.filter((x) => x?.cik) : []; }
  catch { return []; }
};

export function useFollowing() {
  const [list, setList] = useState<Followed[]>([]);
  useEffect(() => {
    setList(read());
    const on = () => setList(read());
    window.addEventListener("foresight-following", on);
    window.addEventListener("storage", on);
    return () => { window.removeEventListener("foresight-following", on); window.removeEventListener("storage", on); };
  }, []);
  const toggle = useCallback((p: Followed) => {
    const cur = read();
    const next = cur.some((x) => x.cik === p.cik) ? cur.filter((x) => x.cik !== p.cik) : [...cur, p].slice(-100);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    setList(next);
    window.dispatchEvent(new Event("foresight-following"));
    syncSoon();
  }, []);
  return { list, toggle, has: (cik: string) => list.some((x) => x.cik === cik) };
}
