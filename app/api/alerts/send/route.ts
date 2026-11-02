// For the 4 PM job only: stores the public digest and sends each device its own message.
import { pushEach, secretOk, updateDevices, writeDigest, readDevices } from "@/lib/alerts";

export const maxDuration = 60;
const STALE_DAYS = 120; // forget devices that haven't opened the app in ~4 months

export async function POST(req: Request) {
  if (!(await secretOk(req))) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.digest) return Response.json({ error: "digest required" }, { status: 400 });
  await writeDigest(body.digest);
  const messages: { id: string; title: string; body: string }[] = Array.isArray(body.messages) ? body.messages : [];
  const { devices } = await readDevices();
  const items = body.notify === false ? [] : messages.flatMap((m) => {
    const d = devices[m.id];
    return d?.sub ? [{ id: m.id, sub: d.sub, msg: { title: String(m.title).slice(0, 80), body: String(m.body).slice(0, 300), url: "/briefing", tag: "digest" } }] : [];
  });
  const r = await pushEach(items);
  const cutoff = Date.now() - STALE_DAYS * 86_400_000;
  await updateDevices((s) => {
    for (const id of r.gone) delete s.devices[id];
    for (const [id, d] of Object.entries(s.devices)) if (Date.parse(d.seen) < cutoff) delete s.devices[id];
    for (const [id, m] of Object.entries((body.screenMatches ?? {}) as Record<string, Record<string, string[]>>))
      if (s.devices[id]) s.devices[id].screenMatches = m;
  });
  return Response.json({ ...r, devices: Object.keys(devices).length, messages: messages.length });
}
