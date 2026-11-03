// For the scheduled jobs only: each device's watchlist and screens (no push addresses).
import { readDevices, secretOk } from "@/lib/alerts";

export async function GET(req: Request) {
  if (!(await secretOk(req))) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { devices } = await readDevices();
  return Response.json(Object.values(devices).map(({ id, watchlist, screens, screenMatches, instant, following }) => ({ id, watchlist, screens, screenMatches, instant: instant !== false, following: following ?? [] })));
}
