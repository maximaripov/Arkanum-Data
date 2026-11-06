#!/usr/bin/env node
// Sends a short notification to your phone from the GitHub job.
//   node scripts/notify.mjs "Title" "Body" [url]
// If the site can't deliver it (down, moved, or rejecting the job), opens a GitHub issue instead.
import { SITE, token, siteFetch } from "./lib/site.mjs";
import { issueAlert } from "./lib/issue-alert.mjs";
const [title, body, url] = process.argv.slice(2);
const t = await token();
let sent = false;
if (!t) console.log("No identity token: would have sent:", title, "|", body);
else {
  try {
    const r = await siteFetch(`${SITE}/api/alerts/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ title, body, url }),
    });
    console.log("Notify:", r.status, await r.text());
    sent = r.ok;
  } catch (e) { console.log("Notify failed:", e.cause?.code ?? e.message); }
}
if (!sent && process.env.GITHUB_ACTIONS) await issueAlert({ title, body, url });
