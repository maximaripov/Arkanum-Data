// Sends a test notification to the device asking for it.
import { pushEach, readDevices, updateDevices, validId } from "@/lib/alerts";

export async function POST(req: Request) {
  const { id } = await req.json().catch(() => ({}));
  if (!validId(id)) return Response.json({ error: "Bad device ID" }, { status: 400 });
  const dev = (await readDevices()).devices[id];
  if (!dev?.sub) return Response.json({ error: "This device isn't registered yet" }, { status: 404 });
  const r = await pushEach([{ id, sub: dev.sub, msg: { title: "Form4", body: "Notifications work. Your digest arrives each weekday after the 4 PM close.", url: "/briefing", tag: "test" } }]);
  if (r.gone.length) await updateDevices((s) => { delete s.devices[id]; });
  return Response.json(r, { status: r.sent ? 200 : 502 });
}
