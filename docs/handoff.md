# Form4 handoff (read this first)

Paste this into a new chat to continue. History of every change is in [build-log.md](build-log.md) (rounds 1–39); add new rounds there.

## Basics
- Live: https://form4-insiders.vercel.app (foresightscreener.vercel.app redirects). Repo github.com/maximaripov/Form4 (private, `main`; renamed from Foresight, old URLs redirect). Next.js App Router (a newer version than most training data: read `node_modules/next/dist/docs/` before Next-specific code) on Vercel Hobby.
- Free hobby site: no income, no accounts, no contact address. Must stay free (no paid APIs or hosting).
- Vercel only deploys commits authored by `maximaripov <351230404+maximaripov@users.noreply.github.com>`; commits and workflows use that identity.
- **Working rules:** fix bugs and glitches without asking. Push straight to `main` once `npm test` and `npx tsc --noEmit` pass (sessions develop on a `claude/...` branch; push to both). Verify on the live site with Playwright, phone and desktop, before reporting. Ping the owner's phone when a long task finishes.
- Owner alerts are gated by the `ALERTS_PASSCODE` env var on Vercel (never store its value anywhere). Two owner devices are registered. GitHub secrets: `SEC_USER_AGENT` (contact string SEC requires); no `FRED_API_KEY` (not needed: BLS works).
- Never put the owner's email in request headers or code.
- Browser storage keys keep the old `foresight.` prefix on purpose (renaming would need a migration on every device). The site's alert check accepts jobs from either repo name.

## Owner's style rules
- **No emoji anywhere** (site, notifications, copy). Words or line-drawn SVG icons; plain marks ▲ ▼ › ↗ × are fine. `tests/no-emoji.test.mjs` enforces it.
- No intro blurbs or "How to read this" sections. Exception: the first-visit welcome popup stays.
- Consistent layouts: dropdown pickers (no sideways chip sliders; long lists use the searchable `Picker`); "what changed" as short lines inside the holdings card; cross-company lists at the bottom.
- Logo: sharp `[4]` in lime `#a3e635`. Market quotes (S&P 500, Nasdaq 100, BTC, gold, 10-year) only through TradingView embeds (index levels are licensed; FRED's S&P series is copyrighted).
- How to talk to the owner: rigorous, honest advisor; lead with the main criticism; flag inference vs evidence; say when something is good enough to ship; plain language, no jargon.

## Design (round 25)
Dark by default; sun/moon button switches to light (per device, `form4.theme` in localStorage, applied before first paint by a script in `app/layout.tsx`; constants in `lib/theme.ts`). Inter + JetBrains Mono via `next/font`. Desktop: top bar, ticker band of today's insider trades, dense tables with 10-bar signal meters. Phone: compact header with search button, hero card, 2x2 stat cards, score rings, bottom tab bar (Insiders / Congress / Markets / Stakes / Digest).

## Pages
- `/` Insiders. Tabs Overview, Group buys, All trades, Big funds, Well-known (CEOs/chairs ranked by Wikipedia views, `famous.json`, daily). Overview reads `public/data/overview.json` (15 KB; the 850 KB 30-day file loads only for the trade lists): headline numbers, Strongest buys, Buying together, buying by day, Latest filings, Notable sales. Phone leads with the week's strongest buy.
- `/congress` House members' stock trades: member dropdown, 30-day numbers, latest disclosures (linked to the PDF), most bought/sold (90 days), most active members.
- `/congress/[member]` one server-rendered page per member (slug from `memberSlug()` in `lib/congress.mjs`; data `public/data/congress/<slug>.json`), all in the sitemap. Old `?member=` links redirect.
- `/markets` TradingView overview, watchlist, people you follow, Coming up (Fed, jobs, CPI, GDP, PCE).
- `/stakes` what listed companies own: company dropdown, holdings, 5%+ stakes, private investments ("not verified"), cross-company lists.
- `/stock/[symbol]`: chart + insider strip under it (buys/sales marks over the chart's range), SEC fundamentals, 8-Ks, Congress trades, companies that own it, big funds, insider trades. (FINRA retail table removed 2026-11-05.)
- `/research/insider-buys`: the backtest for readers (linked from About).
- `/insider/[cik]` with Follow; `/briefing` Digest (S&P/Nasdaq TradingView cards, markets this week, owner box); `/about`, `/terms`.
- Search (`/api/search`) finds tickers and insiders by name (directory `public/data/people.json`, kept two years; backfilled from SEC's quarterly data sets by the manual `people-backfill.yml`).
- RSS: `/feeds/insider-buys.xml` (score 60+ buys) and `/feeds/congress.xml` (one item per House report); found by feed readers from the page head (not linked visibly: raw XML looks broken on phones). Share pictures (`opengraph-image.tsx`) on stock, insider and member pages; shared layout in `lib/og.tsx` (stock page keeps its own).

## Data jobs (GitHub Actions; SEC work runs there)
- `data.yml` weekdays 4:02 PM ET (two crons; a gate skips the wrong one for DST): fundamentals, 30-day insiders, overview, people directory, funds, events (BEA, Fed, BLS), private-deal catch-up (PR Newswire news sitemap, last ~2 days), health check, digest push.
- `insiders-hourly.yml` weekdays ~7 AM–11 PM ET: live Form 4 feed → `insiders-today.json`, private deals, overview, people, instant alerts. Failure/recovery alerts to owner devices. Calls to the site retry network errors (`siteFetch` in `scripts/lib/site.mjs`).
- `stakes.yml` weekdays 10:37 UTC (~3.5 min). `congress.yml` weekdays 23:41 UTC: House Clerk yearly index → new PTR PDFs → `pdftotext` (poppler) → `public/data/congress.json` (full, served by `/api/congress?symbol=`) + `congress-overview.json` + one file per member in `public/data/congress/`; `--rebuild` re-reads all. `tests.yml`: tests + tsc. `backtest.yml`: manual, owner-only.
- GitHub's scheduler often starts jobs 30–60 min late; normal.
- Private repo: 2,000 free Actions minutes/month; current use is well under.

## Scoring and flags (`lib/conviction.mjs`)
- Buys: score 0–100 (role, stake increase, first buy in N years, other insiders buying, size, pre-planned penalty); shown as Unusual 60+, Somewhat unusual 40–59, Routine (stored tiers still `strong`/`notable`/`routine`). Vice presidents are officers, not top executives.
- Sales: `saleFlags()`: top executive, share of holding sold, several insiders selling, not pre-planned. "Notable" = not pre-planned, not a fund/10% owner, and a top executive selling 25%+ or $1M+, or anyone selling half or more.
- Holdings: Form 4 parsing adds every account into `ownedTotal` (round 30). Share-sold figures use only that and say nothing for older rows without it (so Notable sales is ~72 for now and refills over ~30 days).

## Backtest (owner-only, `docs/backtest/`)
2023–2025, 22,969 officer/director buys, scored with the site's formula. **The score does not pick better buys:** Strong vs Routine no difference against same-month buys; 80+ did worst; $1M+ buys and top-executive buys did worse; only the pre-planned penalty holds up. Insider buys overall didn't beat small caps. Tiers renamed to Unusual / Somewhat unusual / Routine (round 34). Not done: reweighting tested out of sample; a public write-up of the backtest.

## Decisions and constraints
- Senate trades: impossible. The owner agreed to the eFD terms, but Akamai blocks automated access from this dev machine and GitHub runners (even headless Chromium).
- AI assistant: skipped for now (paid; risk of dressing noise up as insight). If ever: capped daily batch summaries of 8-K filings.
- Monetization: wait for traction. Ads would need a domain, Vercel Pro, removal of non-commercial data, a privacy policy + consent banner, ads.txt, and a lawyer's view on Congress data (5 U.S.C. §13107 news-media exception).
- Kept on purpose: welcome popup.

## Open ideas (not started)
- Form 144 planned-sale notices; notable-sale alerts for watchlist stocks; buybacks from 10-Q share counts.
- Owner to delete stale branches `proto-news`, `proto-track`, `round2`.
- Mockup files of the five redesign directions were only in a scratchpad (not in the repo).
