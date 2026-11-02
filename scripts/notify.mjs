#!/usr/bin/env node
// Sends a short notification to your phone from the GitHub job.
//   node scripts/notify.mjs "Title" "Body" [url]
const [title, body, url] = process.argv.slice(2);
const SITE = (process.env.SITE_URL || "https://foresightscreener.vercel.app").replace(/\/$/, "");
async function token() {
  if (process.env.ALERTS_SECRET) return process.env.ALERTS_SECRET;
  const { ACTIONS_ID_TOKEN_REQUEST_URL: u, ACTIONS_ID_TOKEN_REQUEST_TOKEN: b } = process.env;
  if (!u || !b) return null;
  const r = await fetch(`${u}&audience=foresight-alerts`, { headers: { Authorization: `Bearer ${b}` } });
  return r.ok ? (await r.json()).value : null;
}
const t = await token();
if (!t) { console.log("No identity token: would have sent:", title, "|", body); process.exit(0); }
const r = await fetch(`${SITE}/api/alerts/notify`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
  body: JSON.stringify({ title, body, url }),
});
console.log("Notify:", r.status, await r.text());
