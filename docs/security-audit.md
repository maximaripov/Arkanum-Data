# Security audit, round 88 (2026-11-12)

Covers every security line in section 1 of the owner's notes, grouped into six checks. "Verified"
means tested in this round; anything inferred is marked as such. This was a review plus hands-on
probing from outside, not a professional penetration test: no fuzzing harness and no third-party
scanner, and the live HTML pages couldn't be probed from the cloud sandbox (Bot Protection answers
it with 429).

## Summary

No secret is exposed and there is nothing to rotate. The real risks are small and were fixed this
round: an unthrottled anonymous sign-up endpoint, internal error text in two API responses, and
one low-severity package advisory. The biggest remaining risk is not a vulnerability but a
licensing one (price data, see the handoff).

## 1. Secrets (keys in browser code, .env, git history, rotation, server-side storage)

- **Browser code:** the built client bundle (`.next/static`) contains none of the secret names
  (`TIINGO_API_KEY`, `ALERTS_PASSCODE`, `ALERTS_SECRET`, `CRON_SECRET`, `VAPID_PRIVATE_KEY`,
  `COINGECKO_API_KEY`, Blob token, `SEC_USER_AGENT`). The only `NEXT_PUBLIC_` value is the
  VAPID *public* key, which browsers need to subscribe to push and is meant to be public.
  Verified.
- **.env on the site:** none in the repo (`.gitignore` covers `.env` and `.env*.local`; only
  `.env.example` with a placeholder is tracked). The site serves only `public/` and its routes:
  `/.env`, `/.env.local`, `/package.json`, `/.git/config` and `/next.config.mjs` return 404 on a
  production build. Verified locally; the live site can't be probed from here (429).
- **Git history:** every commit on every branch searched for private keys and for AWS, GitHub,
  Slack, Vercel and Blob token shapes, plus key assignments for the site's own variables. Nothing
  found. Verified with pattern search; a dedicated scanner (gitleaks) would be stronger, so treat
  this as a strong indication, not a guarantee.
- **Rotation:** nothing was exposed, so nothing needs rotating. Rotate if a key is ever pasted into
  a chat, an issue or a commit.
- **Where secrets live:** Vercel environment variables (site) and GitHub Actions secrets (jobs),
  read only on the server. This is the right setup; no change.

## 2. Who can call what (keys locked to Arkanum, endpoint authorization, IDs in URLs)

| Route | Who can call it |
|---|---|
| `/api/alerts/send`, `notify`, `instant`, `price-check`, `devices` | Only Arkanum's own GitHub jobs (GitHub OIDC token pinned to the owner's account and `main`) or the shared secret, compared in constant time |
| `/api/alerts/release` | cron-job.org with `CRON_SECRET` as a Bearer token |
| `/api/alerts/register`, `test` | Anyone, by design (no accounts). A device is identified by a 144-bit random ID made on the device, which can't be guessed or listed. Knowing another device's ID would let you send it a test push or change its watchlist; the ID is never shown or sent anywhere else. Now rate-limited (below) |
| `/api/alerts/digest` | Public: it is the public daily digest |
| `/api/company`, `insiders`, `news`, `congress`, `search`, `watch`, `markets`, feeds | Public, read-only views of public filings |

- **IDs in URLs** (`/stock/[symbol]`, `/insider/[cik]`, `/congress/[member]`, `/briefing/[date]`)
  name public companies, people and dates. There is no private data behind them, so changing
  the ID can't reach anyone's data.
- **Keys locked to Arkanum's infrastructure:** the Tiingo and CoinGecko keys are used only from
  the server, never sent to browsers, so other websites can't use them. Neither provider supports
  restricting a key to an origin for server-to-server calls, and none is needed.
- **Server-side request forgery:** user input never builds an outbound URL. Tickers are mapped to
  SEC company numbers through SEC's own list first.

## 3. Database (row level security, parameterized queries, permissions)

Not applicable: Arkanum has no database. Public data is JSON files built by the jobs; the only
stored user data is the device file (push address, watchlist, who the device follows) in a
private Vercel Blob store that only the server can read. There are no SQL queries to
parameterize and no rows to secure. Access to the device file is covered by check 2.

## 4. Abuse (rate limits, DDoS)

- Vercel Firewall (rounds 77-78): AI training crawlers denied; stock, insider and API routes limited
  to 40 requests a minute per IP; Bot Protection challenges non-browsers on HTML pages; Vercel's
  platform DDoS mitigation is always on.
- **Fixed this round:** `/api/alerts/register` and `/api/alerts/test` were exempt from the rate
  limit (the whole `/api/alerts/` path was, for the jobs). One client could have filled the
  5,000-device cap, blocking real sign-ups, or run up Blob writes. Both are now under the same
  40-a-minute rule; the job-only routes stay exempt. Verified live: 40 requests answered, then 429.
  A separate, stricter rule was refused: the Hobby plan doesn't allow new rate-limit rules, so the
  existing rule was extended.

## 5. Code and packages (headers, dependencies, sessions, attack surface)

- **Headers** (round 75), verified live: `X-Frame-Options: DENY`, `frame-ancestors 'none'`,
  `nosniff`, strict-origin referrer, Permissions-Policy off for camera, microphone, location and
  payment, HSTS with preload. No full content security policy, on purpose (TradingView embeds).
- **Packages:** `npm audit` found one low-severity advisory (fast-xml-parser, quadratic CPU on
  malformed XML; it parses SEC's XML, so inferred low risk). Updated: next 16.4.4 → 16.4.6,
  fast-xml-parser 5.12.0, @vercel/blob 2.9.0, jose 6.2.17. `npm audit`: 0 vulnerabilities.
  Not updated: TypeScript 7 and web-push 4 (major versions with breaking changes; a separate
  round), @types/node (should match the Node 22 runtime).
- **Fixed this round:** `/api/insiders` returned SEC's raw error message and `/api/alerts/register`
  returned storage errors to the caller; both now return a plain message and log the detail.
  `/api/insiders`, `/api/news` and `/api/company` now reject anything that isn't a ticker before
  it creates a cache entry.
- **Sessions and authentication:** no logins, no cookies with sessions. The only privileged
  callers are the jobs (OIDC) and cron (secret).

## 6. Infrastructure and cost (SSR, data architecture, usage, performance)

- **SSR:** every content page is rendered on the server (rounds 71-73, 79, 85). The homepage,
  stock, insider, Congress and digest pages arrive with their data in the HTML.
- **Function usage, target 0.33 GB-hours a day** (from the Vercel usage API, successful
  executions):

  | Day | GB-hours | Calls |
  |---|---|---|
  | Nov 4 | 0.735 | 4,358 |
  | Nov 8 | 0.744 | 1,080 |
  | Nov 9 | 0.536 | 1,147 |
  | Nov 10 | 0.387 | 468 |
  | Nov 11 | 0.214 | 304 |
  | Nov 12 (to 17:00 UTC) | 0.142 | 159 |

  Under the target since round 85's caching change. Two days is not a trend: the daily usage
  routine should flag any day above 0.33 for the next two weeks. The main risk to the target is
  traffic, not code: a launch would multiply first visits to stock and insider pages.
- **Data architecture:** public JSON built by GitHub Actions and shipped with each deployment; the
  site reads its own files from disk (rounds 79, 85). Sound for a free site; the cost is one deploy
  per data commit.
