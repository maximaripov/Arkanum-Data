// Short alert from the 4 PM job (e.g. "something broke"); same identity check as /send.
import { pushTo, readState, secretOk, writeState } from "@/lib/alerts";

export async function POST(req: Request) {
  if (!(await secretOk(req))) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { title, body, url } = await req.json().catch(() => ({}));
  if (!title || !body) return Response.json({ error: "title and body required" }, { status: 400 });
  const state = await readState();
  const r = await pushTo(state.subscriptions, { title: String(title).slice(0, 80), body: String(body).slice(0, 300), url: typeof url === "string" ? url : "/briefing", tag: "health" });
  if (r.gone.length) await writeState({ ...state, subscriptions: state.subscriptions.filter((s) => !r.gone.includes(s.endpoint)) });
  return Response.json(r);
}
