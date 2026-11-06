// Releases the held digest at 5:00 PM New York time. Called by the cron-job.org timer
// (Bearer CRON_SECRET) and, as a backstop, by the hourly GitHub job. Before 5 it does
// nothing and reads no storage; after 5 it sends today's held digest once.
import { cronOk, pastSendTime, releaseDigest, secretOk } from "@/lib/alerts";

export const maxDuration = 60;

async function handle(req: Request) {
  if (!cronOk(req) && !(await secretOk(req))) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!pastSendTime()) return Response.json({ released: false, reason: "before 5:00 PM New York time" });
  return Response.json(await releaseDigest(), { headers: { "Cache-Control": "no-store" } });
}
export const GET = handle;
export const POST = handle;
