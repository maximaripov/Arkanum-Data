// The live site, and the GitHub job's proof of identity for its protected endpoints
// (a GitHub OIDC token; ALERTS_SECRET works instead when running by hand).
export const SITE = (process.env.SITE_URL || "https://form4-insiders.vercel.app").replace(/\/$/, "");

export async function token() {
  if (process.env.ALERTS_SECRET) return process.env.ALERTS_SECRET;
  const { ACTIONS_ID_TOKEN_REQUEST_URL: u, ACTIONS_ID_TOKEN_REQUEST_TOKEN: b } = process.env;
  if (!u || !b) return null;
  const r = await fetch(`${u}&audience=foresight-alerts`, { headers: { Authorization: `Bearer ${b}` } });
  return r.ok ? (await r.json()).value : null;
}
