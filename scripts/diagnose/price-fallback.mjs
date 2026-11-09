// Does the Tiingo price fallback (lib/returns.mjs) work when Yahoo fails? Checks it here on
// GitHub (TIINGO_API_KEY secret) and on Vercel (TIINGO_API_KEY environment variable, through
// /api/alerts/price-check). Yahoo is made to fail on purpose; nothing is written.
import { dailyCloses } from "../../lib/returns.mjs";
import { SITE, siteFetch, token } from "../lib/site.mjs";

const yahooDown = (u, o) => (/yahoo/.test(String(u)) ? Promise.resolve(new Response(null, { status: 503 })) : fetch(u, o));
const gh = await dailyCloses("SPY", "2026-10-01", { fetchImpl: yahooDown });
const yahoo = await dailyCloses("SPY", "2026-10-01");
console.log(`GitHub: key ${process.env.TIINGO_API_KEY ? "set" : "MISSING"}; Tiingo rows ${gh?.length ?? "none"}; last ${JSON.stringify(gh?.at(-1))}`);
console.log(`GitHub: Yahoo (normal) rows ${yahoo?.length ?? "none"}; last ${JSON.stringify(yahoo?.at(-1))}`);

const t = await token();
if (!t) { console.log("Vercel: no OIDC token (needs id-token: write and a run on main)"); process.exit(1); }
const r = await siteFetch(`${SITE}/api/alerts/price-check`, { headers: { Authorization: `Bearer ${t}` } });
console.log(`Vercel: HTTP ${r.status} ${await r.text()}`);
if (!gh || !r.ok) process.exit(1);
