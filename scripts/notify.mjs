#!/usr/bin/env node
// Sends a short notification to your phone from the GitHub job.
//   node scripts/notify.mjs "Title" "Body" [url]
import { SITE, token } from "./lib/site.mjs";
const [title, body, url] = process.argv.slice(2);
const t = await token();
if (!t) { console.log("No identity token: would have sent:", title, "|", body); process.exit(0); }
const r = await fetch(`${SITE}/api/alerts/notify`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
  body: JSON.stringify({ title, body, url }),
});
console.log("Notify:", r.status, await r.text());
