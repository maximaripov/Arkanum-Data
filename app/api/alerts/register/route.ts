// Called by your phone: registers it for notifications and/or syncs watchlist + levels.
import { passcodeOk, readState, sanitizeLevels, sanitizeScreens, sanitizeWatchlist, writeState } from "@/lib/alerts";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!passcodeOk(req, body)) return Response.json({ error: "Wrong passcode" }, { status: 401 });
  const state = await readState();
  const sub = body.subscription;
  if (sub?.endpoint && sub?.keys?.p256dh && sub?.keys?.auth) {
    state.subscriptions = [
      ...state.subscriptions.filter((s) => s.endpoint !== sub.endpoint),
      { endpoint: String(sub.endpoint), keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) }, added: new Date().toISOString() },
    ].slice(-10); // at most 10 devices
  }
  if (body.unsubscribe && typeof body.unsubscribe === "string")
    state.subscriptions = state.subscriptions.filter((s) => s.endpoint !== body.unsubscribe);
  const w = sanitizeWatchlist(body.watchlist);
  if (w) state.watchlist = w;
  const l = sanitizeLevels(body.levels);
  if (l) state.levels = l;
  const sc = sanitizeScreens(body.screens);
  if (sc) state.screens = sc;
  const updated = await writeState(state);
  return Response.json({ ok: true, devices: state.subscriptions.length, watchlist: state.watchlist.length, updated });
}
