// The shared watchlist and price levels every device loads on open (passcode required).
import { passcodeOk, readState } from "@/lib/alerts";

export async function GET(req: Request) {
  if (!passcodeOk(req)) return Response.json({ error: "Wrong passcode" }, { status: 401 });
  const s = await readState();
  return Response.json(
    { watchlist: s.watchlist, levels: s.levels, updated: s.updated },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
