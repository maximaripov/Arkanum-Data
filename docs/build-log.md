# Foresight: build log and summary

Built on 2026-11-02 in one Claude Code session. Personal use only.

## Links

| What | Link |
|---|---|
| Live app | https://foresightscreener.vercel.app |
| GitHub repo (private) | https://github.com/maximaripov/Foresight |
| Vercel project | https://vercel.com/maximaripov/foresight |
| Nightly data job | https://github.com/maximaripov/Foresight/actions/workflows/data.yml |
| README (setup + limits) | [README.md](../README.md) |

### Pages

| Page | Link |
|---|---|
| Markets: watchlist, indices, rates & FX, commodities, live crypto | https://foresightscreener.vercel.app/ |
| Screener: ~7,000 US stocks | https://foresightscreener.vercel.app/screener |
| Insider trades: 30 days + live feed | https://foresightscreener.vercel.app/insiders |
| Stock page, e.g. NVDA | https://foresightscreener.vercel.app/stock/NVDA |

### Code

| File | What it does |
|---|---|
| [lib/yahoo.ts](../lib/yahoo.ts) | Quotes, charts, symbol search (Yahoo Finance, unofficial) |
| [lib/sec.ts](../lib/sec.ts) | Ticker → company lookup, per-company and live insider trades (SEC EDGAR) |
| [lib/form4.mjs](../lib/form4.mjs) | Parses SEC Form 4 insider filings; shared by the app and the nightly job |
| [lib/markets.ts](../lib/markets.ts) | Symbols shown on the Markets page and the default watchlist |
| [app/api/](../app/api) | Server routes: `quotes`, `chart`, `search`, `insiders` |
| [app/page.tsx](../app/page.tsx) | Markets page |
| [app/screener/page.tsx](../app/screener/page.tsx) | Screener, filters and presets |
| [app/insiders/page.tsx](../app/insiders/page.tsx) | Insider trades, cluster buys |
| [app/stock/[symbol]/StockView.tsx](../app/stock/%5Bsymbol%5D/StockView.tsx) | Stock page: chart, stats, insider table |
| [components/CryptoPanel.tsx](../components/CryptoPanel.tsx) | Live crypto stream from Coinbase |
| [scripts/build-screener.mjs](../scripts/build-screener.mjs) | Nightly: builds `public/data/screener.json` |
| [scripts/build-insiders.mjs](../scripts/build-insiders.mjs) | Nightly: builds `public/data/insiders.json` (rolling 30 days) |
| [.github/workflows/data.yml](../.github/workflows/data.yml) | Runs both scripts weekdays at 23:17 UTC (6:17 PM EST) and commits the data |

## What it does

- **Markets:** watchlist (saved in the browser), 8 world indices, rates & FX, commodities, crypto. Stocks refresh every 5–15 s and pause when the tab is hidden. Crypto updates the moment a trade happens.
- **Stock page:** chart from 1 day to 5 years (line or candles), day and 52-week range, market cap, P/E, P/S, revenue, margin, growth, ROE, and the company's last 25 insider filings.
- **Screener:** 7,151 NYSE/Nasdaq/Cboe stocks, 10 filters, presets (profitable growers, value, near 52-week high, beaten-down quality, mega caps, insider buying).
- **Insiders:** every open-market insider buy and every sale over $250K for 30 days. Highlights cluster buys (2+ insiders buying the same stock) and pre-planned trades (Rule 10b5-1).
- **Phone:** installable from the browser (Add to Home Screen), no app store.

## Data sources (all free, no API keys)

| Data | Source | Notes |
|---|---|---|
| Stock, index, FX, commodity prices | Yahoo Finance chart endpoints | Unofficial, can break or lag, not licensed for redistribution |
| Crypto | Coinbase public stream | Official, truly live |
| Company financials | SEC EDGAR XBRL "frames" | Official, last full fiscal year |
| Insider trades | SEC EDGAR Form 4 | Official; SEC asks for contact info and ≤10 requests/s |

## Key decisions

- **Personal use only.** Free live stock data can't legally be shown to other people, so the repo is private and the app has no accounts.
- **Web app before a native mobile app.** One codebase, installable on a phone. Revisit native only if this falls short.
- **The screener is built nightly, not live.** Fundamentals change quarterly. One nightly file means filtering is instant and makes no requests while you use it.
- **The nightly job stores insider history.** SEC's live feed only covers the last ~30 filings. SEC's daily index gives every Form 4 (500–2,400 a day).
- **Prices are regular-session.** Yahoo's "full day" price includes after-hours trading and didn't match the chart, so it's no longer used.
- **No database, no paid hosting.** Data lives as JSON in the repo; Vercel Hobby plus GitHub Actions free tiers.

## Bugs found and fixed during the build

1. **Market cap missing for multi-class companies** (GOOGL, META). Added a fallback to diluted share count. Visa and Berkshire are still missing.
2. **A data download hung forever** on one SEC request. Added 20-second timeouts to both scripts.
3. **Federal holidays crashed the insider job.** SEC answers a missing daily index with "403 AccessDenied" instead of "404 Not Found"; now treated as "no filings that day".
4. **Fake ticker "NONE" topped the cluster buys** ($322M, 24 insiders). Private companies and funds use placeholder tickers; these are now dropped.
5. **Header price didn't match the chart** (after-hours price). Fixed.
6. **Phone layout:** the insider table ran off-screen. Fixed.

## Known limits

- Yahoo prices are unofficial. This is the biggest risk to the app.
- Fundamentals are annual, not the last four quarters, so a P/E can be up to a year stale.
- Market cap is missing for some multi-class companies (Visa, Berkshire).
- Foreign filers (Toyota, TSMC) have prices but no fundamentals.
- The largest "cluster buys" are often funds owning over 10% of a company, not executives.

## Setup state (2026-11-02)

- [x] Code on GitHub, repo private
- [x] Deployed on Vercel at foresightscreener.vercel.app; `SEC_USER_AGENT` set
- [x] `SEC_USER_AGENT` added as a GitHub Actions secret
- [x] First nightly job run (#1) succeeded: 7,148 stocks, 30-day insider file
- [ ] Vercel redeploys automatically after the nightly commit

## Next steps (suggested)

1. **Alerts:** price moves, price levels being crossed, and new insider buys on watchlist stocks, sent to your phone.
2. **Sync watchlist and levels** between phone and computer (needs a small database).
3. If Yahoo breaks: Finnhub's free tier, which needs a key, as the fallback.

## Round 2 (2026-11-02)

| # | Improvement | Where |
|---|---|---|
| 1 | Officers & directors vs funds & 10% owners filter; screener's insider column counts officers & directors only | [lib/insider.ts](../lib/insider.ts), [app/insiders/page.tsx](../app/insiders/page.tsx) |
| 3 | Last-4-quarters fundamentals built from each filing's real dates (works for any fiscal year-end); falls back to last fiscal year | [scripts/build-screener.mjs](../scripts/build-screener.mjs) |
| 4 | Sector and industry filters and column, from SEC industry codes cached in `data/sic.json` | [lib/sectors.mjs](../lib/sectors.mjs), [app/screener/page.tsx](../app/screener/page.tsx) |
| 5 | Headlines (company stories first; RSS fallback for crypto, FX, commodities) and the company's SEC 8-K announcements in plain English | [lib/news.ts](../lib/news.ts), [app/api/news/route.ts](../app/api/news/route.ts) |
| 6 | Your own price levels with notes: tap the chart to pick a price; drawn on the chart, distance from price, saved on the device | [components/useLevels.ts](../components/useLevels.ts), [components/PriceChart.tsx](../components/PriceChart.tsx) |

## Round 3: daily briefing notifications (2026-11-02)

- **Delivery:** web push to the Home Screen app (service worker `public/sw.js`), signed with VAPID keys stored in Vercel.
- **Storage:** private Vercel Blob store `foresight-alerts` holds registered devices, watchlist, levels and the latest briefing ([lib/alerts.ts](../lib/alerts.ts)).
- **Routes:** `/api/alerts/register` (passcode), `/test` (passcode), `/briefing` (passcode), `/state` and `/send` (job secret).
- **Builder:** [scripts/daily-briefing.mjs](../scripts/daily-briefing.mjs), last step of the nightly job. Catalysts from BEA (GDP, PCE, trade), the Fed calendar, Nasdaq earnings (watchlist + top 5 companies over $100B per day) and, with `FRED_API_KEY`, BLS releases. The Labor Department's own calendar blocks automated readers, so it isn't scraped.
- **Fix found while building:** banks file exchange-traded notes under their own company number, so BMO's 47 notes showed BMO's market cap. Extra tickers now keep the company's valuation only if they trade within 20% of the main stock's price.
- **Verified:** passcode/secret checks, watchlist and level sync, the job reading them, send and read-back, and push encryption and signing (decrypted with a device key). Not verifiable here: delivery to a real phone.

## Round 4: 4 PM briefing, Markets-tab watchlist (2026-11-02)

- The job now runs at 4:02 PM New York time instead of 6:17 PM: closing prices → briefing → insider trades → commit. Two UTC schedules (20:02 and 21:02) cover daylight saving; a gate job keeps the one that is 4 PM in New York. GitHub usually starts scheduled runs a few minutes late, so the notification typically lands 4:05–4:20.
- The briefing's watchlist is the Markets tab's list, in order: the app syncs it every time it opens, not only when it changes, and sends the default list when none was saved (exactly what the Markets tab shows).
- **Which day the briefing covers:** while the market is open, the previous trading day; after the close, today; on weekends and holidays, the last trading day. Uses the S&P 500's actual session hours from Yahoo, so holidays and early closes need no calendar. The Briefing page says which day it is showing and why, including the 4:00–4:20 PM gap before today's summary arrives.
- **Manual runs without a notification:** Actions → Run workflow → untick "Send the briefing notification" updates the page silently.

## Round 5: sync, indicators, compare (2026-11-02)

- **Sync between devices** ([lib/alertsClient.ts](../lib/alertsClient.ts), `/api/alerts/sync`): the server copy is shared. Devices load it on open and on returning to the foreground, and send edits within ~1 s; a device's edit newer than the server copy wins. Entering the passcode on a new device adopts the shared copy instead of overwriting it.
- **Indicators** ([lib/indicators.ts](../lib/indicators.ts)): MA 50, MA 200, volume, RSI 14 (Wilder) in its own panel; toggles remembered per device. The chart loads extra history before the visible period so 200-period averages start at the left edge.
- **Compare**: up to 3 symbols as % change from the start of the period; one tap for the S&P 500.

## Round 6: calendar, screener data, saved screens, health check (2026-11-02)

- **Calendar page** ([app/calendar/page.tsx](../app/calendar/page.tsx), [lib/calendar.ts](../lib/calendar.ts)): next 90 days of earnings and dividends for the watchlist, plus per-stock cards (also on stock pages) with the last 4 quarters' EPS vs estimates and dividend frequency, 12-month amount and yield. Earnings dates from Nasdaq/Zacks, marked "estimated" until confirmed. Declared dividends from Nasdaq's calendar ([scripts/build-dividends.mjs](../scripts/build-dividends.mjs) → `public/data/dividends.json`); otherwise the next ex-date is estimated from past payments (Yahoo history) and labelled.
- **Screener data:** dividend yield, debt/equity, free-cash-flow yield (SEC; cash-flow items use the last fiscal year because quarters are reported year-to-date). Alternate SEC labels found by checking companies that came out wrong (J&J dividends, AT&T capex, P&G/AT&T equity). FCF and debt/equity are blank for banks, insurers and funds. New presets: Dividend payers, Cash machines.
- **Saved screens** ([lib/screen.mjs](../lib/screen.mjs) shared by page and briefing): save filters by name; synced like the watchlist; the 4 PM briefing lists new matches since the previous day.
- **Health check** ([scripts/health-check.mjs](../scripts/health-check.mjs)): the 4 PM job checks the screener before sending the briefing and all data before committing. Any failed step → nothing is published (the site keeps the last good data) and a notification names the failed step. The briefing stops if Yahoo returns no prices. The Briefing page warns when its briefing is older than the last finished trading day.

## Round 7: maintenance, options, analysts, retail interest, 13F (2026-11-02)

- **Maintenance:** 0 npm vulnerabilities (all 4 came from an old `zod` inside `@vercel/blob`; fixed with an `overrides` entry rather than npm's suggested downgrade); Next.js 16.4.4; GitHub actions checkout/setup-node v4 → v5 (Node 20 retirement); README rewritten.
- **Options** ([lib/options.ts](../lib/options.ts)): Nasdaq chain (15-min delayed), near-the-money strikes for 75 days; implied move = ATM call + put ÷ price (expected size of the move, ~0.8 SD — inside ±that range a bit over half the time), flagged when the expiry includes earnings; put/call volume ratio. CBOE (bot shield) and Yahoo (session token) were not used.
- **Analysts** ([lib/analysts.ts](../lib/analysts.ts)): Zacks consensus via Nasdaq — rating, buy/hold/sell, average/low/high target, change vs 3 months ago. Nasdaq's upgrade/downgrade list was empty for every stock tried, so it isn't shown.
- **Retail interest** ([lib/retail.ts](../lib/retail.ts)): Robinhood's popularity data ("40k users bought X") was shut down in 2020 and nothing free replaces it. Shown instead: Reddit mentions (ApeWisdom) and weekly off-exchange volume through retail wholesalers (Citadel Securities, Virtu, G1, Jane Street, Two Sigma, HRT) from FINRA, as a share of total volume — retail-type trading, not buy vs sell, 2–4 weeks delayed. The briefing flags watchlist stocks whose Reddit mentions double (≥15).
- **Big funds (13F)** ([scripts/build-funds.mjs](../scripts/build-funds.mjs)): 13 funds (Berkshire, Bridgewater, Pershing Square, Renaissance, Appaloosa, Duquesne, Third Point, Baupost, Tiger Global, Coatue, Soros, ARK, Icahn); Greenlight and Scion dropped (stopped filing). Top 100 holdings + new/added/cut/sold, on the Insiders tab and per stock. CUSIP → ticker via OpenFIGI, with a fallback that matches company names against SEC's ticker list only when exactly one company fits (fixes foreign-registered Chubb, Seagate, ASML). Only re-read when a fund files.

## Round 8: going public (2026-11-02)

Decision: one free public version in this repo; the personal-only features were removed, not kept.

- **Licensing checked:** TradingView widgets may be embedded with attribution intact; FINRA data may be shown for non-commercial use with credit; Coinbase market data may not be redistributed. Yahoo and Nasdaq-API data are gone everywhere (pages, screener, digest), as are Coinbase streaming and ApeWisdom.
- **Prices, charts, news, price screener, global calendar:** TradingView widgets ([components/TradingView.tsx](../components/TradingView.tsx)). The symbol-info widget also brings back next earnings date, market cap, P/E and yield.
- **Screener:** SEC-only, one row per company (~4,600), new FCF margin and payout ratio; price-based screening via TradingView's screener tab.
- **Removed:** options, analyst ratings, earnings/dividend calendars, price levels, Reddit mentions, own chart (lightweight-charts), passcode sync, market-close numbers.
- **Notifications for anyone:** no accounts; each device has a random ID and stores its push address, watchlist and saved screens on the server only while notifications are on ([lib/alerts.ts](../lib/alerts.ts)); concurrent sign-ups are safe (conditional writes); 5,000-device cap; stale devices deleted after ~4 months. The old passcode is now the **owner code**: devices that enter it get failure alerts.
- **Daily digest** ([scripts/daily-digest.mjs](../scripts/daily-digest.mjs)) replaces the market-close briefing: biggest insider buys, cluster buys, 13F filings and coming events for everyone; per device, insider trades, today's 8-Ks and fund moves in the watchlist, plus saved-screen changes.
- **Economic calendar** is its own data file ([scripts/build-events.mjs](../scripts/build-events.mjs)).
- **About page:** disclaimer, data sources/attribution, privacy.

## Round 9: friendlier UI, especially Insiders (2026-11-02)

- **Insiders:** plain-language intro with "How to read this"; "Several insiders buying" as cards (company, who, when; top 6 + show all); trades as sentences ("James Healy (director) bought 1,938,960 shares at $21.00") grouped by filing day, with "Show more"; one filter bar (Buys/Sells/All, executives-only switch, size buttons, search), extra options folded away; filters kept in the address bar for sharing. Names/titles tidied from SEC's "SURNAME FIRST" capitals ([components/TradeList.tsx](../components/TradeList.tsx)).
- **Big funds:** intro and "How to read this"; "Bought/Sold by several funds" across all 13 funds (each fund counted once per company); fund picker; summary stats; "What changed" tabs; largest holdings with size bars.
- **Fixes found while redesigning:** clusters averaging under $25K per insider (employee share-purchase plans, e.g. TSMC's 30 "insiders") no longer top the lists (Insiders, Markets, digest); Form 4s listing several tickers ("HEI, HEI.A") keep the first; "now owns" hidden when smaller than the trade (direct vs indirect holdings); the ?view=funds link no longer gets wiped.
- **Elsewhere:** stock pages use the same trade sentences; screener leads with described quick screens, search and sector, custom filters folded; phone nav on one line; TradingView ticker-tape credit no longer overlaps.

## Round 10: same treatment for Markets, Calendar, Digest (2026-11-02)

- **Markets:** watchlist as quote cards (price, change, mini chart via TradingView), two per row on phones, with Open/remove and an empty-state guide; "Insiders buying this week" with readable names and amounts; new "Coming up" card (next 4 economic events).
- **Calendar:** grouped This week / Next week / Later; date blocks; plain explanation per release ("PCE: the Fed's preferred inflation measure") with "What is this?"; "Add to calendar" (.ics, Eastern time) ([lib/events.ts](../lib/events.ts)).
- **Digest:** "In 30 seconds" summary; your watchlist's insider trades as sentences and fund moves grouped by stock; market-wide sections as tappable rows; "Get this on your phone" prompt when notifications are off; arrival time stated as about 4:30 PM ET (GitHub starts scheduled runs late).
- **Stock page:** "What do these mean?" glossary for the fundamentals.
- TradingView credit kept under every widget (their terms ask for attribution as designed).

## Round 11: Foresight's own market data instead of TradingView boxes (2026-11-02)

The owner asked to show market data in Foresight's own design rather than embedded TradingView boxes. Stock and index prices are licensed by the exchanges for display, and no free source permits showing them on a public site, so they stay with TradingView, now only as the price chart on stock pages. Everything else is native:

- **Markets & economy board** ([components/MarketBoard.tsx](../components/MarketBoard.tsx), [lib/macro.ts](../lib/macro.ts), `/api/markets`): interest rates (Fed funds, 3-month to 30-year Treasuries), energy (WTI, Brent, natural gas, pump gasoline), currencies (euro, pound, yen, yuan), crypto (bitcoin, ether, solana, XRP) and economic reports (inflation, unemployment, jobs, GDP growth). Cards with sparklines; tap one for an interactive chart (drag to read any day) with ranges. A plain-English "this week" summary at the top.
  - US government data comes through FRED's CSV download, which needs a recognizable User-Agent. Exchange rates come from the ECB data API, crypto from CoinGecko's public API with a "Powered by CoinGecko" credit (an optional `COINGECKO_API_KEY` uses a free Demo key). CoinGecko doesn't say whether its free plan covers public sites; if it objects, drop the crypto group.
- **Watchlist** cards built from Foresight's own data (`/api/watch`): insider buying/selling (30 days), funds that bought or sold last quarter, sales growth and margin.
- **Stock page:** native header with a watchlist button; the TradingView chart uses the page's colors with toolbars hidden, our own range buttons, and an "Indicators & compare" switch that brings the tools back. TradingView headlines removed (SEC announcements remain).
- Removed: ticker tape, market overview, the price screener tab and the worldwide calendar widget.
- **Digest:** a "Markets this week" section, and the 4 PM notification ends with a line like "10Y 4.94% (−0.04) · Oil $103.37 (−1.8%) · BTC $76.8K (−1.0%)".

## Round 12: simpler Markets page, insider bar charts (2026-11-02)

- **Markets** cut to what the owner wants: the 10-year Treasury yield and four coins (bitcoin, ether, solana, XRP), as one strip of cards at the top of the page (swipe on phones). Tap a card for its chart (1W–1Y). Energy, other rates, currencies and economic reports are gone; `lib/macro.ts` keeps only FRED's DGS10 and CoinGecko.
- **Insiders page:** "Insider buying by day" bar chart with 30-day totals (tap a bar to filter the trade list to that day), and "Biggest buys by company" as ranked bars ([components/Bars.tsx](../components/Bars.tsx)). Counts executive and director open-market buys only.
- **Markets page:** "Insiders buying this week" is a bar chart by amount; watchlist cards are simpler (no sector line or intro text).
- **Stock page:** bought vs sold bars above the insider trade list.
- Digest and notification: the markets line is now 10Y · BTC · ETH.

## Round 13: market strip order, Insiders sections (2026-11-02)

- **Markets strip**, in the owner's order: S&P 500, Nasdaq 100, bitcoin, gold, 10-year Treasury yield.
  - The two indexes are owned by S&P and Nasdaq (FRED marks the S&P 500 "copyrighted: pre-approval required"), so they are TradingView mini-overview widgets (FOREXCOM index CFDs) sized to match the native cards. The owner chose this over dropping them or republishing FRED's copyrighted series.
  - Gold is the PAX Gold token from CoinGecko (one token = one ounce held in London vaults; trades within about 1% of spot), because no free source may republish the LBMA gold price. Ether, solana and XRP were removed.
  - Fix: TradingView frames don't declare a color scheme, so on a dark page the browser painted transparent widgets white. `.tradingview-widget-container iframe { color-scheme: light; }` matches the frame to its document and keeps it transparent.
- **Insiders page** split into four tabs instead of one long page: Overview (30-day totals, buying-by-day bars, biggest buys, top 3 group buys), Group buys, All trades (filters and list; tapping a day bar opens this tab filtered to that day), and Big funds, itself split into "What funds are buying" and "Look up a fund". URLs: `/insiders?view=groups|trades|funds`; old filter links still open All trades.
- Digest notification line: BTC · Gold · 10Y.

## Round 14: whole Markets strip from TradingView (2026-11-02)

- The owner preferred one consistent look, so bitcoin, gold and the 10-year are TradingView mini quotes too: `BITSTAMP:BTCUSD`, `TVC:GOLD` (spot gold) and `FRED:DGS10`. Free widgets refuse `TVC:US10Y` and `TVC:TNX` ("only available on TradingView"), so the 10-year is TradingView's daily copy of FRED, which can trail FRED by a day.
- Foresight's own line charts (`components/Charts.tsx`) are removed. `lib/macro.ts` and `/api/markets` stay for the Digest page's weekly summary and the 4 PM notification line, which TradingView widgets can't supply.

## Round 15: launch readiness (2026-11-02)

- **Device sync only when something changed.** Every register call rewrites the shared `alerts/devices.json` in Blob storage, and every page load used to make one for devices with notifications on (two Blob operations per visit). The browser now remembers what it last sent (`foresight.synced`) and skips the call unless the watchlist or screens differ, or a week has passed (so the server's 120-day idle pruning still sees the device).
- **Longer CDN caching** with `stale-while-revalidate` on the per-stock SEC routes (insiders 30 min, announcements 30 min, company 1 day, search 1 hour, watch 30 min, retail 12 hours, digest 5 min), so traffic to a popular stock costs one SEC request per cache period.
- **Owner code box** on the Digest page now appears only at `/briefing?owner`.
- **Terms of use** page (`/terms`), linked from the footer and About: not advice, data as-is, third-party data stays theirs, fair use, changes. No contact address yet (owner's choice).
- **First-visit welcome** ([components/Welcome.tsx](../components/Welcome.tsx)): one screen explaining the three things to do (follow stocks, see who's buying, daily digest), with an Add-to-Home-Screen tip on iPhone Safari. A bottom sheet on phones, shown once per browser.
- FINRA retail table kept on stock pages by the owner's decision; the public-display terms for that dataset remain unconfirmed.

## Round 16: link previews, visitor counts (2026-11-03)

- **Link previews:** site title "Foresight: what insiders are buying" with a page-name template, descriptions for every page (route `layout.tsx` files carry metadata for the client-rendered pages), Open Graph and Twitter card tags, and share images rendered by `next/og`:
  - [app/opengraph-image.tsx](../app/opengraph-image.tsx): the site card (logo, headline, bar motif).
  - [app/stock/[symbol]/opengraph-image.tsx](../app/stock/[symbol]/opengraph-image.tsx): ticker, company and the last 30 days of executive/director buys vs sells, read from `insiders.json` (cached 1 hour).
- `robots.txt` (crawl everything except `/api/`) and `sitemap.xml`.
- **Visitor counts:** `@vercel/analytics` 2.0.1 (`<Analytics />` in the layout). Cookieless; noted in the privacy section. Must be switched on once in the Vercel dashboard (project → Analytics → Enable).
- **Name check (not legal advice):** web searches found other finance businesses called Foresight (EquBot's AI investing product "Foresight", UK-listed Foresight Group, a New York private-market data startup, an Indian opinion-trading app) and a "Foresight Investment Solutions, LLC" said to hold a mark for investment research. No USPTO record was confirmed; the owner should search tmsearch.uspto.gov.

## Round 17: renamed to Form4 (2026-11-03)

- The site is now **Form4**, at **https://form4-insiders.vercel.app** (form4.vercel.app belongs to another account). Named after the SEC's Form 4; About and the welcome screen explain the name and say the site isn't affiliated with the SEC.
- Renamed in page titles, share images, the app manifest (home-screen name), notification titles, the GitHub job's `SITE_URL`, and user-agent strings. Browser storage keys keep their `foresight.` prefix so visitors' watchlists and settings survive.
- `vercel.json` permanently redirects foresightscreener.vercel.app to the new address, except `/api/*` and `/sw.js`, so phones still subscribed through the old address keep working.
- Name notes: no FORM4 or FORM FOUR trademark turned up in third-party searches, but "Form 4" is the filing's name, so it's descriptive and others use it (secform4.com, a "Form 4 Insider Tracker" at form4-tracker.vercel.app). Low legal risk; differentiation comes from quality.

## Round 18: Form4 logo (2026-11-03)

- After 50 concepts across four rounds, the owner chose **Terminal**: `[4]` in lime (`#a3e635`) on near-black (`#0a0a0a`), without the cursor underline. Drawn as strokes, not text, so it renders the same on every device (the 4's top corner is bevelled and the crossbar corner kept sharp with `stroke-miterlimit="3"`). Source files: [docs/brand/form4-mark.svg](brand/form4-mark.svg) (rounded) and [docs/brand/form4-mark-square.svg](brand/form4-mark-square.svg) (full-bleed, for app icons).
- Applied to the browser-tab icon (`app/icon.svg`), the iPhone icon (`app/apple-icon.png`, 180px), app icons (`public/icon-192.png`, `icon-512.png`, also listed as maskable), the header (`components/Logo.tsx` plus a monospace "Form4" wordmark) and both share images.
