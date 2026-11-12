// Server side of notifications, for anyone who turns them on. No accounts: each device
// has a random ID (generated on the device, never shown) and stores only what's needed
// to send its daily digest — its push address, watchlist and the insiders it follows.
//
// Private Vercel Blob store:
//   alerts/devices.json → { devices: { [id]: Device } }
//   alerts/digest.json  → the latest public daily digest
//   alerts/pending.json → the day's digest notifications, held until 5:00 PM New York time
import { BlobNotFoundError, BlobPreconditionFailedError, get, head, put } from "@vercel/blob";
import webpush, { type PushSubscription } from "web-push";
import { timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { nyNow, pastSendTime } from "./sendTime.mjs";
import { cleanRules } from "./lab.mjs";
export { pastSendTime };

export type Device = {
  id: string;
  sub: PushSubscription | null;
  watchlist: string[];
  owner?: boolean; // the site owner's device: also gets "update failed" health alerts
  instant?: boolean; // instant alerts for strong insider buys in the watchlist (on unless false)
  following?: string[]; // SEC IDs of insiders this device follows, "house:<slug>" for House members, "fund:<SEC ID>" for funds
  strategies?: SavedStrategy[]; // research-lab strategies: an alert when a new purchase meets every rule
  added: string;
  seen: string;
};
type Store = { devices: Record<string, Device> };
/** A strategy saved from the research lab, with its tested result for the alert text. */
export type SavedStrategy = { id: string; name: string; rules: NonNullable<ReturnType<typeof cleanRules>>; med?: number | null; period?: string };

const DEVICES = "alerts/devices.json";
const DIGEST = "alerts/digest.json";
const PENDING = "alerts/pending.json";
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
    const before = JSON.stringify(store);
    const result = fn(store);
    if (data && JSON.stringify(store) === before) return result; // nothing changed: no write
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
// The repo is Arkanum-Data (renamed 2026-11-06; earlier Foresight, then planned Form4/Arkanum); accept any (and any GITHUB_REPO set on Vercel).
const REPOS = new Set([process.env.GITHUB_REPO, "maximaripov/arkanum-data", "maximaripov/arkanum", "maximaripov/form4", "maximaripov/foresight"].filter(Boolean).map((r) => r!.toLowerCase()));

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
  webpush.setVapidDetails(process.env.SITE_URL ?? "https://arkanumdata.vercel.app", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
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

// ---- The 5 PM send ------------------------------------------------------------------
// The 4 PM job builds the digest whenever GitHub gets round to it (often 30-60 min late).
// If it's done before 5:00 PM New York time the notifications are held, and a timer
// (cron-job.org, with the hourly job as a backstop) releases them at 5:00. After 5 they go at once.
export type DigestMessage = { id: string; title: string; body: string };
type Pending = { date: string; messages: DigestMessage[]; sent: boolean };
const STALE_DAYS = 120; // forget devices that haven't opened the app in ~4 months
export const holdDigest = (messages: DigestMessage[], now = new Date()) =>
  writeJson(PENDING, { date: nyNow(now).date, messages, sent: false } satisfies Pending);

/** Sends today's held digest once. Claims it first (a conditional write), so two
 *  releases at the same moment can't both send. */
export async function releaseDigest(now = new Date()) {
  const tag = await currentTag(PENDING);
  if (!tag) return { released: false, reason: "nothing held" };
  const { data, etag } = await readJson<Pending>(PENDING);
  if (!data || tagCore(etag) !== tagCore(tag)) return { released: false, reason: "busy, try again" };
  if (data.sent) return { released: false, reason: "already sent" };
  if (data.date !== nyNow(now).date) return { released: false, reason: `held digest is from ${data.date}` };
  try { await writeJson(PENDING, { ...data, sent: true }, tag); }
  catch (e) { if (e instanceof BlobPreconditionFailedError) return { released: false, reason: "already being sent" }; throw e; }
  return { released: true, ...(await sendDigestMessages(data.messages)) };
}

/** Pushes each device its message, then forgets devices whose push address is gone or
 *  that haven't opened the app in months. */
export async function sendDigestMessages(messages: DigestMessage[]) {
  const { devices } = await readDevices();
  const items = messages.flatMap((m) => {
    const d = devices[m.id];
    return d?.sub ? [{ id: m.id, sub: d.sub, msg: { title: String(m.title).slice(0, 80), body: String(m.body).slice(0, 300), url: "/briefing", tag: "digest" } }] : [];
  });
  const r = await pushEach(items);
  const cutoff = Date.now() - STALE_DAYS * 86_400_000;
  // Bookkeeping after the notifications went out: if storage is busy it waits for tomorrow
  // rather than failing a run whose notifications were already sent.
  let saved = true;
  await updateDevices((s) => {
    for (const id of r.gone) delete s.devices[id];
    for (const [id, d] of Object.entries(s.devices)) if (Date.parse(d.seen) < cutoff) delete s.devices[id];
  }).catch((e) => { saved = false; console.error("Device bookkeeping skipped:", e); });
  return { ...r, saved, devices: Object.keys(devices).length, messages: messages.length };
}

/** The 5 PM timer's own key (CRON_SECRET on Vercel); the GitHub jobs use secretOk. */
export const cronOk = (req: Request) => same(req.headers.get("authorization")?.replace(/^Bearer /, ""), process.env.CRON_SECRET);

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
  // An insider's SEC ID, "house:<member slug>", or "fund:<the fund's SEC ID>".
  const id = (x: unknown) => { const v = String(x ?? ""); return /^house:[a-z0-9-]{1,80}$/.test(v) || /^fund:\d{1,10}$/.test(v) ? v : String(Number(v) || ""); };
  return [...new Set(f.map(id).filter((x) => /^\d{1,10}$/.test(x) || x.startsWith("house:") || x.startsWith("fund:")))].slice(0, 100);
}
/** Browsers' push services (Chrome/Edge/Android via Google, Safari/iPhone via Apple, Firefox
 *  via Mozilla, Windows via Microsoft). Anything else isn't a real browser subscription:
 *  refusing it stops scripts filling the device list or spending storage writes. */
export const PUSH_HOST = /^(fcm\.googleapis\.com|android\.googleapis\.com|web\.push\.apple\.com|[a-z0-9-]+\.push\.apple\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.notify\.windows\.com)$/;
export function sanitizeSub(s: any): PushSubscription | null {
  if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth) return null;
  const endpoint = String(s.endpoint);
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 600) return null;
  try { if (!PUSH_HOST.test(new URL(endpoint).hostname)) return null; } catch { return null; }
  return { endpoint, keys: { p256dh: String(s.keys.p256dh).slice(0, 200), auth: String(s.keys.auth).slice(0, 100) } };
}

/** Up to five saved lab strategies: a short ID, a plain-text name, known rules only. */
export function sanitizeStrategies(x: unknown): SavedStrategy[] | undefined {
  if (!Array.isArray(x)) return undefined;
  const out: SavedStrategy[] = [];
  for (const v of x.slice(0, 5)) {
    const rules = cleanRules(v?.rules);
    const id = String(v?.id ?? "");
    if (!rules || !/^[a-z0-9]{1,12}$/.test(id)) continue;
    const name = String(v?.name ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 60) || "My strategy";
    const med = Number.isFinite(+v?.med) && Math.abs(+v.med) < 10 ? Math.round(+v.med * 10000) / 10000 : null;
    const period = v?.period === "2026" ? "2026" : "2023-25";
    out.push({ id, name, rules, med, period });
  }
  return out;
}
