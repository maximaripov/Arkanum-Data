"use client";
// This device's notification registration. No accounts: a random ID made on first use
// identifies the device to the server. The watchlist and followed insiders stay on the
// device; they're sent to the server only while notifications are on, so the 4 PM
// digest can be personalized.
import { DEFAULT_WATCHLIST } from "./markets";

const ID = "foresight.deviceId";
const ON = "foresight.notificationsOn";

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} },
  del: (k: string) => { try { localStorage.removeItem(k); } catch {} },
  json: <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? "null") ?? d; } catch { return d; } },
};

export function deviceId() {
  let id = ls.get(ID);
  if (!id) {
    const b = crypto.getRandomValues(new Uint8Array(18));
    id = btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    ls.set(ID, id);
  }
  return id;
}
export const notificationsOn = () => ls.get(ON) === "1";

/** Sends this device's watchlist (exactly what the Markets tab shows, defaults included)
 *  and followed insiders, plus any extra fields. */
const prefs = () => ({
  watchlist: ls.json<string[] | null>("foresight.watchlist", null) ?? DEFAULT_WATCHLIST,
  following: ls.json<{ cik: string }[]>("foresight.following", []).map((p) => p.cik),
  strategies: ls.json<unknown[]>("arkanum.strategies", []), // saved in the research lab
});
const SYNCED = "foresight.synced"; // what the server last received, and when

export async function register(extra: Record<string, unknown> = {}) {
  const p = prefs();
  const res = await fetch("/api/alerts/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: deviceId(), ...p, ...extra }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error ?? `Server error ${res.status}`);
  if (d.on) { ls.set(ON, "1"); ls.set(SYNCED, JSON.stringify({ sig: JSON.stringify(p), at: Date.now() })); } else { ls.del(ON); ls.del(SYNCED); }
  return d as { ok: boolean; on: boolean; owner?: boolean };
}

let timer: ReturnType<typeof setTimeout> | undefined;
/** Update the server copy if notifications are on and something changed. Every write
 *  rewrites the shared device file in storage, so unchanged visits send nothing, except
 *  once a week so the server knows this device is still in use (it prunes idle ones). */
export function syncSoon() {
  if (!notificationsOn()) return;
  const last = ls.json<{ sig: string; at: number } | null>(SYNCED, null);
  if (last && last.sig === JSON.stringify(prefs()) && Date.now() - last.at < 7 * 86_400_000) return;
  clearTimeout(timer);
  timer = setTimeout(() => register().catch(() => {}), 1200);
}
