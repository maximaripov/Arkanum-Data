import { search } from "@/lib/yahoo";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return Response.json([]);
  try {
    return Response.json(await search(q));
  } catch {
    return Response.json([]);
  }
}
