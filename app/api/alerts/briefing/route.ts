// The latest briefing, for the Briefing page (passcode required: it lists your watchlist).
import { passcodeOk, readBriefing } from "@/lib/alerts";

export async function GET(req: Request) {
  if (!passcodeOk(req)) return Response.json({ error: "Wrong passcode" }, { status: 401 });
  return Response.json((await readBriefing()) ?? { empty: true }, { headers: { "Cache-Control": "private, no-store" } });
}
