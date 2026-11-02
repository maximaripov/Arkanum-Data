// Called by the nightly GitHub job (secret required): stores the briefing and notifies every device.
import { pushTo, readState, secretOk, writeBriefing, writeState } from "@/lib/alerts";

export const maxDuration = 30;

export async function POST(req: Request) {
  if (!(await secretOk(req))) return Response.json({ error: "unauthorized" }, { status: 401 });
  const briefing = await req.json().catch(() => null);
  if (!briefing?.title || !briefing?.body) return Response.json({ error: "briefing needs title and body" }, { status: 400 });
  await writeBriefing(briefing);
  const state = await readState();
  const r = await pushTo(state.subscriptions, { title: briefing.title, body: briefing.body, url: "/briefing", tag: "briefing" });
  if (r.gone.length) await writeState({ ...state, subscriptions: state.subscriptions.filter((s) => !r.gone.includes(s.endpoint)) });
  return Response.json({ ...r, devices: state.subscriptions.length });
}
