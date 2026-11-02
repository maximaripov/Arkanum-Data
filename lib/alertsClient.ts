"use client";
// Browser side of alerts: the passcode for this device, and syncing the watchlist and
// price levels to the server so the nightly briefing knows what you follow.
import { DEFAULT_WATCHLIST } from "./markets";

const PASS = "foresight.alertsPasscode";

export const getPasscode = () => { try { return localStorage.getItem(PASS) ?? ""; } catch { return ""; } };
export const setPasscode = (p: string) => { try { localStorage.setItem(PASS, p); } catch {} };

function localState() {
  const read = (k: string, d: unknown) => { try { return JSON.parse(localStorage.getItem(k) ?? "null") ?? d; } catch { return d; } };
  // Exactly what the Markets tab shows: the saved list, or the default list if none was saved.
  const w = read("foresight.watchlist", null);
  return { watchlist: Array.isArray(w) ? w : DEFAULT_WATCHLIST, levels: read("foresight.levels", {}) };
}

export async function register(extra: Record<string, unknown> = {}) {
  const passcode = getPasscode();
  if (!passcode) throw new Error("No passcode on this device");
  const { watchlist, levels } = localState();
  const res = await fetch("/api/alerts/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passcode, watchlist, levels, ...extra }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error ?? `Server error ${res.status}`);
  return d as { ok: boolean; devices: number; watchlist: number };
}

let timer: ReturnType<typeof setTimeout> | undefined;
/** Called whenever the watchlist or levels change; no-op until alerts are set up here. */
export function syncSoon() {
  if (!getPasscode()) return;
  clearTimeout(timer);
  timer = setTimeout(() => register().catch(() => {}), 1500);
}
