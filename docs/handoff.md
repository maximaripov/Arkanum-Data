# Form4 handoff (read this first)

Working notes for whoever picks up the project next, human or agent. History of what was built is in [build-log.md](build-log.md); add new rounds there.

## Basics
- Live: https://form4-insiders.vercel.app (foresightscreener.vercel.app redirects). Free hobby site, no income, no contact address on the site. Must stay free.
- Next.js App Router on Vercel Hobby. Vercel only deploys commits authored by `maximaripov <351230404+maximaripov@users.noreply.github.com>`; workflows and commits use that identity.
- Deploying: the owner approved pushing fixes straight to `main` once `npm test` and `tsc` pass (fast-forward from the session branch). Scheduled jobs and Vercel only use `main`.
- Standing instruction: fix glitches and bugs without asking.
- Owner alerts are gated by the `ALERTS_PASSCODE` env var on Vercel (value is not stored in the repo). Two owner devices are registered.

## Style rules from the owner
- Logo: a sharp `[4]` in lime `#a3e635`. Keep the FINRA table. Market quotes (SPX, NDX, BTC, gold, 10-year) only through TradingView embeds.
- No intro blurbs, no "How to read this" sections.
- Consistent layouts: a dropdown picker (no sideways chip sliders); "what changed" as short lines inside the holdings card; cross-company lists at the bottom.

## Pages (nav: Insiders / Markets / Stakes / Digest)
- `/` Insiders: tabs Overview, Group buys, All trades, Big funds (13 funds' 13F holdings + fund dropdown).
- `/markets`: TradingView overview, watchlist, People you follow, Coming up (Fed, jobs, CPI, GDP, PCE only).
- `/stakes`: company dropdown, holdings card (top 25) with "Changed since Qx"; 5%+ stakes (13D/13G); private investments from press releases ("not verified", linked to source); bottom: Recent private investments, Recent 5%+ stake filings.
- `/stock/[symbol]`, `/insider/[cik]` (Follow button), `/briefing` (Digest + owner box), `/about` (privacy; owner hasn't decided whether to keep it).
- Redirects: `/screener` → `/stakes`, `/calendar` → `/markets`, `/insiders` → `/`.

## Data jobs (GitHub Actions; www.sec.gov blocks dev machines, data.sec.gov works)
- `data.yml` weekdays 4:02 PM ET: screener.json (fundamentals for stock pages), insiders, funds, events, health check, digest.
- `insiders-hourly.yml` weekdays ~7 AM–11 PM ET: Form 4 feed → insiders-today.json, instant alerts, `scripts/build-private.mjs` (continue-on-error). Failure/recovery alerts to owner devices; manual run has `test_failure` input.
- `stakes.yml` weekdays 10:37 UTC: `scripts/build-stakes.mjs` → `public/data/stakes.json`. Filers discovered monthly (`data/stakes-filers.json` v2); excludes SIC 6000–6799 (except SoftBank) and 300+ holdings; `data/stakes-skip.json` caches filings that aren't the company's own stake. Last run: 1540 tracked → 136 shown.
- `tests.yml`: `npm test` (34 tests) + tsc.

## Private investments
- `scripts/lib/deals.mjs`: ~40 investors with venture-arm aliases; `extractDeals()`, `roundSize()` (skips valuations, totals, non-USD); guards for people "of" a company, alumni funds, Lilly Asia Ventures.
- `scripts/build-private.mjs` hourly: PR Newswire RSS (VC, financing, private placement, all news) + Business Wire home feed.
- `scripts/backfill-private.mjs [--since YYYY-MM-DD] [--wide]`: PR Newswire monthly sitemap archive. Current month: no archive yet, so it reads the pages of `sitemap-news.xml` (last ~2 days only). `data.yml` runs it daily for the last 3 days to catch deals the hourly feeds miss.
- `public/data/private.json`: 55 deals YTD 2026, hand-checked. PR Newswire only, so a sample. Google News and GDELT rejected.

## Open items
- Owner to delete stale branches `proto-news`, `proto-track` (and `round2`?) at github.com/maximaripov/Foresight/branches.
- Check the first scheduled stakes run is fast now the skip cache exists (first manual run took 35 of 60 min).
- Set a free `FRED_API_KEY` secret only if BLS keeps refusing the GitHub runner (check Coming up for jobs/CPI after the next 4 PM run).
- Business Wire / GlobeNewswire backfill (GlobeNewswire RSS returns 403).

## How the owner wants the work done
- Rigorous, honest advisor: lead with the main criticism, flag inference vs evidence, say when something is good enough to ship.
- Verify on the live site (Playwright, phone and desktop) before reporting.
- Ping the owner's phone when a long task finishes.
