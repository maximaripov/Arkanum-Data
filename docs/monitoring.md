# Daily monitoring routines

Two scheduled routines post into the pinned "Arkanum Usage" chat (`session_01FV3qJV8Wgyssc1swtx1Eho`). Their instructions can only be changed from that chat. To apply this file there, say: "Update both daily routines' prompts to the versions in docs/monitoring.md on main."

Why these versions (2026-11-09): Vercel Bot Protection now challenges cloud machines, so HTML pages answer 429 "Vercel Security Checkpoint" to the routines; the insider job runs every two hours; the Vercel API token works, so the usage check reads cache writes, functions and the firewall directly. Updated 2026-11-13: the site moved to arkanumdata.com, so both checks test the new domain; the usage check also confirms the old address still serves data.

## Usage check (trig_01E5A35A5tgeZXtuvtMvqfSj, 7:37 PM ET)

```
Run today's Arkanum daily usage and storage check (the first of two daily checks in this chat; the 8:34 PM one checks the site's content). This session has the repo maximaripov/Arkanum-Data attached, so GitHub API calls work here. The site is Next.js on Vercel Hobby at https://arkanumdata.com (moved from arkanumdata.vercel.app on 2026-11-13; the old address still serves /data, /api and the service worker for the jobs and old alert subscriptions, and sends pages to the new domain); GitHub Actions commit data to main and every push to main redeploys. Report only: do not change code, settings or data. Never put the owner's email in requests.

Start from a fresh copy: git fetch origin main and check out origin/main (deepen with git fetch --deepen if a 7-day-old commit is needed). Then:

1. GitHub Actions, last 24 h: runs by workflow and conclusion; report any failure, cancelled or timed_out (workflow, time, html_url, failing step). Report scheduled workflows that should have run but didn't: insiders-hourly (every two hours on weekdays since 2026-11-09, despite the name), data.yml (daily), congress.yml (weekday evenings), weekly-digest (Saturdays), research-refresh (5th of the month). Report open issues labelled "alert".
2. Repo: still public ("visibility" of /repos/maximaripov/Arkanum-Data) and its "size" in KB (warn above 500,000; it was 13,509 on 2026-11-09).
3. Vercel API (the saved network secret adds the token; team team_mx8WiIrxvt7w6bBT2jvL8t6q, project prj_Y2wu1SJDKK4fcbwNXcI2wvPhh1LK; dates as ISO with milliseconds, e.g. 2026-11-09T00:00:00.000Z):
   a. Deployments in the last 24 h (GET https://api.vercel.com/v6/deployments?projectId=...&teamId=...&limit=100) by target and state; warn on any ERROR, and if deployments exceed 60 in 24 h (Hobby caps them at 100 a day).
   b. Runtime cache writes: GET https://api.vercel.com/v2/usage?teamId=...&type=data_cache&from=<7 days ago>&to=<now>; data_cache_total_received_bytes per day is writes. Show the last 3 days; warn if yesterday was over 100 MB (it was about 320 MB/day before the 2026-11-09 fixes).
   c. Functions and traffic: same endpoint with type=requests. Yesterday's function_execution_successful_gb_hours, invocations, error+timeout counts, request_hit_count + request_miss_count. Warn if GB-hours over 2, errors+timeouts over 50, or requests more than 3x the 7-day average (possible attack).
   d. Firewall: GET https://api.vercel.com/v1/security/firewall/config/active?projectId=...&teamId=... Warn if firewallEnabled is false, or the AI-crawler deny rule, the rate-limit rule, the bypass rule or managedRules.bot_protection is missing or inactive.
   If the API answers missing token or forbidden: "ISSUE: Vercel API token not working"; fix: re-save the network secret for api.vercel.com (header Authorization, prefix Bearer, value without the word Bearer).
4. Functions size: npm ci && npm run build, then sum files listed in every .next/server/**/*.nft.json (paths relative to each nft file). Report the largest; warn if over 15 MB or if any node_modules/@img or sharp file is traced.
5. Data size: public/data and docs/backtest; warn if public/data is over 60 MB or any file there over 10 MB; compare with the newest commit older than 7 days (git ls-tree -r -l) and warn on growth over 25%.
6. Site health: GET /data/overview.json, /data/insiders-today.json, /sitemap.xml, /robots.txt, /feeds/congress.xml on https://arkanumdata.com; all must be 200 (these skip Bot Protection), and /sitemap.xml must be XML, not HTML. Also GET https://arkanumdata.vercel.app/data/insiders-today.json: must be 200 JSON (the jobs and old alert subscriptions still use the old address). On a weekday after 10 AM New York time, warn if /data/insiders-today.json "updated" is over 3 hours old. HTML pages may answer 429 titled "Vercel Security Checkpoint": expected, not an issue.
7. Active CPU and Functions Storage can't be read on Hobby (that API is Pro-only); say so in one line.

Always post the full results in this chat, starting with "Usage check <date>: no issues" or "Usage check <date>: N issue(s)", then one line per check with its numbers, marking issues with ISSUE: and the likely fix. Under 22 lines. Send ONE PushNotification (under 200 characters, leading with the most important issue) only if there is at least one issue.
```

## Content check (trig_014ngq1ztgL5aJVRk9BKYxXQ, 8:34 PM ET)

```
Run today's Arkanum content check: does the live site look up to date and ordinary? (The second daily check in this chat; the 7:37 PM one covers usage.) Site: https://arkanumdata.com (moved from arkanumdata.vercel.app on 2026-11-13; data from GitHub Actions in the attached repo maximaripov/Arkanum-Data, whose code shows what each page should show). Report only: do not change code, settings or data. Never put the owner's email in requests. Times are New York time. A trading day is a weekday that isn't an NYSE holiday (marketClosed in lib/marketDays.mjs). Never flag staleness the calendar explains.

Bot Protection: Vercel challenges cloud machines, so HTML pages may answer 429 titled "Vercel Security Checkpoint". Expected, not an issue. If so, skip steps 1 and 3, say "HTML checks skipped: pages behind Bot Protection" in one line, and run every data-file check (/data/*, /feeds/*, /api/alerts/digest, /sitemap.xml, /robots.txt skip Bot Protection). If pages load, run everything.

1. Pages: GET /, /congress, /congress/nancy-pelosi, /research, /research/insider-buys, /research/insider-sales, /markets, /stakes, /briefing, /stock/NVDA, /stock/AAPL, /sitemap.xml, /robots.txt. Issue: any non-200 other than the checkpoint, or an HTML page under 5 KB.
2. Freshness: /data/insiders-today.json "updated" (every two hours on trading days: after 10 AM, issue if over 3 hours old; otherwise if older than the last trading day's 6 PM); newest "filed" in /data/insiders.json (issue if before the last trading day); /data/congress-overview.json "updated" (issue if over 2 days old on a weekday, 4 after a weekend) and "returnsAsOf" (issue if over 5 days old); "updated" in /data/screener.json and /data/funds.json (issue if over 3 days old). /api/alerts/digest should be the last trading day's digest after 6 PM; Saturday evening, the week in review too.
3. Ordinary (page HTML): issue on "NaN", "undefined", "Infinity", "[object Object]", "Something went wrong", "Couldn't reach", "aren't available right now", or "Loading…" in server-rendered HTML; empty lists that normally have rows; /stock/NVDA and /stock/AAPL without revenue and net income; /congress/nancy-pelosi without "trades did"; impossible numbers (over 10,000%, negative share counts, a trade over $1T, dates after today or before 2020, "Coming up" dates before today).
4. Ticker: /data/insiders-today.json should contain trades on a trading day after 11 AM.
5. Data sanity: /data/overview.json lists have rows; /data/congress-overview.json lists members and trades; no NaN or null numbers in the first 20 rows of each. Compare with previous content checks in this chat: issue on sharp changes (a list from many rows to few, a count halved, a file much smaller).

Always post the full results in this chat, starting with "Content check <date>: site looks normal" or "Content check <date>: N issue(s)", then one line per check, marking issues with ISSUE: and the likely cause. Under 20 lines. Send ONE PushNotification (under 200 characters, leading with the most important issue) only if there is at least one issue.
```
