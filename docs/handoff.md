# Arkanum Data handoff (read this first)

Paste this into a new chat to continue. Every change is in [build-log.md](build-log.md) (rounds 1–44); add new rounds there.

## Basics
- **Name: Arkanum Data** (was Form4, before that Foresight). Full name in page titles, link previews, feeds, app name, About/Terms; the page itself (header wordmark, welcome screen, home-screen label) shows just `arkanum`.
- **Live:** https://arkanumdata.vercel.app (Vercel project renamed too). The old addresses form4-insiders.vercel.app and foresightscreener.vercel.app are gone for good (owner chose not to re-add them; no redirects). **Repo:** github.com/maximaripov/Arkanum-Data (private, `main`; renamed from Foresight 2026-11-06, old URLs redirect). Next.js App Router on Vercel Hobby (a newer Next than most training data: read `node_modules/next/dist/docs/` before Next-specific code).
- Free hobby site: no income, no accounts, no contact address. Must stay free.
- Vercel only deploys commits authored by `maximaripov <351230404+maximaripov@users.noreply.github.com>`; commits and workflows use that identity.
- **Working rules:** fix bugs without asking. Push straight to `main` once `npm test` and `npx tsc --noEmit` pass (sessions work on a `claude/...` branch; push to both; merge `origin/main` rather than rebase, since force-pushes are blocked). Verify on the live site with Playwright, phone and desktop, before reporting. Ping the owner's phone when a long task finishes. Show design changes as screenshots before shipping.
- Owner alerts are gated by `ALERTS_PASSCODE` on Vercel (never store its value). Two owner devices registered. GitHub secret `SEC_USER_AGENT`. SEC blocks the dev sandbox: anything that reads SEC runs in GitHub Actions.
- Never put the owner's email in request headers or code. Browser storage keys keep old `foresight.`/`form4.` prefixes on purpose (renaming needs a per-device migration).
- **Don't re-suggest** (owner said no repeatedly, 2026-11-07): archive pages listing every buy, checking traffic in Vercel Analytics, Form 144 notices, watchlist sale alerts, changing what the home page leads with, a Congress late-disclosures page. Also Search Console/Bing and re-adding the old addresses. Only revisit if the owner raises them.
- How to talk to the owner: rigorous, honest advisor; lead with the main criticism; flag inference vs evidence; say when something is good enough to ship; plain language. The owner likes options in batches of 10.

## Waiting on the owner
1. Delete stale branches `proto-news`, `proto-track`, `round2`.
2. Search Console / Bing Webmaster, and re-adding the old addresses: declined by the owner; don't raise again.

## Still to check
- **First Saturday week in review: Sat 2026-11-07** (`weekly-digest.yml`, built ~9-10 AM ET, held to 5 PM; notification "Weekly Digest"). Check it arrived and `/briefing/2026-11-07` exists.
- **5 PM digest:** `CRON_SECRET` is on Vercel and a cron-job.org job calls the release (Mon-Sat 17:00 America/New_York, POST https://arkanumdata.vercel.app/api/alerts/release, header `Authorization: Bearer <CRON_SECRET>`). First real test: the next weekday's digest should arrive at 5:00; cron-job.org's history should show HTTP 200 `released: true`.
- **Vercel Functions Storage** was 8.04 / 10 GB on 2026-11-06 (old deployments piling up; everything else far under). Retention set to 1 day for all deployment types; confirm it dropped. If not, cut the number of deploys.
- (Done 2026-11-06: the digest reached the owner via the new address and `form4-alerts` audience.)
- **Search directory gap:** SEC's quarterly data sets for 2026q2–q3 returned "not published"; rerun `people-backfill.yml` once they appear.
- **Name risk:** "Arkanum" sounds like ARCANUM (registered trademark for financial services, Arcanum Global, Inc., reg. 5191550), a June 2026 Swedish fraud warning about "Arcanum Global Trading", and an Arcanum crypto token. The owner chose it knowingly; revisit before anything commercial.

## Style rules
- **No emoji anywhere** (`tests/no-emoji.test.mjs`); plain marks ▲ ▼ › ↗ × are fine. No intro blurbs (except the first-visit welcome popup). Dropdown pickers, never sideways sliders (long lists use the searchable `components/Picker.tsx`). Footer link row only: About, data & privacy · Research findings · Terms (no links inside cards, no visible RSS links).
- **Design (round 42, retro terminal):** black, white, green `#3ddc84` (buys/up), red `#ff5f56` (sales/down); light mode is a black-on-white printout (`#0a8a3e` / `#c6282d`). Monospace (JetBrains Mono) everywhere; bold capital headings with a green `>` prompt; square corners; inverse-video active nav/tab (`[overview]`); double-line borders on headline numbers and the week's top buy; soft glow in dark mode. The owner rejected scanlines and pixel fonts. Lives in the colour tokens at the top of `app/globals.css` and one section at its end.
- **Logo:** a ring with a gap where a drop broke free (`components/Logo.tsx`), next to lowercase `arkanum` and a blinking block cursor (still under reduced motion). Same mark in `app/icon.svg`, `public/icon.svg`, `app/apple-icon.png`, `public/icon-192/512.png`, share images.
- Market quotes only through TradingView embeds (index levels are licensed).

## Pages
- `/` Insiders: tabs Overview, Group buys, All trades, Big funds, Well-known. Overview reads `overview.json` (~16 KB): headline numbers, Most unusual buys, Buying together, buying by day, Latest filings, Notable sales; phone leads with the week's most unusual buy.
- **Well-known** (`components/FamousView.tsx`, `famous.json`): up to 100 CEOs/chairs ranked by English Wikipedia views (30 days), from Wikidata CEO/chair entries matched to Form 4 filers (`scripts/build-famous.mjs`, `scripts/lib/famous.mjs`); each row shows their last-30-days trading ("Bought $3.0M · Oct 26", "Sold $2.7M · pre-planned", or "Last buy or big sale: Sep 2025"), refreshed hourly. Gaps from Wikidata: Tim Cook, Jeff Bezos.
- `/congress` (server-rendered) and `/congress/[member]` (one page per House member, 101, in the sitemap; data `public/data/congress/<slug>.json`; old `?member=` links redirect).
- `/stock/[symbol]`, `/insider/[cik]` (Follow), `/markets`, `/stakes`, `/briefing` (Digest: market-wide, no watchlist; notification text is just "Daily Digest" ("Weekly Digest" on Saturday); archive at `/briefing/<date>` and `/briefing/archive`; Saturday week in review; no daily digest on NYSE holidays (`lib/marketDays.mjs`) or days with no SEC filings; each daily covers everything filed since the previous one), `/research/insider-buys` (backtest write-up), `/about`, `/terms`.
- Search (`/api/search`): tickers + 19,381 insiders (two years, backfilled from SEC quarterly data; Wikipedia common names as aliases, so "jensen huang" works).
- RSS `/feeds/insider-buys.xml`, `/feeds/congress.xml` (discoverable via page head only). Share images per stock, insider and member page (`lib/og.tsx`).
- Sitemap: main pages, research, 101 members, stocks and insiders with a buy or a $250K+ exec sale in 30 days (~760 stocks, ~1,200 insiders), well-known insiders. Not every insider: insider pages read SEC live.

## Data jobs (GitHub Actions)
- `data.yml` weekdays 4:02 PM ET (150-min limit): fundamentals, 30-day insiders, overview, people, well-known insiders (`build-famous.mjs`, Wikipedia paced at 1 req/s), funds, events, private-deal catch-up, health check, digest. `insiders-hourly.yml` weekdays ~7 AM–11 PM ET (also refreshes well-known activity). `stakes.yml`, `congress.yml` daily. Manual: `people-backfill.yml`, `backtest.yml`. Jobs often start 30–60 min late.
- **Data fixes worth knowing:** the daily job once read each Form 4 twice (index lists it per filer), doubling amounts; fixed by `form4Files()` and a one-time rebuild (file `version: 2`). Some filers type the total into the price box; `priceAndValue()` in `lib/form4.mjs` reads price > $1,000 with value > $1B as a total, and `cleanTrades()` in `lib/insiderMerge.mjs` applies it to saved data. Anything reading trade files directly must go through `mergeInsiders()` or `cleanTrades()`.

## Scoring and backtest
- Buy score 0–100 (`lib/conviction.mjs`), shown as Unusual 60+, Somewhat unusual 40–59, Routine (stored as strong/notable/routine). Sales flags: `saleFlags()`.
- Backtest (`docs/backtest/`, public at `/research/insider-buys`): 22,969 officer/director buys 2023–2025; the score doesn't pick better buys; $1M+ and CEO buys did worse; only the pre-planned penalty holds up; insider buys trailed small caps.

## Decisions
- Senate trades impossible (Akamai blocks automation). No AI assistant (paid). No custom domain yet (costs money; buy it when search traffic shows up or ads start). Monetization waits for traction.

## Ideas not started
- Congress "late disclosures" page (factual wording only, hand-check rows against PDFs first). Weekly archive pages. Bluesky auto-post bot (owner would create the account). Form 144 notices; watchlist sale alerts; buybacks.
