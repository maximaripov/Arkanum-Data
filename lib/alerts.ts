// Server side of notifications, for anyone who turns them on. No accounts: each device
// has a random ID (generated on the device, never shown) and stores only what's needed
// to send its daily digest — its push address, watchlist and saved screens.
//
// Private Vercel Blob store:
//   alerts/devices.json → { devices: { [id]: Device } }
//   alerts/digest.json  → the latest public daily digest
import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import webpush, { type PushSubscription } from "web-push";
import { timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

export type Screen = { id: string; name: string; filter: { text?: string; exch?: string; sector?: string; industry?: string; ranges: Record<string, [number | "", number | ""]> } };
export type Device = {
  id: string;
  sub: PushSubscription | null;
  watchlist: string[];
  screens: Screen[];
  screenMatches: Record<string, string[]>; // saved screen id → symbols that matched last digest
  owner?: boolean; // the site owner's device: also gets "update failed" health alerts
  instant?: boolean; // instant alerts for strong insider buys in the watchlist (on unless false)
  added: string;
  seen: string;
};
type Store = { devices: Record<string, Device> };

const DEVICES = "alerts/devices.json";
const DIGEST = "alerts/digest.json";
export const MAX_DEVICES = 5000;

async function readJson<T>(path: string): Promise<{ data: T | null; etag: string | null }> {
  const r = await get(path, { access: "private", useCache: false });
  if (!r || r.statusCode !== 200) return { data: null, etag: null };
  return { data: JSON.parse(await new Response(r.stream).text()) as T, etag: r.blob.etag };
}
const writeJson = (path: string, data: unknown, ifMatch?: string | null) =>
  put(path, JSON.stringify(data), { access: "private", allowOverwrite: true, addRandomSuffix: false, contentType: "application/json", ...(ifMatch ? { ifMatch } : {}) });

export async function readDevices(): Promise<Store> {
  return (await readJson<Store>(DEVICES)).data ?? { devices: {} };
}

/** Read-modify-write that retries if another request changed the file in between,
 *  so two people turning on notifications at the same moment can't erase each other.
 *  Waits grow on each retry: right after a write, a read can briefly return the old copy. */
export async function updateDevices<T>(fn: (s: Store) => T): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const { data, etag } = await readJson<Store>(DEVICES);
    const store = data ?? { devices: {} };
    const result = fn(store);
    try {
      await writeJson(DEVICES, store, etag);
      return result;
    } catch (e) {
      if (!(e instanceof BlobPreconditionFailedError)) throw e;
      await new Promise((r) => setTimeout(r, Math.min(3000, 150 * 2 ** attempt) + Math.random() * 250));
    }
  }
  throw new Error("Busy, try again");
}

export const readDigest = async () => (await readJson<Record<string, unknown>>(DIGEST)).data;
export const writeDigest = (d: unknown) => writeJson(DIGEST, d);

// ---- Who may send ------------------------------------------------------------------
function same(a: string | null | undefined, b: string | undefined) {
  if (!a || !b) return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
// The 4 PM GitHub job proves who it is with a GitHub-signed token (OIDC), so no shared
// secret is stored in GitHub. ALERTS_SECRET still works for manual runs.
const GITHUB_JWKS = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));
const OWNER_ID = process.env.GITHUB_OWNER_ID ?? "351230404";
const REPO = (process.env.GITHUB_REPO ?? "maximaripov/foresight").toLowerCase();

/** The owner code (ALERTS_PASSCODE) marks a device as the site owner's. */
export const ownerCodeOk = (code: unknown) => typeof code === "string" && same(code, process.env.ALERTS_PASSCODE);

export async function secretOk(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return false;
  if (same(token, process.env.ALERTS_SECRET)) return true;
  try {
    const { payload } = await jwtVerify(token, GITHUB_JWKS, { issuer: "https://token.actions.githubusercontent.com", audience: "foresight-alerts" });
    return payload.repository_owner_id === OWNER_ID && String(payload.repository).toLowerCase() === REPO && payload.ref === "refs/heads/main";
  } catch {
    return false;
  }
}

// ---- Sending -------------------------------------------------------------------------
export type PushMessage = { title: string; body: string; url: string; tag?: string };

/** Sends each message to its device; returns the device IDs whose push address is gone. */
export async function pushEach(items: { id: string; sub: PushSubscription; msg: PushMessage }[]) {
  webpush.setVapidDetails(process.env.SITE_URL ?? "https://form4-insiders.vercel.app", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const gone: string[] = [];
  const errors: string[] = [];
  let sent = 0;
  for (let i = 0; i < items.length; i += 50) {
    await Promise.all(items.slice(i, i + 50).map(async ({ id, sub, msg }) => {
      try {
        await webpush.sendNotification(sub, JSON.stringify(msg), { TTL: 60 * 60 * 12, urgency: "normal" });
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) gone.push(id);
        else if (errors.length < 5) errors.push(`${e?.statusCode ?? ""} ${e?.body ?? e?.message ?? e}`.trim());
      }
    }));
  }
  return { sent, gone, errors };
}

// ---- Input cleaning ------------------------------------------------------------------
const clean = (sym: unknown) => String(sym ?? "").toUpperCase().trim().slice(0, 12);
export const validId = (id: unknown): id is string => typeof id === "string" && /^[A-Za-z0-9_-]{16,40}$/.test(id);
export function sanitizeWatchlist(w: unknown): string[] | undefined {
  if (!Array.isArray(w)) return undefined;
  return [...new Set(w.map(clean).filter((s) => /^[A-Z0-9.\-^=]{1,12}$/.test(s)))].slice(0, 50);
}
export function sanitizeSub(s: any): PushSubscription | null {
  if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth) return null;
  const endpoint = String(s.endpoint);
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 600) return null;
  return { endpoint, keys: { p256dh: String(s.keys.p256dh).slice(0, 200), auth: String(s.keys.auth).slice(0, 100) } };
}
const bound = (v: unknown): number | "" => (v === "" || v == null ? "" : Number.isFinite(+v!) ? +v! : "");
const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : undefined);
export function sanitizeScreens(x: unknown): Screen[] | undefined {
  if (!Array.isArray(x)) return undefined;
  return x.slice(0, 10).flatMap((s: any) => {
    if (!s || typeof s.name !== "string" || !s.filter) return [];
    const ranges: Screen["filter"]["ranges"] = {};
    for (const [k, v] of Object.entries(s.filter.ranges ?? {}).slice(0, 20)) {
      if (!/^[a-zA-Z0-9]{1,12}$/.test(k) || !Array.isArray(v)) continue;
      ranges[k] = [bound(v[0]), bound(v[1])];
    }
    const f = s.filter;
    return [{ id: String(s.id ?? "").slice(0, 12), name: s.name.slice(0, 30), filter: { text: str(f.text, 40), exch: str(f.exch, 12), sector: str(f.sector, 40), industry: str(f.industry, 80), ranges } }];
  });
}
