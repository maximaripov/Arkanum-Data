// Server side of notifications, for anyone who turns them on. No accounts: each device
// has a random ID (generated on the device, never shown) and stores only what's needed
// to send its daily digest — its push address, watchlist and the insiders it follows.
//
// Private Vercel Blob store:
//   alerts/devices.json → { devices: { [id]: Device } }
//   alerts/digest.json  → the latest public daily digest
import { BlobNotFoundError, BlobPreconditionFailedError, get, head, put } from "@vercel/blob";
import webpush, { type PushSubscription } from "web-push";
import { timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

export type Device = {
  id: string;
  sub: PushSubscription | null;
  watchlist: string[];
  owner?: boolean; // the site owner's device: also gets "update failed" health alerts
  instant?: boolean; // instant alerts for strong insider buys in the watchlist (on unless false)
  following?: string[]; // SEC IDs of insiders this device follows
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

// Version tags can come back quoted or as weak tags from different endpoints; compare the core.
const tagCore = (t: string | null | undefined) => String(t ?? "").replace(/^W\//, "").replace(/"/g, "");

/** The file's current version straight from the storage API (not the CDN), or null if it doesn't exist. */
async function currentTag(path: string): Promise<string | null> {
  try { return (await head(path)).etag; }
  catch (e) { if (e instanceof BlobNotFoundError) return null; throw e; }
}

/** Read-modify-write that retries if another request changed the file in between,
 *  so two people turning on notifications at the same moment can't erase each other.
 *  The version to write against comes from the storage API itself; the content is only
 *  used once a read returns that same version, because a read can briefly serve an
 *  older copy right after a write. Every rejected attempt is logged with both tags. */
export async function updateDevices<T>(fn: (s: Store) => T): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const tag = await currentTag(DEVICES);
    const { data, etag } = await readJson<Store>(DEVICES);
    if (tag && tagCore(etag) !== tagCore(tag)) {
      console.warn(`updateDevices: stale read (read ${etag}, current ${tag}), attempt ${attempt + 1}`);
      await new Promise((r) => setTimeout(r, Math.min(3000, 200 * 2 ** attempt)));
      continue;
    }
    const store = data ?? { devices: {} };
    const result = fn(store);
    try {
      await writeJson(DEVICES, store, tag);
      return result;
    } catch (e) {
      if (!(e instanceof BlobPreconditionFailedError)) throw e;
      console.warn(`updateDevices: write rejected (ifMatch ${tag}, now ${await currentTag(DEVICES).catch(() => "?")}), attempt ${attempt + 1}`);
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
// The repo was renamed from Foresight to Form4; accept either name (and any GITHUB_REPO set on Vercel).
const REPOS = new Set([process.env.GITHUB_REPO, "maximaripov/form4", "maximaripov/foresight"].filter(Boolean).map((r) => r!.toLowerCase()));

/** The owner code (ALERTS_PASSCODE) marks a device as the site owner's. */
export const ownerCodeOk = (code: unknown) => typeof code === "string" && same(code, process.env.ALERTS_PASSCODE);

export async function secretOk(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return false;
  if (same(token, process.env.ALERTS_SECRET)) return true;
  try {
    const { payload } = await jwtVerify(token, GITHUB_JWKS, { issuer: "https://token.actions.githubusercontent.com", audience: ["form4-alerts", "foresight-alerts"] });
    return payload.repository_owner_id === OWNER_ID && REPOS.has(String(payload.repository).toLowerCase()) && payload.ref === "refs/heads/main";
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
/** SEC IDs of followed insiders: digits only, at most 100. */
export function sanitizeFollowing(f: unknown): string[] | undefined {
  if (!Array.isArray(f)) return undefined;
  return [...new Set(f.map((x) => String(Number(x) || "")).filter((x) => /^\d{1,10}$/.test(x)))].slice(0, 100);
}
export function sanitizeSub(s: any): PushSubscription | null {
  if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth) return null;
  const endpoint = String(s.endpoint);
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 600) return null;
  return { endpoint, keys: { p256dh: String(s.keys.p256dh).slice(0, 200), auth: String(s.keys.auth).slice(0, 100) } };
}
