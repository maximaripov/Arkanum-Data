// The 10-year Treasury yield and crypto prices for the Markets page and the digest.
import { markets } from "@/lib/macro";

export const revalidate = 300;
export const maxDuration = 30;

export async function GET() {
  const groups = await markets();
  return Response.json({ updated: new Date().toISOString(), groups }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } });
}
