// The live site, and the GitHub job's proof of identity for its protected endpoints
// (a GitHub OIDC token; ALERTS_SECRET works instead when running by hand).
export const SITE = (process.env.SITE_URL || "https://form4-insiders.vercel.app").replace(/\/$/, "");

/** fetch that retries when the request never reached the server (DNS, connection
 *  refused or reset), so a brief network blip on the runner doesn't drop alerts. HTTP
 *  error responses are returned as they are: the server got the request. */
export async function siteFetch(url, opts, waits = [5_000, 15_000]) {
  for (let i = 0; ; i++) {
    try { return await fetch(url, opts); }
    catch (e) {
      if (i >= waits.length) throw e;
      console.warn(`${url}: ${e.cause?.code ?? e.message}; retrying in ${waits[i] / 1000}s`);
      await new Promise((r) => setTimeout(r, waits[i]));
    }
  }
}

export async function token() {
  if (process.env.ALERTS_SECRET) return process.env.ALERTS_SECRET;
  const { ACTIONS_ID_TOKEN_REQUEST_URL: u, ACTIONS_ID_TOKEN_REQUEST_TOKEN: b } = process.env;
  if (!u || !b) return null;
  const r = await siteFetch(`${u}&audience=foresight-alerts`, { headers: { Authorization: `Bearer ${b}` } });
  return r.ok ? (await r.json()).value : null;
}
