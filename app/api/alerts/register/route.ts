// A device turns notifications on/off or updates its watchlist and saved screens.
// No account: the random device ID (kept on the device) is what identifies it.
import { MAX_DEVICES, ownerCodeOk, sanitizeScreens, sanitizeSub, sanitizeWatchlist, updateDevices, validId } from "@/lib/alerts";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!validId(body.id)) return Response.json({ error: "Bad device ID" }, { status: 400 });
  const now = new Date().toISOString();
  try {
    const r = await updateDevices((store) => {
      const d = store.devices;
      if (body.unsubscribe) { delete d[body.id]; return { ok: true, on: false }; }
      if (!d[body.id] && Object.keys(d).length >= MAX_DEVICES) return { error: "Notifications are full right now. Please try again later." };
      const cur = d[body.id] ?? { id: body.id, sub: null, watchlist: [], screens: [], screenMatches: {}, added: now, seen: now };
      const sub = sanitizeSub(body.subscription);
      if (sub) cur.sub = sub;
      const w = sanitizeWatchlist(body.watchlist);
      if (w) cur.watchlist = w;
      const sc = sanitizeScreens(body.screens);
      if (sc) cur.screens = sc;
      if (body.ownerCode !== undefined) cur.owner = ownerCodeOk(body.ownerCode);
      if (typeof body.instant === "boolean") cur.instant = body.instant;
      cur.seen = now;
      if (!cur.sub) return { ok: true, on: false }; // only devices with notifications on are stored
      d[body.id] = cur;
      return { ok: true, on: true, owner: !!cur.owner };
    });
    return Response.json(r, { status: "error" in r ? 503 : 200 });
  } catch (e: any) {
    return Response.json({ error: e.message ?? "Server error" }, { status: 503 });
  }
}
