// A device turns notifications on/off or updates its watchlist and who it follows.
// No account: the random device ID (kept on the device) is what identifies it.
import { MAX_DEVICES, ownerCodeOk, sanitizeFollowing, sanitizeSub, sanitizeWatchlist, updateDevices, validId } from "@/lib/alerts";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!validId(body.id)) return Response.json({ error: "Bad device ID" }, { status: 400 });
  const now = new Date().toISOString();
  try {
    const r = await updateDevices((store) => {
      const d = store.devices;
      if (body.unsubscribe) { delete d[body.id]; return { ok: true, on: false }; }
      if (!d[body.id] && Object.keys(d).length >= MAX_DEVICES) return { error: "Notifications are full right now. Please try again later." };
      const cur = d[body.id] ?? { id: body.id, sub: null, watchlist: [], added: now, seen: now };
      const sub = sanitizeSub(body.subscription);
      if (sub) cur.sub = sub;
      const w = sanitizeWatchlist(body.watchlist);
      if (w) cur.watchlist = w;
      const fo = sanitizeFollowing(body.following);
      if (fo) cur.following = fo;
      if (body.ownerCode !== undefined) cur.owner = ownerCodeOk(body.ownerCode);
      if (typeof body.instant === "boolean") cur.instant = body.instant;
      delete (cur as any).screens; delete (cur as any).screenMatches; // left over from the removed screener
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
