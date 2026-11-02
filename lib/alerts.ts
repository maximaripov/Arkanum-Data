// Server-side alert state, kept in a private Vercel Blob store:
//   alerts/state.json    → phones registered for notifications, watchlist, price levels
//   alerts/briefing.json → the latest daily briefing
import { get, put } from "@vercel/blob";
import webpush, { type PushSubscription } from "web-push";
import { timingSafeEqual } from "node:crypto";

export type Level = { id: string; price: number; note: string };
export type AlertState = {
  subscriptions: (PushSubscription & { added: string })[];
  watchlist: string[];
  levels: Record<string, Level[]>;
  updated: string | null;
};

const STATE = "alerts/state.json";
const BRIEFING = "alerts/briefing.json";

async function readJson<T>(path: string): Promise<T | null> {
  const r = await get(path, { access: "private", useCache: false });
  if (!r) return null;
  return JSON.parse(await new Response(r.stream).text()) as T;
}
const writeJson = (path: string, data: unknown) =>
  put(path, JSON.stringify(data), { access: "private", allowOverwrite: true, addRandomSuffix: false, contentType: "application/json" });

export async function readState(): Promise<AlertState> {
  const s = await readJson<AlertState>(STATE);
  return { subscriptions: [], watchlist: [], levels: {}, updated: null, ...s };
}
export const writeState = (s: AlertState) => writeJson(STATE, { ...s, updated: new Date().toISOString() });
export const readBriefing = () => readJson<Record<string, unknown>>(BRIEFING);
export const writeBriefing = (b: unknown) => writeJson(BRIEFING, b);

function same(a: string | null | undefined, b: string | undefined) {
  if (!a || !b) return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
/** The passcode you type once on each device. */
export const passcodeOk = (req: Request, body?: { passcode?: string }) =>
  same(body?.passcode ?? req.headers.get("x-passcode"), process.env.ALERTS_PASSCODE);
/** The long secret the nightly GitHub job uses. */
export const secretOk = (req: Request) =>
  same(req.headers.get("authorization")?.replace(/^Bearer /, ""), process.env.ALERTS_SECRET);

export type PushMessage = { title: string; body: string; url: string; tag?: string };

/** Sends to each subscription; returns the endpoints the push service says are gone. */
export async function pushTo(subs: PushSubscription[], msg: PushMessage) {
  webpush.setVapidDetails(
    "https://foresightscreener.vercel.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  const gone: string[] = [];
  let sent = 0;
  const errors: string[] = [];
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(s, JSON.stringify(msg), { TTL: 60 * 60 * 12, urgency: "normal" });
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) gone.push(s.endpoint);
      else errors.push(`${e?.statusCode ?? ""} ${e?.body ?? e?.message ?? e}`.trim());
    }
  }));
  return { sent, gone, errors };
}

const clean = (sym: unknown) => String(sym ?? "").toUpperCase().trim().slice(0, 20);
export function sanitizeWatchlist(w: unknown): string[] | undefined {
  if (!Array.isArray(w)) return undefined;
  return [...new Set(w.map(clean).filter(Boolean))].slice(0, 100);
}
export function sanitizeLevels(l: unknown): Record<string, Level[]> | undefined {
  if (!l || typeof l !== "object") return undefined;
  const out: Record<string, Level[]> = {};
  for (const [sym, list] of Object.entries(l as Record<string, unknown>).slice(0, 200)) {
    if (!Array.isArray(list)) continue;
    const ok = list
      .filter((x: any) => x && Number.isFinite(+x.price) && +x.price > 0)
      .slice(0, 20)
      .map((x: any) => ({ id: String(x.id ?? "").slice(0, 12), price: +x.price, note: String(x.note ?? "").slice(0, 40) }));
    if (ok.length) out[clean(sym)] = ok;
  }
  return out;
}
