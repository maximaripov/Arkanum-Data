"use client";
// Browser side of syncing: the passcode for this device, and keeping the watchlist and
// price levels the same on every device (and for the 4 PM briefing).
//
// The server holds the shared copy. On open, and whenever the app comes back to the
// foreground, a device loads it — unless this device has an edit newer than the server's
// copy, in which case the edit is sent up instead. Every edit is also sent right away.
import { DEFAULT_WATCHLIST } from "./markets";

const PASS = "foresight.alertsPasscode";
const WATCH = "foresight.watchlist";
const LEVELS = "foresight.levels";
const SCREENS = "foresight.screens";
const CHANGED = "foresight.localChangedAt"; // ms of this device's last unsent-or-sent edit
const SYNCED = "foresight.syncedAt"; // server's "updated" when this device last matched it
const MIGRATED = "foresight.syncV2"; // set once this device has used two-way sync

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} },
  json: <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? "null") ?? d; } catch { return d; } },
};

export const getPasscode = () => ls.get(PASS) ?? "";
export const setPasscode = (p: string) => ls.set(PASS, p);

function localState() {
  // Exactly what the Markets tab shows: the saved list, or the default list if none was saved.
  const w = ls.json<unknown>(WATCH, null);
  return { watchlist: Array.isArray(w) ? (w as string[]) : DEFAULT_WATCHLIST, levels: ls.json<Record<string, unknown>>(LEVELS, {}), screens: ls.json<unknown[]>(SCREENS, []) };
}

/** Sends this device's watchlist and levels (plus any extra fields) to the server. */
export async function register(extra: Record<string, unknown> = {}) {
  const passcode = getPasscode();
  if (!passcode) throw new Error("No passcode on this device");
  const res = await fetch("/api/alerts/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passcode, ...localState(), ...extra }),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error ?? `Server error ${res.status}`);
  if (d.updated) ls.set(SYNCED, d.updated);
  return d as { ok: boolean; devices: number; watchlist: number; updated: string };
}

/** Writes the server's copy into this device and tells the open screens to refresh. */
function adopt(watchlist: string[], levels: Record<string, unknown>, screens: unknown[], updated: string) {
  ls.set(WATCH, JSON.stringify(watchlist));
  ls.set(LEVELS, JSON.stringify(levels ?? {}));
  ls.set(SCREENS, JSON.stringify(screens ?? []));
  ls.set(SYNCED, updated);
  ls.set(CHANGED, "0");
  window.dispatchEvent(new Event("foresight-watchlist"));
  window.dispatchEvent(new Event("foresight-levels"));
  window.dispatchEvent(new Event("foresight-screens"));
}

let pulling: Promise<void> | null = null;
/** Load the shared copy, or send this device's newer edit. Safe to call often. */
export function syncNow(): Promise<void> {
  const passcode = getPasscode();
  if (!passcode) return Promise.resolve();
  pulling ??= (async () => {
    try {
      const r = await fetch("/api/alerts/sync", { headers: { "x-passcode": passcode }, cache: "no-store" });
      if (!r.ok) return;
      const server = (await r.json()) as { watchlist: string[]; levels: Record<string, unknown>; screens?: unknown[]; updated: string | null };
      const changedAt = Number(ls.get(CHANGED) ?? 0);
      if (!ls.get(MIGRATED)) {
        // First run of two-way sync on this device: keep a list you customized here
        // (it's what the briefing used until now); otherwise take the shared copy.
        ls.set(MIGRATED, "1");
        if (ls.get(WATCH) !== null || Object.keys(ls.json(LEVELS, {})).length || ls.json<unknown[]>(SCREENS, []).length) { await register(); return; }
      }
      if (!server.updated) { await register(); return; } // nothing on the server yet
      if (changedAt > Date.parse(server.updated)) { await register(); return; } // this device's edit is newer
      if (server.updated !== ls.get(SYNCED) || changedAt) adopt(server.watchlist, server.levels, server.screens ?? [], server.updated);
    } catch {} finally { pulling = null; }
  })();
  return pulling;
}

/** Entering the passcode on a device means "use the shared copy": take the server's
 *  watchlist and levels instead of sending this device's. */
export function joinSync() {
  ls.set(MIGRATED, "1");
  ls.set(CHANGED, "0");
  ls.set(SYNCED, "");
  return syncNow();
}

let timer: ReturnType<typeof setTimeout> | undefined;
/** Called on every watchlist or level edit: remember it and send it shortly. */
export function syncSoon() {
  ls.set(CHANGED, String(Date.now()));
  if (!getPasscode()) return;
  clearTimeout(timer);
  timer = setTimeout(() => register().then(() => ls.set(CHANGED, "0")).catch(() => {}), 1200);
}
