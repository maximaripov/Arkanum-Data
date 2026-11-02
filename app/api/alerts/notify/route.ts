// Health alerts from the 4 PM job, sent only to the owner's devices.
import { pushEach, readDevices, secretOk } from "@/lib/alerts";

export async function POST(req: Request) {
  if (!(await secretOk(req))) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { title, body, url } = await req.json().catch(() => ({}));
  if (!title || !body) return Response.json({ error: "title and body required" }, { status: 400 });
  const owners = Object.values((await readDevices()).devices).filter((d) => d.owner && d.sub);
  const r = await pushEach(owners.map((d) => ({ id: d.id, sub: d.sub!, msg: { title: String(title).slice(0, 80), body: String(body).slice(0, 300), url: typeof url === "string" ? url : "/briefing", tag: "health" } })));
  return Response.json({ ...r, owners: owners.length });
}
