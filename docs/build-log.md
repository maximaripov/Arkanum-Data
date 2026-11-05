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

- After 50 concepts across four rounds, the owner chose **Terminal**: `[4]` in lime (`#a3e635`) on near-black (`#0a0a0a`), without the cursor underline. Drawn as strokes, not text, so it renders the same on every device (the 4's top corner is bevelled and the crossbar corner kept sharp with `stroke-miterlimit="3"`). 
- Applied to the browser-tab icon (`app/icon.svg`), the iPhone icon (`app/apple-icon.png`, 180px), app icons (`public/icon-192.png`, `icon-512.png`, also listed as maskable), the header (`components/Logo.tsx` plus a monospace "Form4" wordmark) and both share images.
- Revised the same day at the owner's request: every corner sharp. The tile has square corners, and the brackets and 4 are filled shapes (even-odd path, the 4's counter cut out) instead of strokes, so the top of the 4 is crisp instead of bevelled. One file now: [docs/brand/form4-mark.svg](brand/form4-mark.svg). Phones still round home-screen icons themselves.

## Round 19: site green matches the logo lime (2026-11-03)

- Dark mode: highlight (`--accent`), gains/buys (`--up`) and bars (`--bar`) are the logo's lime `#a3e635` (12:1 contrast on the dark card).
- Light mode: the exact lime is unreadable as text on white (1.5:1), so text uses lime-700 `#4d7c0f` (5:1) and bars use lime-600 `#65a30d` (3.1:1, enough for graphics).
- Primary buttons use the exact lime with black text in both modes (`--brand`, 13:1). The stock share image's "Bought" bar is lime too.
- TradingView widgets keep their own colors.

## Round 20: conviction, insiders homepage, readable pages, hourly data, instant alerts (2026-11-03)

- **Conviction labels** ([lib/conviction.mjs](../lib/conviction.mjs)): every open-market buy gets Strong signal / Notable / Routine plus the reasons. Points for role (CEO/CFO/President/Chair most; a 10%-holder-only least), stake increase (from the shares owned after the trade), first buy in N years, other insiders buying the same stock, and size; pre-planned trades lose points; buys under $10K/$25K are capped at Routine/Notable. Shared by the site, the digest and the alert script.
  - "First buy in N years" ([scripts/lib/history.mjs](../scripts/lib/history.mjs)): looks back through the insider's own Form 4s (newest first, up to 25 within 5 years) for an earlier buy of the same stock; filings are cached in `data/insider-history.json`. Form 4 rows now record the insider's SEC ID (`ownerCik`); the nightly job fills it in for older rows.
  - Shown on every trade list, the new **Strongest buys** card (replaces "Biggest buys"), a "Strong & notable buys only" filter, the digest's strongest buys, and stock pages (live SEC trades get history copied from the site's data).
- **Insiders is the homepage** (`/`, with its tabs); Markets and the watchlist moved to `/markets`. `/insiders` redirects to `/` with its query string.
- **Pages search engines can read:** stock pages are rendered on the server with their trades, fundamentals and announcements (refreshed every 30 minutes); new **insider pages** (`/insider/[cik]`, every buy and sale an insider reported across companies, refreshed every 6 hours). Insider names link to them. The sitemap lists every stock and insider with a buy in the last 30 days.
- **Hourly insider data** (`.github/workflows/insiders-hourly.yml`, weekdays ~7 AM–11 PM ET): reads SEC EDGAR's live Form 4 feed and writes the small `public/data/insiders-today.json` (only filings not already checked; nothing is committed when nothing changed). The site merges it with the 30-day file ([lib/insiderMerge.mjs](../lib/insiderMerge.mjs)). The repo is private, so this uses GitHub's free minutes: about 2 minutes × 17 runs × ~22 weekdays ≈ 750 of the 2,000 a month. SEC requests are spaced to stay under 10 a second ([scripts/lib/sec.mjs](../scripts/lib/sec.mjs)). Both jobs push with `pull --rebase -X theirs`, so a clash on the history cache keeps the newer copy.
- **Instant alerts** ([scripts/instant-alerts.mjs](../scripts/instant-alerts.mjs), `/api/alerts/instant`): after each hourly run, a buy by a CEO, CFO, President or Chair, or any Strong-signal buy (not pre-planned), notifies devices with that stock on their watchlist, once per buy. On by default; a switch on the Digest page turns it off (`instant` on the device record).

## Round 21: follow an insider, hourly failure alerts, automated tests (2026-11-03)

- **Follow an insider:** "☆ Follow" on insider pages; followed people are listed on /markets ("People you follow") and stored on the device (`foresight.following`), synced to the server with the watchlist (`following` on the device record, SEC IDs only, max 100). The hourly alert script now also alerts on every new buy or large sale (≥$250K) by a followed insider, at any company; watchlist alerts are unchanged. Follow alerts link to the insider's page. Both use the Digest page's "Instant alerts" switch.
- **Hourly job alerts:** on failure, the owner's devices get one message naming the failed step (setup, reading SEC's feed, saving, alerts); repeated failures don't repeat it (the job checks the previous run with `gh run list`), and a "working again" message follows the first success. An empty SEC feed now counts as a failure instead of "nothing new".
- **Automated tests:** `npm test` (Node's built-in runner, no new dependencies), 22 tests over Form 4 parsing, signal scoring, partial-fill merging, today/30-day merging and name/role formatting (`tests/`). `.github/workflows/tests.yml` runs them plus the type check on code pushes and pull requests; data-only commits are skipped to save GitHub minutes.

## Round 22: Company stakes replaces the screener and calendar; big events only (2026-11-04)

- **Removed:** the screener (`/screener`, saved screens and their digest section) and the calendar page (`/calendar`). Old links redirect to `/stakes` and `/markets`.
- **Big events only** ([scripts/build-events.mjs](../scripts/build-events.mjs)): Coming up now lists just the Fed decision, jobs report, CPI, GDP and PCE.
- **Company stakes** (`/stakes`, [scripts/build-stakes.mjs](../scripts/build-stakes.mjs), `.github/workflows/stakes.yml`, weekdays): what listed companies own in other public companies. Which companies is discovered, not hand-picked: every listed company that filed a 13F in the last two quarters, minus banks, insurers and asset managers (SEC industry codes 6000–6799) and anything reporting 300+ holdings, plus SoftBank Group. 33 companies on the first runs. For each: quarterly holdings and changes (13F, shared with Big funds via [scripts/lib/thirteenf.mjs](../scripts/lib/thirteenf.mjs)) and 5%+ stake filings from the last 12 months (Schedules 13D/13G, structured XML since 2025; a 0% final filing shows as "Exited"). Stock pages show "Companies that own {symbol}".

## Round 23: private investments, more companies, one consistent layout (2026-11-04)

- **Private investments** ([scripts/build-private.mjs](../scripts/build-private.mjs), [scripts/lib/deals.mjs](../scripts/lib/deals.mjs)): the hourly job reads PR Newswire's venture-capital, financing, private-placement and all-news feeds plus Business Wire's main feed, and keeps any release where a tracked listed investor (about 40, with their venture arms: NVentures, GV, CapitalG, M12, Intel Capital, Salesforce Ventures…) is named as leading or joining a round, or "invests in" a named company. Kept two years in `public/data/private.json`; shown on Stakes as "reported in press releases, not verified", each linking to its release. Investors with no SEC holdings (Microsoft, Salesforce…) appear in the company list once they have a deal. A feed failure doesn't fail the hourly job. Google News was ruled out (its terms don't clearly allow republishing headlines). Tests: `tests/deals.test.mjs`.
- **More companies on Stakes:** besides 13F filers, any listed non-financial company that appears with another listed company in a 5%+ filing is checked; filings that turn out to be someone else's stake in it are remembered (`data/stakes-skip.json`) so they aren't re-read daily. A Gilead stake of 100% (Arcellx, no longer listed) shows as "All".
- **Layout:** intro blurbs and "How to read this" / "What do these mean?" sections removed everywhere. Stakes and Big funds now match: a dropdown to pick the company or fund, "what changed" as short ticker lines inside the holdings card, and on Stakes the cross-company lists (recent private investments, recent 5%+ filings) at the bottom. The Insiders tabs fit on small phones.
- **Leftovers removed:** saved-screens fields in the device store and alert routes (old records drop them on their next save); About, README and code comments no longer mention the screener or calendar, and About lists the stakes and press-release sources.

## Round 24: everything refreshes on its own (2026-11-04)

- Audit of every data feed: insiders (hourly + daily), big funds (daily, latest two 13Fs per fund, so new quarters appear by themselves), stakes (daily; company list rediscovered monthly), private investments (hourly), events and fundamentals (daily). All files on the live site were fresh.
- **Jobs report and CPI were missing from Coming up:** they came only from FRED, and no `FRED_API_KEY` secret is set, so they were silently skipped. [scripts/build-events.mjs](../scripts/build-events.mjs) now falls back to BLS's own release calendar (quietly skipped if BLS refuses the request).
- **Private investments missed between hourly runs:** each feed shows only its latest 20 releases and nothing ran overnight or at weekends. The daily job now re-reads PR Newswire's last ~2 days of releases (`backfill-private.mjs --since` 3 days ago; ~13 seconds).
- **Backfill current month fixed:** `sitemap-news.xml` is an index of pages, not a list of releases, so it parsed 0 rows; it now follows the pages (~2,000 releases).
- Notes for the next session: [docs/handoff.md](handoff.md).
- **Stakes, first scheduled run:** started 55 min late (GitHub's scheduler was running behind), finished in 3.5 min instead of 35 thanks to the skip cache; 136 companies. Holdings from a 13F more than ~15 months old are no longer shown (Qualcomm and Palantir stopped filing in 2023); their recent 5%+ filings still are.
- **Hourly job failure at 8:17 AM ET:** the data was saved, but the runner briefly couldn't look up the site's address (DNS `ENOTFOUND`) when sending instant alerts, so the run failed and that hour's alerts were lost. Calls from the jobs to the site now retry twice (after 5 s and 15 s) when the request never reached the site ([scripts/lib/site.mjs](../scripts/lib/site.mjs) `siteFetch`). Instant alerts also now fail loudly if the device list can't be read, instead of quietly sending nothing.

## Round 25: redesign — dense desktop, app-style phone, dark by default (2026-11-04)

- Chosen from five mocked directions (A Terminal, B Ledger, C Signal, D After Hours, and the A + C hybrid the owner picked): A's information-forward desktop with C's phone layout.
- **Theme:** dark is the default for everyone; a sun/moon button switches to light, remembered per device (`form4.theme` in the browser; [lib/theme.ts](../lib/theme.ts), [components/ThemeToggle.tsx](../components/ThemeToggle.tsx)). A tiny script in the layout applies it before the first paint, and the phone status-bar color follows. TradingView widgets follow the switch too. Light mode darkens the lime for text contrast on white.
- **Fonts:** Inter for text, JetBrains Mono for numbers (self-hosted by `next/font`, no requests to Google from visitors).
- **Navigation:** desktop top bar (sections, search, theme); phones get a compact header with a search button and a bottom tab bar. A ticker band under the header lists today's officer and director buys and large sales with how long ago the data refreshed ([components/Ticker.tsx](../components/Ticker.tsx); hidden when today's file is empty).
- **Insiders overview:** headline numbers (bought, insiders buying, strong signals, large sales — labeled "$250K+" because the 30-day file keeps only those — and companies); Strongest buys as a table with a 10-bar signal meter on desktop and as score rings on phones; Buying together; buying by day; Latest filings. Phones lead with the strongest buy of the week as a card. The "Why" column hides between 761 and 1199px and side-by-side cards stack below 1000px so values are never cut off.
- **Stakes:** same 12-column grid — holdings beside the company's 5%+ stakes and private rounds, cross-company lists side by side.
- Everything else (cards, tables, tabs as a segmented control) restyled through the shared CSS.
- **Digest:** S&P 500 and Nasdaq 100 cards (TradingView widgets: latest day's move, one-month chart) above "Markets this week". The push notification text still has no index figures: they are licensed (round 13). "Charts ›" now goes to /markets (it pointed at /, the Insiders page since round 20).

## Round 26: faster home page, readable names, notable sales, insider marks, signal backtest (2026-11-04)

- **Home page data:** the hourly and daily jobs write `public/data/overview.json` ([scripts/build-overview.mjs](../scripts/build-overview.mjs), [lib/overview.mjs](../lib/overview.mjs)): 15 KB (3.6 KB compressed) instead of the 850 KB (164 KB compressed) 30-day file, which now loads only for All trades and Group buys. If overview.json is missing, the page computes it from the full file.
- **Names:** `companyName()` in [lib/people.mjs](../lib/people.mjs) keeps the company's own casing (half of SEC names are already mixed case, and title-casing made "MGM" into "Mgm") and keeps acronyms in ALL-CAPS names (no-vowel words, two-letter words, the stock's own symbol, a short list); drops state tags ("/DE/", "(de)"). Replaces eight local copies. "See Remarks" roles show as "insider". `isExecOrDirector` moved into the same shared module.
- **Sales:** `saleFlags()` in [lib/conviction.mjs](../lib/conviction.mjs) flags top executive, share of the holding sold, several insiders selling and "not pre-planned"; "Notable sale" = not pre-planned, not a fund with a board seat, and a top executive selling 25%+ or $1M+, or anyone selling half or more (~12% of large sales). New Notable sales card on the overview; flags in every trade list.
- **Fixes:** "Vice President" was scored as a top executive (it matched "President"); the strong-signal label said "score 75+" (strong is 60+).
- **Stock pages:** a strip under the chart marks officer/director buys and sales over the chart's range, one mark per day and side, sized by amount; tap for details. It says how far back the loaded filings (latest 25) reach.
- **Backtest (owner-only):** [scripts/backtest.mjs](../scripts/backtest.mjs) + manual workflow `backtest.yml`: scores past officer/director purchases from SEC's quarterly insider data sets with the site's `conviction()` and measures returns from the first close after the filing against SPY (Yahoo daily closes, used only for the statistics). Results in [docs/backtest/](backtest/).

## Round 27: search insiders by name, Congress trades (2026-11-04)

- **Insider search:** the hourly and daily jobs keep a directory of everyone who filed a Form 4 the site has seen, for two years ([scripts/build-people.mjs](../scripts/build-people.mjs) → `public/data/people.json`, read by `/api/search` on the server). Typing part of a name ("lip bu") finds the person; the result opens their insider page.
- **Congress trades** (`/congress`, new nav item and phone tab): House members' STOCK Act Periodic Transaction Reports from the House Clerk's yearly index; each new e-filed PDF is read with `pdftotext -layout` ([scripts/lib/congress.mjs](../scripts/lib/congress.mjs), anchored on the two dates in each row; tests in `tests/congress.test.mjs`). Scanned paper filings (~12%) can't be read and are counted. Party from the public-domain congress-legislators list (state + shared surname word; former members shown without a party). Daily workflow `congress.yml` (only new reports; `--rebuild` re-reads all). Two years: ~10,900 trades, ~9,400 stock trades by 101 members.
  - Page: member dropdown, headline numbers (trades, members, buys/sales in 30 days, median days to disclose), latest disclosed trades, most bought/sold in 90 days, most active members. Stock pages: "Congress trades in X". `/api/congress?symbol=|member=` serves lookups from the full file so pages load only the 27 KB summary.
  - **Senate not included:** its search site requires agreeing to terms (no commercial use, etc.); that's the owner's decision, not made yet.
  - **Senate (2026-11-04):** the owner agreed to the eFD site's terms, but its Akamai bot protection answers "Access Denied" to automated requests from both this dev machine and GitHub's runners (even a real headless browser), so Senate trades can't be read automatically. Not built.

## Round 28: no emoji (2026-11-05)

- Owner rule: no emoji anywhere. Removed the lightning bolt on the phone's lead buy, the chart and bell in the welcome popup (now line-drawn icons like the nav), the stars on Follow and watchlist buttons, check marks on filter buttons and in the owner box, and the share glyph in the iPhone tip. `tests/no-emoji.test.mjs` fails the tests if any comes back; the rule is in AGENTS.md and the handoff notes.

## Round 29: retail trading section removed (2026-11-05)

- The owner asked to drop the FINRA retail-wholesaler table from stock pages. Removed the section, `/api/retail` and `lib/retail.ts`, and FINRA from About, Terms and the README. (Its terms were non-commercial only, so this also clears one item from the monetization checklist.)

## Round 30: three factual fixes (2026-11-05)

- **"Sold entire stake" was wrong for people with several accounts** (e.g. a director emptying a trust while holding 1.1M shares directly). Form 4s list each account separately and untouched accounts as plain holdings; the parser now adds them all into `ownedTotal` ([lib/form4.mjs](../lib/form4.mjs)). Sale share-sold flags use only that total and say nothing for older rows without it; buys' "Stake +X%" uses it when present. Notable sales went from 150 to 72 until new filings bring share figures back.
- **Dates without a year:** trade lists now show the year for other years, so insider pages read in order.
- **"Llc":** organizations filing as insiders keep LLC/LP/LTD in capitals (`personName` uses `companyName` for them); the search directory was rebuilt.
