#!/usr/bin/env node
// Asks the site to send today's held digest (it only does after 5:00 PM New York time,
// and only once). Backstop for the cron-job.org timer; run by the hourly job.
import { SITE, token, siteFetch } from "./lib/site.mjs";
const t = await token();
if (!t) { console.log("No identity token: skipping."); process.exit(0); }
const r = await siteFetch(`${SITE}/api/alerts/release`, { method: "POST", headers: { Authorization: `Bearer ${t}` } });
console.log("Release:", r.status, await r.text());
