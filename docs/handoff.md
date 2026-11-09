# Arkanum Data: handoff (paste or attach this to start a new chat)

Updated 2026-11-09, after round 77. Full history: `docs/build-log.md` (rounds 1-77); add new rounds there.

## 1. What it is
- **Arkanum Data**: free insider-trade and House-member trade site with tested evidence next to each trade. Tagline: "Other sites sell you insider signals. We test them." No accounts, no income, must stay free.
- **Live:** https://arkanumdata.vercel.app (Vercel Hobby). **Repo:** github.com/maximaripov/Arkanum-Data. It is **public** so GitHub Actions minutes are unlimited; there's no LICENSE file, so all rights are reserved.
- Next.js 16 App Router. It's newer than most training data, so read `node_modules/next/dist/docs/` before writing Next-specific code.

## 2. Working rules (owner's standing instructions)
- **Advisor role:** be a rigorous, honest advisor, not an assistant. Lead with the main criticism, flag inference vs evidence, say plainly when something is good enough to ship, and use plain language. The owner likes options in batches.
- **Bugs:** fix bugs on your own without asking. Diagnose anything that depends on SEC with `diagnose.yml`, because SEC blocks the sandbox.
- **Before pushing:** `npm test` and `npx tsc --noEmit` must pass.
- **Pushing:** push to `main` and to the session's `claude/...` branch. Merge `origin/main`; never rebase, because force-pushes are blocked.
- **Batch pushes (owner, 2026-11-09):** every push to `main` is a full Vercel deploy. Commit as you go, but push once per task (or once per session), not after each change.
- **Commit identity:**
  - Author: `maximaripov <351230404+maximaripov@users.noreply.github.com>`. Vercel deploys only that author.
  - Committer: `noreply@anthropic.com`; a session hook requires it.
  - Use: `git -c user.name=Claude -c user.email=noreply@anthropic.com commit --author="maximaripov <351230404+maximaripov@users.noreply.github.com>"`
  - End each message with the Co-Authored-By and Claude-Session trailers. No model names in commits.
- **Verify before reporting:** check the live site with Playwright on phone and desktop. Show design changes as screenshots before shipping.
- **Ping:** send a PushNotification to the owner's phone when a task is done.
- **No emoji anywhere** (enforced by `tests/no-emoji.test.mjs`); ▲ ▼ › ↗ × are fine.
- **No mention of GitHub on the site** (owner, 2026-11-09). Comments in the code are fine.
- **Contact:** the owner's email is shown on About → Contact, at the owner's explicit request. Never put it in request headers, User-Agents or API calls.
- **Secrets:** never store `ALERTS_PASSCODE`, `CRON_SECRET` or tokens in code. GitHub secret: `SEC_USER_AGENT`.
- **Don't re-suggest** (declined):
  - archive pages of every buy;
  - Vercel Analytics traffic checks;
  - Form 144 notices;
  - watchlist sale alerts;
  - a Congress late-disclosures page;
  - Search Console or Bing;
  - re-adding the old domains;
  - the "restrained" redesign and the Bloomberg look;
  - "today's most unusual buys" as the main call to action;
  - email or SMS digests;
  - an AI assistant;
  - a custom domain for now.
- **Senate data:** impossible, because the Senate's site blocks automation.

## 3. Design
- **Style:** retro terminal look.
  - Dark mode: black background, green `#3ddc84` for buys, red `#ff5f56` for sales.
  - Light mode: black on white with `#066b2e`, `#a61c23` and `#85560f` (WCAG AA).
  - Monospace (JetBrains Mono) throughout, square corners, `>` prompt headings, inverse-video active tabs.
- **Logo:** a ring with a broken-off drop, next to lowercase `arkanum`.
- **Market quotes:** only through TradingView embeds.
- **Footer:**
  - Links: About · Methodology · Open data · Privacy · Research · Terms · Past digests · Contact.
  - Small-print credits.
  - "© {year} Arkanum Data. All rights reserved." Terms has a Copyright section.
- **robots.txt:** blocks AI training crawlers (`BLOCK_AI_TRAINING = true` in `app/robots.ts`).
- **Vercel Firewall** (set by API 2026-11-09, round 77): (1) deny AI training crawlers by User-Agent (same list as robots.ts; keep the two in sync); (2) rate limit `/stock/*`, `/insider/*`, `/api/*` except `/api/alerts/*`: 40 requests per minute per IP, then 429. `/data/*` is never covered, because the site's own functions fetch it. Read or change with `GET/PUT https://api.vercel.com/v1/security/firewall/config?projectId=prj_Y2wu1SJDKK4fcbwNXcI2wvPhh1LK&teamId=team_mx8WiIrxvt7w6bBT2jvL8t6q`. Testing from the sandbox needs one reused connection (curl with many URLs), because its outgoing IP changes per connection.
- **vercel.json:** turns off preview deploys for `claude/**` branches.
- **next.config.mjs:** leaves `sharp` out of server functions, which keeps Functions Storage down.

## 4. Pages
- **`/` (home):**
  - Intro box with the tagline and three steps: look up (via the header search; the big search box is gone), follow, report card.
  - "What actually mattered" strip, all six-month medians:
    - stocks under $5: −2.6%
    - $1M+ buys: −4.7%, and CEO buys also trailed
    - pre-planned buys: −6.9%
    - insider buys vs the S&P 500: −5.4%
  - A note says "vs other insider buys" means the month's typical insider buy, not the market.
  - The overview lists are server-rendered: `app/page.tsx` fetches overview.json with revalidate 900 and passes it to `InsidersView`.
  - Tabs: Overview, Group buys, All trades, Big funds, Well-known.
  - "How unusual" is a 0-100 score with a one-line explainer. It describes the trade, not the outlook.
- **Stocks and insiders:**
  - `/stock/[symbol]` and `/insider/[cik]` (Follow) are server-rendered.
  - Every trade shows a "Trades like this" evidence line (`components/Evidence.tsx`, from `lib/evidence.json`).
  - Since-filing returns are shown alone and vs the S&P 500.
- **Congress:**
  - `/congress` is titled "Congress trades (House)".
  - Time windows: 30d, 90d, 1y, 2y.
  - Lists are ranked by estimated dollars (range midpoints, marked as estimated).
  - Filters: size, party, date, state.
  - `/congress/[member]` (101 members) has Follow and returns.
- **Digest:**
  - `/briefing` shows the latest digest only. Past digests are on `/briefing/archive`, linked from the digest page and the footer.
  - Dated pages live at `/briefing/[date]`.
  - The daily is released at 5 PM ET by cron-job.org calling `/api/alerts/release`. The week in review comes out on Saturdays.
- **Research:**
  - `/research`: key findings, report card link, how we test, both papers.
  - `/research/insider-buys`: paper no. 1.
  - `/research/insider-sales`: paper no. 2.
  - `/research/report-card`: each label, 2023-25 vs since January 2026.
  - `/research/<paper>/print`: PDF version of each paper.
- **Other pages:** `/open-data` (the research tables are "available on request"), `/about` (methodology, freshness, privacy, contact), `/terms`, `/markets`, `/stakes`.
- **Search:** covers stocks, insiders (23k), House members and funds.

## 5. Research (the site's core claim)
- **Data:**
  - `docs/backtest/results.json`: 22,951 buys, 2023-25.
  - `sales.json`: 84,133 sales.
  - `oos-2026.json` and `sales-2026.json`: filings since January 2026, refreshed monthly by `research-refresh.yml`.
  - Read through `lib/research.ts`. Findings come from `lib/findings.ts`, built from the same numbers.
- **Error ranges:** each six-month median carries a 90% range. It comes from a month-block bootstrap (`lib/bootstrap.mjs`) that resamples whole filing months, because trades filed in the same month move together.
- **Verdict rule** (`judge()` in `lib/research.ts`; `MIN_MONTHS = 12` in `lib/researchClaims.mjs`):
  - "Too early" until 2026 has 12 filing months with six-month returns, which is about early 2028.
  - After that, "Changed" only if the 2026 range and the 2023-25 range don't overlap; otherwise "Holds".
  - Papers branch on it: `oosState()` (early / warns / same) in the sales paper, `early()` in the buys paper.
  - Never add a 2026 claim that bypasses this rule.
- **Watch item:** large unplanned sales filed in 2026 have a range of −5.1% to −2.1%, against −0.8% to +0.7% for 2023-25. The ranges don't overlap, but 2026 only has 5 months. If it holds, then around spring 2027 the verdict flips by itself to "Changed: now more of a warning". Paper no. 2's discussion would then need rewriting by hand.
- **Reruns:**
  - `backtest.yml`: inputs from 2023q1, to 2025q4, history 2020q1.
  - `diagnose.yml` running `sales-study.mjs` with args `2023q1 2025q4 2022q1`. It prints JSON between RESULT_JSON_START and RESULT_JSON_END in the log, which you copy into `sales.json`.
  - `research-refresh.yml`: the 2026 files.
  - `scripts/build-evidence.mjs` rebuilds `lib/evidence.json` during prebuild.

## 6. Data jobs (GitHub Actions; they often start 30-60 min late)
- `data.yml`: weekdays at 4:02 PM ET (fundamentals, insiders, overview, people, well-known, funds, events, health check, digest).
- `insiders-hourly.yml`: weekdays, every two hours, roughly 7 AM to 11 PM ET (was hourly until 2026-11-09; each commit is a full deploy, which used up runtime cache writes). The file name kept "hourly".
- `congress.yml` and `stakes.yml`: daily.
- Manual: `people-backfill.yml`, `backtest.yml`, `diagnose.yml`, `research-refresh.yml`. Rerun `people-backfill` after each SEC quarter.
- **Data gotcha:** read trade files through `mergeInsiders()` or `cleanTrades()`, which fix doubled filings and totals typed into the price field.

## 7. Monitoring
- Two daily routines post to the pinned "Arkanum Usage" session (`session_01FV3qJV8Wgyssc1swtx1Eho`). They post results every day and ping the owner only when there's an issue.
  - Usage check: 7:37 PM ET (`trig_01E5A35A5tgeZXtuvtMvqfSj`).
  - Content check: 8:34 PM ET (`trig_014ngq1ztgL5aJVRk9BKYxXQ`).
- A one-off "Check Monday Daily Digest" task (`trig_0183hKbFgkaW5iU519nzWBuY`) fires 2026-11-09 22:15 UTC into the previous session.
- **Vercel API token:** works (re-saved 2026-11-09, round 75). Usage API: `GET https://api.vercel.com/v2/usage?teamId=team_mx8WiIrxvt7w6bBT2jvL8t6q&type=data_cache` (or `requests`) with ISO `from`/`to` including milliseconds; `granularity=hour` for hourly. Readable on Hobby: data cache bytes, requests, function GB-hours and invocations, builds, deployments. Not readable on Hobby (Pro-only API): Active CPU and Functions Storage; check those on the Usage page.
- **Usage:** Vercel Functions Storage once hit its limit. It was fixed by leaving out sharp and keeping deployments for 1 day.

## 8. Open items and ideas
- **Waiting on the owner:**
  - delete the stale branches `proto-news`, `proto-track` and `round2`.
- **Owner was told:**
  - a plain email on the site attracts spam (a site-only address would help);
  - the code is publicly readable while the repo is public;
  - protecting the Arkanum name is a trademark matter.
- **Name risk:** "Arkanum" is close to the ARCANUM trademark in financial services (Arcanum Global). Revisit before anything commercial.
- **Ideas not started:** Bluesky auto-post bot, buybacks, weekly archive pages.
