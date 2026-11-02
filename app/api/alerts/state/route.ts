// Read by the nightly GitHub job (secret required): which stocks and levels to report on.
import { readState, secretOk } from "@/lib/alerts";

export async function GET(req: Request) {
  if (!(await secretOk(req))) return Response.json({ error: "unauthorized" }, { status: 401 });
  const s = await readState();
  return Response.json({ watchlist: s.watchlist, levels: s.levels, devices: s.subscriptions.length, updated: s.updated });
}
