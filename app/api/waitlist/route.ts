// POST: join the API early-access list. GET (owner only, with the alerts secret): the list.
// The owner's devices get a push for each new sign-up, so demand is visible as it happens.
import { addSignup, readSignups } from "@/lib/waitlist";
import { pushEach, readDevices, secretOk } from "@/lib/alerts";

const EMAIL = /^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[a-z]{2,24}$/i;
const PLANS = new Set(["free", "hobby", "pro", "unsure"]);

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (b.website) return Response.json({ ok: true }); // a hidden field only bots fill in
  const email = String(b.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  const use = String(b.use ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  const plan = PLANS.has(b.plan) ? b.plan : "unsure";
  try {
    const { total, isNew } = await addSignup({ email, use, plan, at: new Date().toISOString() });
    if (isNew) {
      const owners = Object.values((await readDevices()).devices).filter((d) => d.owner && d.sub);
      await pushEach(owners.map((d) => ({ id: d.id, sub: d.sub!, msg: { title: `API sign-up #${total}`, body: `${email} · ${plan}${use ? ` · ${use.slice(0, 120)}` : ""}`, url: "/developers", tag: "waitlist" } }))).catch(() => {});
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Couldn't save that right now. Please try again in a minute." }, { status: 503 });
  }
}

export async function GET(req: Request) {
  if (!(await secretOk(req))) return Response.json({ error: "unauthorized" }, { status: 401 });
  const list = await readSignups();
  return Response.json({ total: list.length, signups: list });
}
