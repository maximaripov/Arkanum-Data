# Usage audit (2026-11-12, round 95)

From the Vercel usage API (`/v2/usage`, types requests, data_cache, builds, storage_blob), November 1-12. Hobby plan. Active CPU and Functions Storage aren't readable through the API on Hobby; check them on the Usage page.

## Headline

**An incident today, now fixed.** From 19:00 to 22:00 UTC, 214 function calls ran until Vercel stopped them at the time limit: 36.5 GB-hours of timeouts, about 110 times the 0.33 GB-hours-a-day target. They began right after the press-release headlines shipped (18:58). The likely cause: an SEC download that stalled held one of the five slots in the SEC request queue for good, so later SEC lookups in that server waited until killed. Fixed at 22:04 (`lib/sec.ts`): every SEC request now gives up after 15 seconds, the headline reader aborts instead of waiting, and a page waits at most 8 seconds for headlines. The runtime logs can't be read with this token (403), so the cause is inferred from timing and code, not confirmed in logs. The 22:00-23:00 hour shows whether it held (re-check scheduled).

Visitors saw this as stock pages that didn't load, which is probably why tapping a ticker seemed to do nothing.

## By day

| Day | Requests (cached / not) | Bandwidth out | Function GB-h (ok) | Function calls | Timeouts | Cache writes | Builds |
|---|---|---|---|---|---|---|---|
| Nov 2 | 3,499 / 6,276 | 50 MB | 0.30 | 5,649 | 0 | 47 MB | 30 |
| Nov 3 | 2,313 / 2,588 | 66 MB | 0.23 | 2,040 | 0 | 40 MB | 28 |
| Nov 4 | 4,896 / 5,360 | 90 MB | 0.74 | 4,358 | 0 | 61 MB | 84 |
| Nov 5 | 3,759 / 4,468 | 102 MB | 0.50 | 3,603 | 0 | 108 MB | 64 |
| Nov 6 | 4,861 / 4,997 | 96 MB | 0.48 | 4,035 | 0 | 135 MB | 56 |
| Nov 7 | 3,477 / 2,578 | 133 MB | 0.48 | 1,050 | 0 | 248 MB | 45 |
| Nov 8 | 5,616 / 2,555 | 112 MB | 0.74 | 1,080 | 0 | 320 MB | 36 |
| Nov 9 | 4,860 / 3,460 | 108 MB | 0.54 | 1,147 | 0 | 220 MB | 50 |
| Nov 10 | 1,858 / 1,567 | 29 MB | 0.39 | 468 | 0 | 18 MB | 14 |
| Nov 11 | 958 / 801 | 17 MB | 0.21 | 304 | 0 | 6 MB | 11 |
| Nov 12 | 1,974 / 1,743 | 26 MB | 0.32 | (see incident) | 214 (36.5 GB-h) | 5 MB | 20 |

## Each budget

- **Function time (target 0.33 GB-hours a day).** Successful work is now 0.2-0.4 a day, down from 0.5-0.75 before rounds 79 and 85; today's 0.32 is at the line because of first visits to new pages. The timeouts are the risk, and the fix above caps any SEC stall at 15 seconds. Keep watching for two weeks.
- **Runtime cache writes.** Fell from 320 MB a day (Nov 8) to 5-18 MB since round 85. Well within the free allowance (about 1.5 GB a cycle, inferred from the 75% warning).
- **Builds.** 20 today (my phases) and 11-14 on quiet days, against the Hobby cap of 100 a day. Every data commit is a deploy; at 6-8 data deploys a day plus work pushes, there is room, but a day with many separate pushes gets close (84 on Nov 4).
- **Bandwidth.** 17-133 MB a day, far under the 100 GB a month allowance. The lab tables add 1.4 MB per visitor to /research/lab (loaded only there).
- **Requests.** 2,000-10,000 a day, about 45% served from cache. Far under the 1 million a month allowance.
- **Blob storage** (alert devices): 12 KB, 100-600 requests a day. Negligible.
- **Repository:** 20 MB of git history, 16 MB of public data files. Fine for now; `congress.json` (4.4 MB) and `insiders.json` (1 MB) are rewritten by every data commit, so history grows a few MB a week.
- **GitHub Actions:** unlimited (public repo). The monthly research refresh now runs longer (28 funds); its limit is 3 hours.

## Recommendations

1. Done: time limits on every SEC request (the incident).
2. Watch function time and timeouts daily for two weeks; the usage routine already reports function GB-hours. Add timeouts to it (`function_invocation_timeout_count`), which it doesn't check today.
3. Keep pushes batched (owner rule): builds are the closest limit on busy days.
4. If traffic grows after the launch, first visits to stock pages are what scale function time; the per-stock caches (`lib/secCached.ts`) are the lever.
