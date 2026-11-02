// Sends a test notification to the device asking for it.
import { passcodeOk, pushTo, readState, writeState } from "@/lib/alerts";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!passcodeOk(req, body)) return Response.json({ error: "Wrong passcode" }, { status: 401 });
  const state = await readState();
  const sub = state.subscriptions.find((s) => s.endpoint === body.endpoint);
  if (!sub) return Response.json({ error: "This device isn't registered yet" }, { status: 404 });
  const r = await pushTo([sub], { title: "Foresight", body: "Notifications work. Your daily briefing arrives after the US close on weekdays.", url: "/briefing", tag: "test" });
  if (r.gone.length) await writeState({ ...state, subscriptions: state.subscriptions.filter((s) => !r.gone.includes(s.endpoint)) });
  return Response.json(r, { status: r.sent ? 200 : 502 });
}
