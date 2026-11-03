// For the hourly job only: instant alerts when an executive buys a stock on a device's
// watchlist. Unlike /send, it doesn't touch the daily digest.
import { pushEach, readDevices, secretOk, updateDevices } from "@/lib/alerts";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await secretOk(req))) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const messages: { id: string; title: string; body: string; url?: string }[] = Array.isArray(body?.messages) ? body.messages : [];
  const { devices } = await readDevices();
  const items = messages.flatMap((m) => {
    const d = devices[m.id];
    if (!d?.sub || d.instant === false) return [];
    const url = typeof m.url === "string" && m.url.startsWith("/") ? m.url : "/";
    return [{ id: m.id, sub: d.sub, msg: { title: String(m.title).slice(0, 80), body: String(m.body).slice(0, 300), url, tag: `instant-${url}` } }];
  });
  const r = await pushEach(items);
  if (r.gone.length) await updateDevices((s) => { for (const id of r.gone) delete s.devices[id]; });
  return Response.json({ ...r, messages: messages.length });
}
