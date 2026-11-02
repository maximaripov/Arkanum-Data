// The latest briefing, for the Briefing page (passcode required: it lists your watchlist).
import { passcodeOk, readBriefing } from "@/lib/alerts";
import { marketStatus } from "@/lib/marketStatus";

export async function GET(req: Request) {
  if (!passcodeOk(req)) return Response.json({ error: "Wrong passcode" }, { status: 401 });
  const [b, status] = await Promise.all([readBriefing(), marketStatus()]);
  return Response.json({ ...(b ?? { empty: true }), status }, { headers: { "Cache-Control": "private, no-store" } });
}
