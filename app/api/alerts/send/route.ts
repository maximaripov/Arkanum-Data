// For the 4 PM job only: stores the public digest and sends each device its own message,
// or, with hold, keeps the messages until 5:00 PM New York time (see releaseDigest).
import { holdDigest, pastSendTime, secretOk, sendDigestMessages, writeDigest, type DigestMessage } from "@/lib/alerts";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await secretOk(req))) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.digest) return Response.json({ error: "digest required" }, { status: 400 });
  await writeDigest(body.digest);
  const messages: DigestMessage[] = Array.isArray(body.messages) ? body.messages : [];
  if (body.notify === false) return Response.json({ sent: 0, messages: messages.length, notify: false });
  if (body.hold && !pastSendTime()) {
    await holdDigest(messages);
    return Response.json({ held: true, messages: messages.length, sendsAt: "17:00 America/New_York" });
  }
  return Response.json(await sendDigestMessages(messages));
}
