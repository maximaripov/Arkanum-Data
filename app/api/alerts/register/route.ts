// A device turns notifications on/off or updates its watchlist and who it follows.
// No account: the random device ID (kept on the device) is what identifies it.
import { MAX_DEVICES, ownerCodeOk, readDevices, sanitizeFollowing, sanitizeStrategies, sanitizeSub, sanitizeWatchlist, updateDevices, validId } from "@/lib/alerts";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!validId(body.id)) return Response.json({ error: "Bad device ID" }, { status: 400 });
  if (body.subscription !== undefined && !sanitizeSub(body.subscription)) return Response.json({ error: "Not a browser push subscription" }, { status: 400 });
  const now = new Date().toISOString();
  try {
    // A request with no subscription only matters for a device that's already on: check with
    // a plain read first, so unknown IDs never reach the (metered) write path.
    if (!body.subscription && !(await readDevices()).devices[body.id]) return Response.json({ ok: true, on: false });
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
      const st = sanitizeStrategies(body.strategies);
      if (st) cur.strategies = st;
      if (body.ownerCode !== undefined) cur.owner = ownerCodeOk(body.ownerCode);
      if (typeof body.instant === "boolean") cur.instant = body.instant;
      delete (cur as any).screens; delete (cur as any).screenMatches; // left over from the removed screener
      if (!cur.seen || Date.parse(now) - Date.parse(cur.seen) > 86_400_000) cur.seen = now; // daily is enough for pruning idle devices
      if (!cur.sub) return { ok: true, on: false }; // only devices with notifications on are stored
      d[body.id] = cur;
      return { ok: true, on: true, owner: !!cur.owner };
    });
    return Response.json(r, { status: "error" in r ? 503 : 200 });
  } catch (e) {
    console.error("register", e); // storage errors stay in the logs, not in the response
    return Response.json({ error: "Notifications are unavailable right now. Please try again later." }, { status: 503 });
  }
}
