# Form4: build log and summary (formerly Foresight)

Built on 2026-11-02 in one Claude Code session. Personal use only.

## Links

| What | Link |
|---|---|
| Live app | https://form4-insiders.vercel.app (foresightscreener.vercel.app redirects) |
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

## Round 31: a page for every Congress member (2026-11-05)

- **Member pages** (`/congress/<name>`, e.g. `/congress/nancy-pelosi`): one per House member with stock trades (101 now), rendered on the server so the trades are in the HTML that search engines read; each has its own title, description and canonical address, and all are in the sitemap (as is `/congress`, which was missing). Pages are built on first visit and refreshed at most hourly. Same layout as before: the member dropdown, headline numbers and their latest 200 trades.
- **Data:** the daily Congress job also writes one small file per member, `public/data/congress/<slug>.json` ([scripts/lib/congress-summary.mjs](../scripts/lib/congress-summary.mjs), which now builds the overview too; run it alone to rebuild both from `congress.json` without fetching). The files carry no timestamp, so a run only changes the members with new trades. The address comes from `memberSlug()` in [lib/congress.mjs](../lib/congress.mjs); if two members ever map to the same address the job fails rather than mixing them up.
- **Links:** the dropdown, the "Most active members" list, member names in trade tables and Congress trades on stock pages all open the member page. Old `/congress?member=Name` links are sent to the new address. `/api/congress` now serves only `?symbol=` (stock pages); member lookups no longer download the 4.4 MB file.

## Round 32: RSS feeds, share pictures for insider and member pages (2026-11-05)

- **RSS feeds:** `/feeds/insider-buys.xml` (executive and director purchases scoring 60+, one item per filing with the amounts added up, latest 50, with the score's reasons and a link to the SEC filing) and `/feeds/congress.xml` (House members' reports, one item per report listing its stock trades, latest 50, linked to the member page and the PDF). Built hourly from the same data as the site ([lib/rss.ts](../lib/rss.ts)). Linked in the footer and in the page head so feed readers find them; pages with their own canonical link (stock, insider, member) don't carry the head link.
- **Share pictures:** insider pages and Congress member pages now have their own picture when shared (name, role or party and seat, bought/sold or trade counts, latest three trades) instead of the site-wide one ([lib/og.tsx](../lib/og.tsx)). Stock pages already had one (last 30 days of executive and director buying and selling) and keep it.
- `amountRange()` (Congress amount ranges) moved to [lib/congress.mjs](../lib/congress.mjs) so the server-side picture can use it.

## Round 33: insider amounts were counted twice (2026-11-05)

- **Bug:** the daily insider job read each Form 4 once for every filer SEC's daily index lists it under (the company and each insider, each with its own file path), and the partial-fill merge then added the copies together. Shares and dollar amounts in the 30-day file were doubled, or more for filings with several insiders: headline totals, buy sizes, scores (size), "Stake +X%" and share-sold figures were all inflated. Found because an insider's share picture (live SEC data, read once) showed half of what the feed (30-day file) did; 125 of 641 buys in the file had more shares bought than owned afterwards, against 1 of 49 in the hourly file, which was never affected.
- **Fix:** `form4Files()` in [scripts/lib/sec.mjs](../scripts/lib/sec.mjs) keeps one path per accession number (test in `tests/merge.test.mjs`). The 30-day file now carries `version: 2`; an older file is discarded and all 30 days are fetched again (about an hour once; the daily workflow's time limit went from 90 to 150 minutes for it).
- **Not affected:** the hourly feed, stock and insider pages (they read SEC directly), Congress data, and the backtest (SEC's quarterly data sets).
- **Result (rebuild 2026-11-05 03:13 UTC):** 30-day executive/director buying $636M across 444 buys (was shown as $1.57B across 475); large sales $8.1B across 1,013 (was $17.1B across 1,321; sales doubled past the $250K cut-off are gone). Buys with more shares bought than owned afterwards: 11 of 650 (was 125 of 641), the same rate as the hourly file (insiders holding shares in several accounts). Rudy Pimentel's KIO buy now matches his SEC filing ($40.9K, was $81.8K).

## Round 34: buy labels say "unusual", not "strong" (2026-11-05)

- The backtest found the score does not pick better-performing buys, so the labels now describe what the score measures: **Unusual** (60+), **Somewhat unusual** (40–59), **Routine**. "Strongest buys" became "Most unusual buys", "Signal 88" became "Score 88", and the "Strong & notable buys only" filter became "Unusual buys only". Same in the Digest page, the daily notification ("Most unusual insider buy"), the insider RSS feed (now "unusual insider buys") and the About page, which now says higher-scoring buys did not do better in Form4's 2023–2025 test.
- Removed three claims the test doesn't support: group buys as "the strongest insider signal" (Insiders, Digest) and "Buys by several insiders are the strongest signal" (stock pages).
- Only display text changed: stored tiers are still `strong` / `notable` / `routine`, so no data or saved links (`?signal=1`) change. Scoring itself is unchanged.

## Round 35: the remaining "Foresight" names (2026-11-05)

- Renamed: package name (`form4`), the service worker's default notification tag, in-page event names, `.env.example`. The site's alert check (`lib/alerts.ts`) now accepts GitHub jobs from either `maximaripov/Form4` or `maximaripov/Foresight` and either token audience (`form4-alerts`, `foresight-alerts`), so the repo can be renamed without breaking the digest or alerts; the jobs switch to `form4-alerts` in a second push once the site accepts it.
- Kept on purpose: browser storage keys (`foresight.watchlist`, `.following`, `.welcomed`, `.instant`, `.deviceId`, `.notificationsOn`, `.synced`): renaming them needs a migration on every visitor's device and nobody sees them. The foresightscreener.vercel.app redirect (phones subscribed through it still use its `/api` and `/sw.js`). Old build-log rounds, which record history. The Vercel Blob store `foresight-alerts` (named in Vercel; the code reaches it by token, not name).
- Owner to do: rename the GitHub repo (Settings → Repository name → Form4) and the Vercel project (Settings → General → Project Name), only after this round is live.

## Round 36: backtest research page, Congress overview rendered on the server (2026-11-05)

- **`/research/insider-buys`**: the backtest written up for readers (method, a six-month table, findings, what changed on the site, limits), linked from About and in the sitemap; numbers from [docs/backtest/results.md](backtest/results.md). Its table is the site's first one shown on phones too (`.ttable.fit`: names wrap, tighter cells under 400px).
- **`/congress`** now arrives with its numbers and lists in the HTML (fetched on the server, refreshed hourly) instead of "Loading…"; the browser fetches only if the server couldn't.
- Member links and the sitemap now build each member's address from their name (`memberSlug`) instead of the stored `s` field, so an old cached copy of the overview can't produce `/congress/undefined` links (it did in a local build).
- **Findable:** the research page was linked only from one bullet on About, and the owner couldn't find it. Now also "Research findings" in the footer's link row on every page, next to About and Terms (owner's choice: footer only, no links inside cards).
- **RSS links removed from the footer:** on phones they opened a raw XML file, which looks broken to anyone without a feed reader. The feeds stay, and feed readers still find them from the link in each page's head.

## Round 37: famous insiders findable (2026-11-05)

- **Sitemap:** also lists every stock and executive/director with a $250K+ sale in the last 30 days, not only buyers: 758 stock pages (was 307) and 1,224 insider pages (was 436). Well-known executives mostly sell, so their pages weren't in the sitemap. Not every insider is listed on purpose: each insider page reads their filings from SEC, and crawling tens of thousands would run into SEC's rate limits.
- **Search directory backfill:** [scripts/backfill-people.mjs](../scripts/backfill-people.mjs) adds everyone with a trade the site would show (any open-market purchase, or $250K+ of sales in one filing) over the last two years from SEC's quarterly data sets; manual workflow `people-backfill.yml`, then `build-people.mjs` as usual (newer records win). Test in `tests/backfill-people.test.mjs`.
- The quarterly data-set reader moved from the backtest into [scripts/lib/form345.mjs](../scripts/lib/form345.mjs) (shared; a local test folder no longer tries to download missing quarters).
- `/api/search` keeps the directory in memory for an hour, since a backfilled file can exceed the 2 MB fetch-cache limit.
- **Backfill result (2026-11-05):** 19,381 insiders in the search (was 1,504), 1.1 MB. SEC's quarterly data sets were found for 2024q4–2026q1; **2026q2 and 2026q3 returned "not published"** (unexpected: they usually appear about a month after the quarter), so people whose only trades fell in April–early October 2026 are missing until `people-backfill.yml` is rerun after SEC publishes them. SEC's name for Nvidia's CEO is "Jen Hsun Huang": "jen huang" finds him, "jensen" doesn't.

## Round 38: searchable pickers (2026-11-05)

- The member, company and fund dropdowns are now one searchable picker ([components/Picker.tsx](../components/Picker.tsx)): a select-like button opens a panel (desktop) or a sheet from the bottom (phone) with a search box. Typing matches the start of any word in the name or details (party, state, ticker, manager): "tx" finds the 11 Texas members. With nothing typed it shows a short group first ("Most active" members by trades, "Largest holdings" for company stakes), then everything A–Z. Arrow keys, Enter and Escape work; the current choice is marked in lime. Keeps the owner's "dropdown, not chip slider" rule.
- Fixed "1 trades" in Congress lists.

## Round 39: well-known insiders (2026-11-05)

- **"Well-known" tab on Insiders** (`?view=famous`, [components/FamousView.tsx](../components/FamousView.tsx)): up to 100 insiders ranked by English Wikipedia page views over the last 30 days, with role, company, views and latest filing, linked to their insider page. Built daily by [scripts/build-famous.mjs](../scripts/build-famous.mjs): Wikidata's current CEOs and chairs (P169/P488, no end date) of companies with an SEC ID (P5531) and an English article, matched to the person filing Form 4s for that company in the insider directory (same company via SEC's ticker list, surname in the filer's name, same first initial, and exactly one such filer, otherwise left out: [scripts/lib/famous.mjs](../scripts/lib/famous.mjs), tests in `tests/famous.test.mjs`), then Wikimedia's pageview API. Keeps the previous list if Wikidata or Wikipedia is down.
- Why Wikipedia views: the only free, legitimate measure of how much people look someone up (X's API is paid, Google Trends has no API, Reddit's needs an approved app). It covers CEOs and chairs only, and only people with an English Wikipedia article. Only 4 people on Wikidata carry an SEC ID, hence matching through their company.
- **Search knows common names:** the directory carries the Wikipedia name as a fifth field when it differs ("Jensen Huang" for SEC's "Jen Hsun Huang"), and results show it. The daily job runs build-people again after build-famous.
- **Sitemap** adds the well-known insiders' pages.
- **Tabs wrap** on narrow phones instead of scrolling sideways (5 tabs didn't fit an iPhone SE; the fifth was off-screen). The unused `.scroll-tabs` style was removed.
- **First run (2026-11-05):** 491 Wikidata CEO/chair entries → 109 matched → 86 listed. 23 were dropped because Wikipedia refused requests from GitHub's shared servers (Elon Musk and Andy Jassy among them). Now: one request a second, waits as long as Wikipedia asks (Retry-After), five tries, then yesterday's count, and logs anyone still missing by name. Wikidata's own gaps: Tim Cook's Apple CEO entry has an end date (August 2026) and Apple's chair entry is out of date, so he isn't matched; entries without an English name now use the article title.

## Round 40: what well-known insiders did (2026-11-05)

- The owner asked whether people who only sell belong on the list. Of the 100, in the last 30 days: 80 had no buys or $250K+ sales, 18 sold (12 entirely under pre-planned 10b5-1 plans), 2 bought (Julie Sweet, $3.0M; C. C. Wei, $11K). Kept the list (it's for people searching famous names), and each row now says what the person did: "Bought $3.0M · Oct 26" (green), "Sold $2.7M · pre-planned · Oct 13" (red), or "Last buy or big sale: Oct 2025".
- `withActivity()` in [scripts/lib/famous.mjs](../scripts/lib/famous.mjs) (tested) sums each person's buys and $250K+ sales from the 30-day + today data; `build-famous.mjs --activity-only` refreshes it hourly (new step in `insiders-hourly.yml`; famous.json added to its commit) and the daily run adds it after ranking.
- The activity line wraps instead of being cut off on small phones (`.lrow-main > .wraps`): an ellipsis had hidden the year in "last filing Oct 31, 2025", which read as a recent date.

## Round 41: totals typed into the price box (2026-11-06)

- **Bug (filers' mistakes):** some Form 4s put the total dollar amount in the per-share price box: three SPPL sales filed 2026-11-05 (189,310 shares at "$270,710.44" became a $51.2B sale), one LONA buy ($9.9B) and two IHT sales ($2.2B, $2.0B). The 30-day large-sales total read $75.6B (true: $4.25B) and SPPL led the ticker.
- **Fix:** `priceAndValue()` in [lib/form4.mjs](../lib/form4.mjs) reads a price over $1,000 a share that makes a trade over $1B as the total (real $1B+ trades happen at ordinary prices; $1,000+ stocks don't trade $1B at a time); tests in `tests/form4.test.mjs`. `mergeInsiders()` applies it to trades already saved and drops corrected sales that fall under the $250K cut-off (they were kept only because of the wrong amount). overview.json rebuilt. **Missed at first:** the ticker band read insiders-today.json directly and still showed SPPL $51.25B the next morning; `cleanTrades()` is now exported from lib/insiderMerge.mjs and the ticker uses it (test in tests/merge.test.mjs). Everything else already went through mergeInsiders.

## Round 42: retro terminal design, new logo (2026-11-06)

- **Process:** the owner asked for a Hyperliquid-like look, then a logo in that style; about 60 logo sketches over six rounds (a 4, abstract liquid shapes, paint splatter, Hyperliquid-style lobes, splash physics, ink and melting shapes). Copying Hyperliquid's own mark was declined (trademark; a look-alike reads as a knock-off). The owner picked "Breakout": a ring with a drop breaking free, drawn with a gap in the ring where the drop got out (that also stops it reading as the male symbol).
- **Look:** black and white with green/red for buys and sales; monospace everywhere; bold capital headings with a `>` prompt; square corners; inverse-video selection (`[overview]`); double-line borders on the key boxes; soft glow in dark mode; a blinking block cursor after the lowercase `form4` wordmark (still with reduced motion). Light mode is a black-on-white printout. Scanlines and a pixel font (VT323) were tried and turned down.
- **Everywhere:** `components/Logo.tsx`, browser-tab icon (`app/icon.svg`, `public/icon.svg`), phone icon (`app/apple-icon.png`), app icons (`public/icon-192.png`, `icon-512.png`, mark at ~62% for round crops), share images (`lib/og.tsx`, `app/opengraph-image.tsx`, stock share image: new mark, palette, square corners), manifest and theme colours.

## Round 43: renamed to Arkanum (2026-11-06)

- The owner wanted a crypto-sounding name. Candidates were checked for free vercel.app addresses and existing companies/tokens. **Arcanum** turned up a registered ARCANUM trademark covering financial and investment services (Arcanum Global, Inc., reg. 5191550), a June 2026 Swedish regulator fraud warning naming "Arcanum Global Trading", an Arcanum token on Arbitrum and the crypto fund Arcanum Capital. The owner chose **Arkanum** knowing it sounds the same, so those can still surface in searches.
- Renamed in 41 files: titles and templates, share images and their alt text, manifest (home-screen name), wordmark (`arkanum` + cursor), About (the name: Latin *arcanum*, a secret; insider trades used to be one), welcome screen, Terms, feeds, notification titles in the workflows, SEC user-agent fallbacks. "Form 4" as the SEC form and code names like `parseForm4` are unchanged; browser storage keys keep their old prefixes.
- The alert check (`lib/alerts.ts`) also accepts the repo name `maximaripov/arkanum`, so the GitHub repo can be renamed without breaking the digest.
- **Owner to do:** add the new address in Vercel (see round 44) (project → Settings → Domains). Then: site constants (`SITE`, `metadataBase`, sitemap, robots, feeds, workflows' SITE_URL) move to it and `vercel.json` redirects form4-insiders.vercel.app (except `/api/*` and `/sw.js`, for subscribed phones).

## Round 44: Arkanum Data (2026-11-06)

- Full name **Arkanum Data** in page titles and their template, link previews and their alt text, feed titles, the app name (`manifest.name`) and the first formal mention on About and Terms. What's shown on the page stays `arkanum` (wordmark, welcome screen, home-screen label `short_name`), at the owner's request, for a cleaner look. "Arkanum Data" also separates it in search from the Arcanum trademark and scam warning.
- **Owner to do:** add `arkanumdata.vercel.app` in Vercel (project → Settings → Domains); free when checked. Then the site moves there with a redirect from form4-insiders.vercel.app.


## Round 45: moved to arkanumdata.vercel.app (2026-11-06)

- The owner added arkanumdata.vercel.app and renamed the Vercel project. The rename detached both old addresses: form4-insiders.vercel.app and foresightscreener.vercel.app answered `DEPLOYMENT_NOT_FOUND` (404) for every path, including `/api/*` and `/sw.js`.
- Moved everything to the new address: `SITE` constants, `metadataBase`, sitemap, robots, feeds, share images, `SITE_URL` in the data, hourly and stakes workflows, the VAPID fallback and the user-agent strings. `vercel.json` now redirects both old hosts to it (except `/api/*` and `/sw.js`); the redirects only act once those domains are re-added to the project.
- Checked live on phone and desktop: pages load without errors; canonicals, share images, sitemap and feed use the new address.
- That day's 4 PM run started 23 seconds before the push, still on the old `SITE_URL`.
- Search Console and Bing Webmaster dropped: the owner won't do them.
- The owner decided not to re-add the old addresses, so `vercel.json` (redirects only) was deleted. Old links, RSS subscriptions and home-screen installs from the old addresses stay dead; re-add the app from the new address.

## Round 46: rolling ticker; deployment retention (2026-11-06)

- **Vercel usage (owner's screenshot, last 30 days):** Functions Storage 8.04 / 10 GB was the only limit near its cap (Active CPU 22 min / 4 h, invocations 17K / 1M, CDN requests 41K / 1M, origin transfer 66 MB / 10 GB). Likely cause: every deploy (about 25 a day, one per data commit) keeps its own copy of the functions. The owner set Deployment Retention to 1 day for all four types. If Functions Storage doesn't fall, cut deploys (e.g. hourly job every 2 h off-peak) or move data out of the deployment.
- **Ticker:** the band under the header now rolls right to left like an exchange tape (`components/Ticker.tsx`): the list is drawn twice and slides by one copy's width (no seam); short lists are repeated first; 3.5 s per trade (~33 px/s); fades at the edges; pauses on hover or keyboard focus; the duplicate copy is hidden from screen readers and tabbing. With reduced motion it stays still and swipeable. "Live · N min ago" stays fixed on the left.
- **Digest check passed:** the manual rerun of the daily job (new address, `form4-alerts` audience, renamed repo) delivered the digest to the owner's re-registered phone.

## Round 47: welcome popup, name meaning removed (2026-11-06)

- Welcome popup: 1px border in the text colour (white in dark mode, black in light) so the black box doesn't melt into the dimmed page; background blurred (`backdrop-filter: blur(6px)`); on phones it floats with a gap on all sides instead of a bottom sheet, with slightly tighter type and spacing so it fits a standard iPhone (on SE-size phones it scrolls inside the box).
- Bug: on small phones the popup opened scrolled to the middle (title hidden) because focusing the button scrolled it into view; now `focus({ preventScroll: true })`.
- Removed the name's meaning ("Latin *arcanum*, a secret") from the welcome text and About, at the owner's request. About keeps the Form 4 explanation and the not-affiliated-with-the-SEC line.

## Round 48: alerts that survive a broken site; link previews (2026-11-06)

- **Alerts fallback:** on 2026-11-06 the failure alert itself went to the dead old address and was lost. `scripts/notify.mjs` now opens a GitHub issue (label `alert`, mentions the owner, so the GitHub app pushes it) whenever the site doesn't accept the notification: site down, moved, or rejecting the job. One issue stays open per alert title; repeats add a comment. Logic in `scripts/lib/issue-alert.mjs` (tests in `tests/issue-alert.test.mjs`); data, hourly and stakes workflows got `issues: write` and pass `GITHUB_TOKEN` to their notify steps. Not yet exercised for real (needs the site to fail); close the issue once fixed.
- **Link previews:** pages that set their own `openGraph` (congress, markets, stakes, digest, research) dropped the site's share image, so shared links showed no picture. They now name `/opengraph-image`. Canonical links added to home, congress, markets, stakes, digest, about and terms.

## Round 49: the digest goes out at 5:00 PM (2026-11-06)

- The owner wanted the digest at exactly 5:00 PM New York time instead of whenever the 4 PM job finished (GitHub starts it 30-60 min late). Waiting inside the job was turned down: a private repo's Actions minutes are capped and the wait would add ~400-700 min a month.
- How it works now: scheduled runs call `daily-digest.mjs --hold`. If it's before 5, `/api/alerts/send` publishes the Digest page at once but stores the notifications in Blob (`alerts/pending.json`). At 5:00 a free cron-job.org timer calls `/api/alerts/release` (Bearer `CRON_SECRET`, set on Vercel), which sends today's held digest once (a conditional write claims it, so two calls can't both send). After 5 the job sends at once. Manual runs send right away.
- Backstop: the hourly job runs `scripts/release-digest.mjs` (GitHub identity); the endpoint does nothing before 5 (no storage read) or once sent, so a missed timer costs at most about an hour.
- `lib/sendTime.mjs` holds the New York 5 PM check (tests in `tests/send-time.test.mjs`); fires from 15 s early in case the timer is early.

## Round 50: digest reworked (2026-11-06)

- **Bugs:** the 5 PM digest said "Next: Jobs report" for a release out at 8:30 that morning (also on the Markets page's Coming up); and trades filed months late (a YPF buy from Jul 26, filed Nov 6) showed as the day's news. `isUpcoming()` and `isLateFiling()` (traded over 7 days before filing) in `lib/digest.mjs`, tested.
- **Content (owner's choices):** nothing about the watchlist (instant alerts still use it); "In 30 seconds" is 2-3 plain sentences about the whole market (`summarize()`); then biggest insider buys filed today (people first, then funds/companies with a board seat, each by size; no "Unusual" label, fact chips only, none that repeat the role), buying together (past week), big-fund filings (one line per fund, only when one files), coming up. Index charts, markets and the watchlist sections are gone; on a phone the page halved (about 2 screens).
- **Notification:** just "Daily Digest", no body (owner's wording); Saturday's says "Weekly Digest".
- **Archive:** each digest is saved to `public/data/digests/<date>.json` (+ `index.json`) and committed with the data; `/briefing/<date>` pages and `/briefing/archive` are built at deploy (static, no runtime cost) and listed in the sitemap. `/briefing` shows the latest stored digest, or the newest archive file if the stored one is missing or old-format.
- **Saturday week in review:** `weekly-digest.yml` builds it Saturday morning from committed data (Monday-Friday filings), holds it until 5 PM, and has its own 6-7 PM backstop release (the hourly job doesn't run Saturdays). The owner added Saturday to the cron-job.org timer.
- Wording that described the old digest fixed: welcome popup, notifications card, footer, About.

## Round 51: stock and insider pages cached (2026-11-06)

- Both were rebuilt on every visit (`cache-control: private, no-store`, ƒ in the build) despite `revalidate`: a dynamic route without `generateStaticParams` isn't cached in Next 16. Each now exports `generateStaticParams() { return []; }`, so a page is built on its first visit and cached (stock 30 min, insider effectively 30 min because its shared-data fetch revalidates at 1800).
- Guard first: an SEC outage used to make an insider page "not found", which caching would have pinned. `insiderTradesByOwner()` now returns null only for SEC 404 (no such filer) and throws otherwise, so a failed rebuild keeps the last good page. Stock pages already fill any missing piece in from the browser.
- Not changed: share images (`opengraph-image`) are still built per request; each deploy (hourly) still starts with an empty cache.

## Round 52: no daily digest when the market is closed (2026-11-06)

- `lib/marketDays.mjs` works out NYSE full-day holidays by rule (observed dates, Good Friday from Easter, no Friday closure when Jan 1 is a Saturday); tests match NYSE's published 2026 and 2027 calendars. `daily-digest.mjs` exits before building, archiving or notifying on weekends and those holidays (`--force` overrides). The Saturday week in review is unaffected.
- Not covered: days the market is open but EDGAR is closed (Veterans Day, Columbus Day), which give a near-empty digest. Owner asked for market days only.

## Round 53: digest catches evening filings; skips days EDGAR is closed (2026-11-07)

- **Gap found:** most Form 4s are filed after the close. On Nov 5, 13 executive/director buys were in hand when the 4 PM job ran and 46 by the end of the day; with "today's filings only" the rest never reached any daily digest. On Nov 6 the digest counted 24 buys; 3 more ($50M) came in that evening.
- **Fix:** a daily digest now covers everything filed since the previous daily digest that it didn't show. Each archive file lists the filings it counted (`seen`, accession numbers); the next digest leaves those out. Wording follows: "filed since yesterday's digest" / "since Friday's digest". Fund filings (no IDs) count from the day after the previous digest. After a gap over 7 days it starts fresh. The Nov 6 file's list was rebuilt from the data at commit c4477cb (exact match: 24 buys, $32,719,864).
- **EDGAR closed** (market open, SEC closed: Veterans Day, Columbus Day): no filings dated today, so no digest and no ping; that evening's filings carry into the next digest.
- `DIGEST_DATE=YYYY-MM-DD` runs the script as another day (testing, reruns). Simulated: Mon Nov 9 leads with 4 Friday-evening buys ($50.1M, none of Friday's 24 repeated); Nov 11 and Nov 26 skip.
- **Alert fallback tested for real** (`alert-test.yml`, manual): with the site address unreachable, `notify.mjs` retried, gave up and opened issue #1 ("Arkanum: alert fallback test", label `alert` created automatically, owner mentioned); closed after. My first push of that workflow had a YAML error (a colon in an unquoted `run:`), which showed as two failed runs; all workflow files now parse.

## Round 54: 404 for unknown tickers, phone ticker taps, cached share images, SEC folder move (2026-11-07)

- **Unknown tickers:** `/stock/NOTAREALTICKERX` used to load a normal page (200), and with caching each one was stored. Now a 404 when SEC's company list doesn't have the ticker and the site has no data for it. If SEC can't be reached the page still loads and fills in from the browser (an outage must not 404 real stocks).
- **Ticker on phones:** a finger on the tape pauses it (`.held`), so a tap lands on the trade under it; it restarts 1.5 s after the finger lifts.
- **Share images** for stock, insider and House member pages are cached like their pages (`generateStaticParams` returning []), instead of rebuilt on every request.
- **Bug: insider search missed 2026 Q2-Q3.** SEC moved new quarterly Form 3/4/5 data sets to `/files/datastandardsinnovation/...` (2026 Q2 on; older stay under `/files/structureddata/...`), so the backfill read a 404 as "not published". `getZip()` in `scripts/lib/form345.mjs` now tries both folders (`ZIP_DIRS`). Backfill rerun after the fix.
- **Correction, same round:** the first version 404'd QQQ and other ETFs, which SEC's company list leaves out but fund holdings and Congress trades link to. `scripts/build-known-tickers.mjs` (npm `prebuild`, so every deploy) writes `public/data/known-tickers.json` (gitignored) from funds.json and congress.json; a stock page 404s only for a ticker in none of SEC's list, the screener, insider data or that file, and if the file can't be read it assumes the ticker is real. A sample of 150 sitemap stock pages all returned 200.
- Backfill rerun with the folder fix: 2026q2 +2,205 new people (3,415 updated), 2026q3 +1,714 (3,321 updated); search now has 23,296 insiders (was 19,377). Phone tap on the ticker checked in Playwright with real touch events: the tape stops (0 px in 1 s) and the tap opens the stock page.

## Round 55: impossible SEC figures blanked (2026-11-07)

- A few companies tag figures at the wrong scale in their XBRL: FedEx's net income came through as $4,092, PG&E's as $2,593, Kilroy's as $302.64, and 69 payout ratios were over 300% (some in the millions). `lib/fundamentals.mjs` (`cleanRow`, tested) blanks net income under 0.01% of $100M+ revenue or with cents, plus the margin, ROE and payout built on it, and any payout over 1,000% (REITs can genuinely pay 200%+). `build-screener.mjs` applies it nightly; the current file was cleaned once (48 rows). Stock pages show "—" for those.
- Not caught: subtler errors (Medtronic's net income looks low).
- A Markets stock table was mocked the same day and turned down by the owner (Markets stays as it was).

## Round 56: health insurers, company names, diagnostics (2026-11-07)

- **Sectors:** SEC code 6324 (hospital and medical service plans: UnitedHealth, Elevance, Cigna, Humana, Centene and 5 more) now maps to Health Care, not Financials (`lib/sectors.mjs`; current screener.json patched, 10 rows). Accident and health insurers (Aflac) stay in Financials.
- **Company names** (`companyName` in `lib/people.mjs`, tested): exact spellings for brands no rule can produce (`SPELLED`: Amazon.com, NVIDIA, UnitedHealth, JPMorgan, IBM, eBay...); "COM" after a name becomes ".com"; LTD/CORP/INC suffixes normalised; in names already in mixed case, stray capital words of 5+ letters are title-cased ("CVS HEALTH Corp" to "CVS Health Corp", "Duke Energy CORP" to "Duke Energy Corp") while shorter ones stay (CBIZ, NIKE, FTAI). About 200 of 4,662 names change.
- **Diagnostics:** `diagnose.yml` (manual, read-only) runs a script from `scripts/diagnose/` on GitHub, where SEC is reachable. `fundamentals.mjs` lists a company's capital-spending labels and its quarterly net income facts.
- Owner withdrew the "mock before committing" rule (it was a misunderstanding). Ping the owner on every finished task.
- **Ticker drag (phones):** hold the tape and slide left or right to move through the trades (touch events move the tape by hand, wrapping within one copy so the loop stays seamless); 1.5 s after the finger lifts it rolls on from that spot (`animation-delay` set to the matching point; only `animation-name` is toggled so the inline speed survives). A drag over 6 px doesn't count as a tap. `touch-action: pan-y` keeps vertical page scrolling. With reduced motion the tape scrolls natively instead.

## Round 57: profits mis-scaled by proxy statements; more free cash flow (2026-11-07)

- **Cause found** (with `diagnose.yml`): since 2022 proxy statements carry a "pay versus performance" table that tags net income in millions (Medtronic "4801" for $4.8B). SEC's yearly frames sometimes take that figure instead of the 10-K's, and the script then built the fourth quarter as that year minus three real quarters, about minus $3.6B, so Medtronic's last-four-quarters profit came out at $0.43B.
- **Fix** (`build-screener.mjs`): a year far smaller than its own three quarters (under 1/1000) is re-read from the company's own 10-K/20-F (companyfacts, same tag, end within 5 days, scale that fits); if that fails the year is dropped. First run: net income 72 company-years re-read (1 dropped), revenue 8 re-read (10 dropped). Medtronic $0.43B to $5.23B (margin 1.1% to 13.9%); FedEx blank to $4.09B; Gaming and Leisure Properties blank to $0.94B.
- **Free cash flow:** capital-spending labels added (other property, plant and equipment; other productive assets; oil and gas property and equipment; net of asset sales) plus operating cash flow from continuing operations. Eli Lilly, Verizon, EOG, Jones Lang LaSalle and Johnson Controls now have it; 2,972 to 3,179 companies overall.
- **Still open:** ConocoPhillips, Phillips 66, Valero, NextEra, Alibaba and PDD have no free cash flow (labels not found yet); Amazon's free cash flow reads -$46.9B, which looks wrong (its 10-K gives about $139.5B operating cash flow and $131.8B capital spending). Stock pages pick up new fundamentals within about an hour (the fetch is cached for 3600 s).
- **Amazon free cash flow (-$46.9B):** not a calculation error but a mislabelled period. Amazon's 10-Q gives a rolling 12-month cash flow (Oct 2025 to Sep 2026: $168.3B operating, $215.2B capital spending), which SEC's frames file as "CY2026"; the script took it as the latest year while the page says "last fiscal year". Cash flow and dividends now come from the same fiscal year as revenue (`fiscalAt`): Amazon 2025 free cash flow $7.7B, margin 1.1%. Companies with an FCF margin: 2,973.
- **Not fixable from SEC data:** ConocoPhillips, Phillips 66, NextEra, Alibaba and PDD report capital spending only under their own (extension) labels, which SEC's companyfacts and frames APIs leave out; Valero only tags segment additions. They show "—", which is correct.
- Diagnostics added: `scripts/diagnose/capex.mjs` (every capex-like label a company uses), `scripts/diagnose/fcf.mjs` (one company's yearly frames as the screener sees them).

## Round 58: footer (2026-11-08)

- Footer redone to read like a real site's: a rule above it; the mark and "Arkanum Data" on the left; a link row ABOUT · DATA SOURCES · PRIVACY · RESEARCH · TERMS (small capitals, no underline, green with a thin rule on hover/focus; a two-column grid on phones); the disclaimer and data credits in small grey text; "(c) year Arkanum Data. Independent; not affiliated with the SEC." "Data sources" and "Privacy" link to new anchors on About (`#data`, `#privacy`). Owner approved the mock.

## Round 59: the research write-up as a paper (2026-11-08)

- `/research/insider-buys` is now a five-page working paper (`app/research/insider-buys/paper.tsx`; pages `/method`, `/results`, `/market`, `/appendix` via `[section]`): journal-style front matter, numbered contents with the current page marked, abstract with keywords, numbered sections, 5 figures, 6 tables (A1-A3 in the appendix cover all 28 groups against each benchmark), references (Seyhun 1986; Lakonishok and Lee 2001; Jeng, Metrick and Zeckhauser 2003; Cohen, Malloy and Pomorski 2012; SEC data sets), page N of 5 with previous/next, a "Cite as" line.
- Every number is read from `docs/backtest/results.json` at build time (`lib/research.ts`), so text and data can't drift.
- Charts (`components/research/Charts.tsx`): plain server-rendered SVG (diverging bars, dot plots against 50%, small-multiple columns), hover titles; a wide layout and a phone layout (labels above bars) switched by CSS. Direction shown by position and a signed label as well as colour: the light-mode green/red fail the colour-blind separation check (deutan dE 3.0), so colour is never the only cue. Axis limits even so gridlines sit on whole percentages.
- Sitemap lists all five pages. Owner approved the mock.

## Round 60: redesign mocked and turned down (2026-11-08)

- The owner asked how to make the site look less generated. A mock removed the round-42 ornaments (heading prompts, tab brackets, glow, cursor, double borders), replaced boxed cards with rules, made badges plain text, showed the lead story on desktop, let names wrap, dropped instruction text and hid stake changes over +1,000%. The owner chose to keep the current site as is; nothing shipped. Don't propose it again unless asked.

## Round 61: data audit fixes (2026-11-08)

A read-only audit of the data files (owner-approved fixes):
- **Stale fundamentals:** FedEx's 2025 fiscal-calendar change left overlapping quarters, so the four-quarter chain stopped at May 2025. A full fiscal year newer than the last linked quarters now wins (`build-screener.mjs`), and a stock page whose figures end over 15 months ago says so (`staleBasis` in StockView). 97 companies had figures over 18 months old.
- **Congress dates:** 6 trades had a date after their own report (the parser took the notification date, or the wrong year; e.g. Sony "Dec 26, 2026"). Such rows are now dated by the report and marked `dateUnclear` (shown as "date unclear", left out of the days-to-disclose median); existing data fixed and summaries rebuilt.
- **Tickers:** `cleanSymbol()` in `lib/form4.mjs` strips exchange prefixes and placeholders ("NYSE:FLG" to FLG; "NYSE:", "[NONE]", "N/A" to none); `cleanTrades()` applies it to saved trades.
- **Sectors:** car rental/leasing (7510-7519) and repair services (7600-7699) and legal services (8111) to Industrials; auto repair/parking (7500-7549) and child care (8351) to Consumer Discretionary. 19 companies had none.
- **Impossible margins:** net income over 10x revenue at a $100M+ company is mis-scaled (Medline showed $1.16 trillion), and a margin over 150% there means partial revenue (Fifth Third's revenue was fees only): both blanked by `cleanRow`. 23 rows cleaned.
- Research scripts on the session branch only: `scripts/diagnose/sales-study.mjs`, `oos-2026.mjs`, `quarters.mjs`.
- **Paper, section 4.5 (out of sample):** the unchanged buy test rerun on 6,172 purchases filed January to September 2026 (`scripts/diagnose/oos-2026.mjs`, results in `docs/backtest/oos-2026.json`, read by `lib/research.ts`). New Figure 5 and Table 4 (2023-2025 vs 2026); the market chart is now Figure 6; abstract, limits and conclusion mention it. Findings held (score no help; CEO and $1M+ worse; directors better); 3+ insiders buying reversed (+5.0%, 57%) on one quarter of data, flagged as not yet reliable. Signed figures use the rounded value's sign (no "+0.0%").

## Round 62: working paper no. 2, insider sales (2026-11-08)

- `/research/insider-sales`, four pages (abstract and introduction, method, results, discussion with appendix tables A1 to A3). Numbers read at build time from `docs/backtest/sales.json` (the sales study run through diagnose.yml) via `saleStat`/`saleGroups`/`saleName` in `lib/research.ts`.
- Finding: Arkanum's notable-sale rule, and every trait behind it, was followed by the same returns as other sales (6-month median about 0% against same-month sales, 50% worse). Only cheap stocks (under $5) fell, as after purchases. The paper says the label describes and does not predict; no site changes were made from it.
- `/research` index lists both papers; the footer's Research link points there; the two papers link to each other; sitemap updated. `Paper` takes `no`; `DotPlot` takes `verb` and `invert`.

## Round 63: monthly refresh of paper no. 1's 2026 test (2026-11-08)

- `.github/workflows/research-refresh.yml` (5th of each month, and by hand): reruns `backtest.mjs` on purchases filed since January 2026 through the latest published SEC quarter and replaces `docs/backtest/oos-2026.json`.
- Section 4.5's sentences are hand-written, so a refresh is committed only while they still hold: `lib/oosClaims.mjs` lists the five claims (score 60+ no better than under 40; CEO-level, $1M+ and pre-planned worse; directors better), `scripts/research-check.mjs` checks them plus a shrinking-sample guard. On failure nothing is committed and the owner gets a phone alert (`notify.mjs`, issue fallback); the paper keeps the last good figures.
- Wording that would go stale is now derived from the data: date span, months covered, purchases with six months of returns, "last updated", the Table 4 column year, and the three-or-more-insiders paragraph (written for each outcome).
- `backtest.mjs` now records the last quarter it actually read as `to`, not the one requested.

## Round 64: first-visit review fixes, returns after trades, Congress filters and follows (2026-11-08)

- Welcome popup names Congress (House only, "not the Senate yet"); wording tightened so it fits an iPhone 13 screen.
- Ticker: on Saturdays and Sundays (New York time) the label reads "This week" instead of "Live · N h ago".
- Congress lists rank by estimated dollars: each trade counts as its reported range's midpoint (`estAmount` in lib/congress.mjs; the open top range counts as its floor), labelled "~$" and "estimated $". Members, most bought and most sold.
- Phones: member names on their own line (no more "Josh Got..."); most-active list puts counts on the left so names don't wrap letter by letter. Desktop trades table scrolls inside its card rather than being cut.
- "Watchlist" without "Your"; company announcements drop SEC item 8.01 ("Other announcement") and merge a repeat of the same kind within a week; SEC's dropped apostrophes restored (O'Reilly, Lowe's, Macy's...); stake jumps past +200% read "Stake 160× bigger".
- Returns after trades (lib/returns.mjs, components/Returns.tsx): stock and S&P 500 change since the trade date and since it became public (first close after filing), adjusted closes to the latest close, from Yahoo; only the returns are published. Congress: computed by the daily job for every trade (member files, overview summaries); member pages show a summary (median, share that beat the S&P) and two columns. Insider pages: computed when the page is built (prices cached 12 h).
- Congress trades: filters (size, party, date traded, state) and sorting (newest disclosed, newest trade, largest); the full list (`public/data/congress-trades.json`, ~140 KB compressed) loads on first use.
- Follow a House member: stored as "house:<slug>" with the followed insiders; `sanitizeFollowing` accepts it. `build-congress.mjs` writes the trades from reports read for the first time to $CONGRESS_NEW_OUT; `congress-alerts.mjs` (new step in congress.yml, which now has id-token and issues permissions) alerts devices following those members.

## Round 65: the monthly research refresh covers both papers (2026-11-08)

- Paper no. 2 gets section 4.5, the sales test rerun on sales filed since January 2026 (`docs/backtest/sales-2026.json`, from `sales-study.mjs`, which now records the last quarter it read and can write its results to a file). Its sentences about 2026 are written for each outcome (`NotableOos`, `OosAbstract`, `oosWarns` in the paper), and the abstract, discussion, conclusion and /research index follow the same check.
- First result: notable sales filed in 2026 so far were followed by worse returns by the median (−3.3% against the month's typical sale, 56% did worse; 2023–2025: 0.0%, 50%) but not by the mean (+0.1%), on 1,167 sales with six months of returns. The paper says so and calls it unsettled. No site change.
- `lib/researchClaims.mjs` (was oosClaims.mjs) holds one entry per paper; `research-refresh.yml` runs one job per paper (buys ~18 min, sales ~10 min) and `research-check.mjs <paper>` gates each. Paper no. 2's entry has no fixed claims, since its 2026 wording is conditional; the shrinking-sample guard still applies.
- Paper charts' hover counts say "sales" in paper no. 2 (they said "purchases").

## Round 66: Functions Storage over the limit (2026-11-08)

- Vercel showed Functions Storage at 11.92 GB of 10 GB. Every server function bundled sharp (Next's image library: libvips for glibc and musl plus a wasm build, ~48 MB of a ~54 MB function), though the site never uses next/image, and Vercel keeps every function of every retained deployment (24–29 deploys a day). `outputFileTracingExcludes` in next.config.mjs leaves it out: the largest function is now 5.4 MB. Pages, share images and icons checked after the change.

## Round 67: no preview builds for the working branch (2026-11-08)

- `vercel.json` turns off Vercel deployments for `claude/**` branches (and the current one by name). Every push there built a preview nobody opened (21 on 2026-11-08), on top of 24–55 production deploys a day from data saves, against the Hobby plan's daily deployment cap. Production (main) deploys as before.
- The repo is now public (owner, 2026-11-08), so GitHub Actions minutes are unlimited; checked beforehand that no secrets are in its history and that the site's job login only accepts this repo's main branch.

## Round 68: AI training crawlers blocked in robots.txt (2026-11-08)

- `app/robots.ts` disallows the whole site for crawlers that collect pages to train AI models (GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended, Bytespider, Meta, Amazonbot, Cohere, Diffbot and others): each visit to a stock page can rebuild it on the server and spend the Hobby plan's 4 h of Active CPU. Google, Bing and AI search engines that link back (OAI-SearchBot, PerplexityBot) are still allowed. robots.txt is a request: Bytespider in particular is known to ignore it.

## Round 69: alert sign-up can't be spammed (2026-11-08)

- `/api/alerts/register` takes no login, and each call wrote the device file to Vercel Blob (an advanced operation, 2,000 a month on Hobby). A script could have spent the month's writes (breaking sign-ups and the held 5 PM digest) or filled the 5,000-device cap. Now: a subscription must point at a browser push service (Google, Apple, Mozilla, Microsoft; `PUSH_HOST` in lib/alerts.ts) or the request is refused; a request without one, for a device that isn't on, returns after a plain read with no write; `updateDevices` skips the write when nothing changed; `seen` moves at most once a day.
- Repo growth (#2 of the usage review) measured instead of guessed: 6.5 MB on GitHub after 7 days (git compresses the daily JSON rewrites), so about 0.35 GB a year. Moving data out of git was not done; the daily check watches the size.

## Round 70: one research platform (2026-11-09)

Owner's brief: research at the centre of the brand, sections that read as one platform, a homepage that explains Arkanum in five seconds, context on every trade, accessible research, cluster detection, universal search, links to the filings, and labels that match the research.
- **Homepage** (`components/HomeIntro.tsx`): "Insider and Congress trades, with the evidence." with a one-paragraph explanation, the universal search, section links, and three findings with their numbers (`lib/findings.ts`, computed from the research results, so they follow the monthly refresh). The "Most unusual buy this week" hero card was removed: it featured exactly what the research says not to trust.
- **Labels follow the research:** "Score" is "How unusual" with "not a forecast" wherever it shows; "Notable sale" is "Large unplanned sale" (the paper notes the rename); the RSS feed says the same.
- **"Trades like this"** under every insider buy and sale (`components/Evidence.tsx`, `lib/evidence.ts`): the research group the trade belongs to (stocks under $5, pre-planned, 3+ insiders, $1M+, CEO-level, directors; for sales large unplanned, whole stake, pre-planned, CEO-level) with its six-month median against other trades, the share that did better/worse, the count, 2026 so far, and a link to the paper. Built from `lib/evidence.json` (3 KB), which `scripts/build-evidence.mjs` regenerates before every build.
- **Clusters** already existed (Buying together, group buys, "3 insiders selling"); they now carry their evidence through the line above rather than a new feature that would sell them as a signal.
- **Universal search** (`app/api/search`): stocks, insiders, House members and the tracked funds (funds open on the Insiders page's funds view via `?view=funds&fund=<cik>`).
- **Filings:** Congress trades now link to the member's report on phones and on stock pages too ("Filing ↗"); insider trades already linked to SEC.
- **Research page:** key findings in plain words first, then "How we test", then the papers.
- **Every section opens the same way** (`components/SectionIntro.tsx`): what it shows, source and freshness, and what the research says (or that it hasn't been tested): Congress (with the live count of top traders the S&P beat), Holdings (was "Stakes"), Markets, Digest.

## Round 71: second feedback round, A–I (2026-11-09)

- **A, since filing on the live lists:** `build-overview.mjs` (hourly) adds each listed trade's stock and S&P 500 change from the first close after filing, with the trading days covered (`since` in overview.json); the homepage's most-unusual buys, large unplanned sales and latest filings show it, with "a few days says little" on hover. Congress trade tables show "since public" in the Traded cell; congress-trades.json keeps returns for the filtered view.
- **B, report card** (`/research/report-card`): every label, 2023–2025 against filings since January 2026, with a verdict (Holds / Changed / Too early under 300 six-month returns; one-point dead band). First reading: several sale labels and directors' and cluster buys have changed in 2026, unsettled.
- **C, homepage:** one band: headline, full-width search, three "Start here" steps (look up, follow, report card), a compact research strip.
- **D, Congress windows:** 30 days / 90 days / 1 year / 2 years for most bought, most sold and most active members (`windows` and per-member `w` in congress-overview.json); default 1 year; member returns stay 2-year.
- **E, calmer table:** "How unusual" shows the number only (score bars removed), "why" as plain text with every reason on hover, narrower name columns.
- **F, Digest page** rendered on the server with the latest digest and archive (`app/briefing/page.tsx` → `DigestClient.tsx`); no "Loading…".
- **G, open data** (`/open-data`): every JSON file the site reads, what it holds, how often it updates. About adds methodology, data freshness and contact (GitHub issues); footer links Methodology, Open data, Contact.
- **H, papers as PDFs:** `/research/<paper>/print` renders the whole paper with "Save as PDF"; print styles drop the site chrome; "Download PDF" on every paper page.
- **I, buy/sell colours and contrast:** filled BUY/SELL badges; light-theme green, red and amber darkened (#066b2e, #a61c23, #85560f). axe colour-contrast audit: 0 failures on 11 pages in both themes (was 102 in light).
- Not done, by design: "See today's most unusual buys" as the main call to action (contradicts the research), email/SMS digests (breaks the no-account privacy promise), Senate coverage (the Senate's site blocks automated access).

## Round 72: AI-crawler block off, temporarily (2026-11-09)

- At the owner's request, `app/robots.ts` no longer turns away AI training crawlers (`BLOCK_AI_TRAINING = false`); every crawler may read every page except /api/. Set it back to true to restore the block from round 68.

- Re-enabled the same day at the owner's request (`BLOCK_AI_TRAINING = true`).

## Round 73: research rigor and an evidence-led homepage (2026-11-09)

- **90% ranges:** six-month medians carry `lo`, `hi`, `months` from a month-block bootstrap (`lib/bootstrap.mjs`, 400 resamples of whole filing months, seeded). Trades filed in the same month move together, so trade counts overstate certainty.
- **2026 verdicts** (`judge()` in `lib/research.ts`, `MIN_MONTHS = 12` in `lib/researchClaims.mjs`): "Too early" until 2026 has 12 filing months with six-month returns (about early 2028); then "Changed" only when the 2026 and 2023–25 ranges don't overlap, else "Holds". Used by the report card, paper no. 2 (`oosState()`: early / warns / same, replacing `oosWarns`), paper no. 1 (`early()`), findings and the "Trades like this" line.
- **Homepage:** tagline "Other sites sell you insider signals. We test them."; the strip is "What actually mattered" (stocks under $5, $1M+ and CEO buys, pre-planned buys, vs the S&P 500) with a note that "vs other insider buys" is not the market. The 2026 sales claim is gone. Link previews (layout metadata, OG image, manifest) rewritten.
- **Homepage lists server-rendered:** `app/page.tsx` fetches overview.json (revalidate 900) and passes it to `InsidersView`; the browser still refetches for freshness.
- **Wording:** one-line "How unusual" explainer on the homepage table; "Congress trades (House)".

## Round 74: homepage, digest, contact, copyright (2026-11-09)

- Homepage intro: the big search box is gone (the header search stays); step 1 points to the search at the top of any page.
- Digest page: past digests removed from it; they live on /briefing/archive, linked from a small "Past digests" line on the digest page and from the footer.
- No mention of GitHub anywhere on the site (About contact, Open data). Contact is the owner's email; research tables are "available on request".
- Copyright: footer reads "All rights reserved"; Terms has a Copyright section (quotes and Open data files with credit; filings themselves not claimed).

## Round 75: runtime cache writes, security headers, Vercel token (2026-11-09)

- **Vercel token works.** Re-saved through the session's credential form (header Authorization, prefix Bearer). Project `prj_Y2wu1SJDKK4fcbwNXcI2wvPhh1LK`, team `team_mx8WiIrxvt7w6bBT2jvL8t6q`. Usage: `GET /v2/usage?teamId=…&type=data_cache|requests&from=2026-11-01T00:00:00.000Z&to=…` (ISO with milliseconds; add `granularity=hour` for hourly).
- **Runtime cache writes at 75% of the free allowance.** Usage showed writes ("received bytes") rising from ~47 MB/day (Nov 2) to ~320 MB/day (Nov 8), tracking deployments and stock-page views rather than visitors. Causes: our own multi-MB data files (`congress.json` 4.4 MB, `insiders.json`, `screener.json`, `funds.json`) copied into the fetch cache by route handlers and rewritten every hour, and SEC Form 4 files rewritten daily though a filing never changes.
- Fixes: `/api/congress`, `/api/watch`, `/feeds/congress.xml`, `/feeds/insider-buys.xml` read the data files with `cache: "no-store"` (the CDN caches their responses via s-maxage; feeds are now per-request with `dynamic = "force-dynamic"`). Form 4 `index.json` and XML are cached with `revalidate: false`. SEC company submissions: 900 s -> 1800 s, matching the stock page.
- **Security headers** on every response (`next.config.mjs`): X-Frame-Options DENY and CSP `frame-ancestors 'none'`, nosniff, strict-origin-when-cross-origin referrer, Permissions-Policy off for camera, mic, location and payment. No full CSP, on purpose (TradingView embeds).
- Security review, no change needed: alerts auth (timing-safe secrets, GitHub OIDC pinned to owner ID and main), push endpoints allow-listed to real push services, device cap, workflows use env vars for inputs and read-only `pull_request`, `npm audit` clean.

## Round 76: insider job every two hours; batched pushes (2026-11-09)

- `insiders-hourly.yml` runs every two hours (UTC 11:17-23:17 odd hours Mon-Fri, 01:17 and 03:17 Tue-Sat), halving data deploys. Site wording updated (homepage "updated every 2 hours", About). The 5 PM digest release backstop now runs at 23:17 UTC at the latest; cron-job.org stays the main trigger.
- Owner rule: push once per task, not after each change, since every push to main is a deploy.
- Vercel API on Hobby: Active CPU and Functions Storage are not available (usage endpoint `v1/usage` is Pro-only). Function GB-hours since Nov 2: 3.74 (about 0.47/day), 22,427 invocations, 32 errors or timeouts.

## Round 77: Vercel Firewall rules (2026-11-09)

- Set through the Vercel API (no code change). Rule 1 denies AI training crawlers by User-Agent, enforcing robots.txt; verified GPTBot gets 403, OAI-SearchBot and browsers 200. Rule 2 rate-limits `/stock/*`, `/insider/*` and `/api/*` (not `/api/alerts/*`) to 40 requests per minute per IP with a 429; verified over one connection. `/data/*` is left out because the site's server functions fetch it.
- Not turned on: Vercel's Bot Protection managed rules (they could challenge the site's own server fetches of `/data/*` and the scheduled jobs; needs a bypass rule first, owner's call).

## Round 78: Bot Protection; monitoring prompts; usage review (2026-11-09)

- Vercel Bot Protection (managed rule) set to challenge, with a bypass rule for `/data/*`, `/api/alerts/*`, `/feeds/*`, sitemap, robots, manifest, icons and `opengraph-image`. Verified: those return 200 to curl; other pages return 429 "Vercel Security Checkpoint" to non-browser and cloud clients. Real phones and desktops not verifiable from the sandbox (cloud IP, headless): owner to check.
- The daily routines would now hit the checkpoint on HTML pages. New prompts in `docs/monitoring.md` (data-file checks, Vercel API checks for cache writes, functions, deploys and firewall); they must be applied from the "Arkanum Usage" chat.
- Usage, Nov 2-9: 1,144 MB of runtime cache writes (75% warning suggests an allowance near 1.5 GB per cycle; inferred, not confirmed). Builds peaked at 84 on Nov 4 (Hobby cap 100 a day). 62k edge requests, 0.73 GB bandwidth, 22.5k function calls, 3.8 GB-hours: all far below limits. Repo 13.5 MB (6.5 MB on Nov 8).

## Round 79: fewer runtime cache writes, part 2 (2026-11-09)

- **Price cache keys were unique every second.** `dailyCloses` (`lib/returns.mjs`) put the current second in the Yahoo URL, so every insider-page build wrote new, never-reused price entries for SPY and each stock. The window now starts on the 1st of the trade's month (less 10 days) and ends at the next UTC midnight: one entry per stock and month, reused all day. Test in `tests/returns.test.mjs`.
- **Own data files read from disk** (`lib/siteData.ts`): homepage, Congress page, stock page and its OG image, insider page and sitemap no longer fetch `/data/*.json` over HTTP through the fetch cache. Each deployment ships its files, so nothing is written. Bundled per function: overview, screener, insiders, insiders-today, congress-overview, famous (~1.8 MB; largest function 7.3 MB). Still fetched: Congress member files and digests (small), SEC and Yahoo.

## Round 80: Tiingo price fallback; Dependabot previews off (2026-11-09)

- `dailyCloses` (`lib/returns.mjs`) falls back to Tiingo's official API when Yahoo fails (an error status, repeated 429s, a network error or a changed format), not when Yahoo says the symbol doesn't exist. It needs `TIINGO_API_KEY`; with no key it behaves as before. Same rounded window as Yahoo, so cache keys stay stable. Tests in `tests/returns.test.mjs`.
- Key wiring: `data.yml`, `congress.yml` and `insiders-hourly.yml` pass `secrets.TIINGO_API_KEY` (empty is fine). Still to do by the owner: a Tiingo account and token; the token as a Vercel environment variable `TIINGO_API_KEY` (Production) and a GitHub Actions secret of the same name.
- `vercel.json`: no preview deploys for `dependabot/**` branches. Dependabot security updates themselves are a repo setting for the owner (Settings → Code security).
- Key-free alternatives tried and rejected: Stooq answers servers with a browser check; Nasdaq's endpoint returned no data and would need a disguised browser user agent.

## Round 81: stock splits no longer fail the ticker check (2026-11-09)

- **Bug:** Yahoo's "close" is adjusted for every later split (NVIDIA $795.18 on 2024-04-22 shows as $79.52). The ticker check (price in the filing vs that day's close, within a third) therefore failed every trade made before a later split or reverse split. On the site those trades showed no returns; in the studies they were dropped as "price doesn't match" (3,118 buys in paper no. 1).
- **Fix:** `unsplit()` in `lib/returns.mjs` undoes it using the splits Yahoo returns (`events.splits`), applied from the day after the ex-date. Used by the site (`dailyCloses`), `scripts/backtest.mjs` and `scripts/diagnose/sales-study.mjs`. Adjusted closes (returns) unchanged. Tests cover a forward and a reverse split.
- **Reruns without publishing:** `backtest.yml` has a `publish` input (off: results printed to the run log between RESULT_JSON_START/END, nothing committed). Sales study through `diagnose.yml` as before.
- **Fallback test:** `scripts/diagnose/price-fallback.mjs` (via `diagnose.yml`, which now has `id-token: write` and `TIINGO_API_KEY`) makes Yahoo fail and checks Tiingo on GitHub, then on Vercel through `/api/alerts/price-check` (GitHub-OIDC only, returns counts, never the key).

## Round 82: corrected research, papers no. 3 and 4, firewall, Search Console (2026-11-09)

- **Split fix published.** Spot-check: 36 rescued trades sampled in the logs; 12 checked against Tiingo's actual closes, all within 0.4% (including 1-for-15,000 and 1-for-400 reverse splits). `backtest.yml` (publish on) and the sales study rerun; buys 24,922 kept (1,147 dropped for a price mismatch, was 3,118), sales 89,416 (2,167, was 7,450). Headline changes: stocks under $5 −2.6% → −6.4%; vs S&P 500 −5.4% → −6.7%; pre-planned −6.9% → −5.1%; $1M+ unchanged. Wording updated (summary: under-$5, pre-planned and $1M+ did worst; "Pre-planned buys did badly"; sales: "did worse"/"better" without "slightly"); titles 25,000 buys / 89,000 sales. `research-refresh.yml` rerun: both 2026 files published (claims still hold). No correction note (owner).
- **Paper no. 3** (`/research/filing-delay`): head start before a purchase is public +0.7% vs the S&P 500 (59% up), +2.4% for $1M+ buys; follower ends ~0.9 points behind the insider over six months, but insiders' own purchases trailed the S&P 500 by 5.6%. Sales: −0.4%, nothing to miss.
- **Paper no. 4** (`/research/house-trades`): 8,897 House trades (Nov 2024 on). Six months from disclosure vs equal-weighted S&P 500: buys −2.4%, sales −1.7%; members' own buys −1.5%. No group clearly above zero.
- **Search:** schema.org WebSite + Organization JSON-LD in `app/layout.tsx`; Google Search Console verified (URL-prefix property, HTML tag in `metadata.verification`). Live test: page available to Google (Bot Protection lets Googlebot through). Sitemap submitted by the owner.
- `diagnose.yml` runs `npm ci` (the 13F study needs fast-xml-parser).

## Round 83: working paper no. 5, copying 13F funds (2026-11-09)

- `/research/fund-copying`: the 13 funds Arkanum tracks, 194 13F-HR reports for quarters from 2022-12-31, 69,789 position changes (69,126 priced), via `scripts/diagnose/funds-study.mjs` on `diagnose.yml` (35 min). Six months after the report, vs the equal-weighted S&P 500 (RSP): new or added −2.3%, sold entirely −2.9% (ranges overlap); new positions of 1%+ of the fund +2.8% (range −2.2% to +7.9%). Copying each fund's top ten until the next report: median quarter +1.1% vs RSP, +0.1% vs the S&P 500 (the fairer comparison for large-company lists); both ranges include zero. Wide gaps between funds (Duquesne +104% vs RSP compounded, Icahn −38%).
- Numbers in `docs/backtest/funds.json`. Every directional sentence in the paper is computed from it.

## Round 84: papers 3-5 refresh themselves (2026-11-09)

- `research-refresh.yml` matrix: added `house` (paper no. 4, `scripts/diagnose/congress-study.mjs /tmp/new.json`) and `funds` (paper no. 5, `scripts/diagnose/funds-study.mjs /tmp/new.json`, which now writes its output file). The job runs `npm ci` and gets `TIINGO_API_KEY`.
- `lib/researchClaims.mjs`: `PAPERS.house` (7 claims: purchases no better than sales, for followers and for members; no clear edge vs the equal-weighted or ordinary S&P 500; no pre-disclosure run-up; both look worse vs the ordinary index) and `PAPERS.funds` (5 claims: bought no better than sold; no clear edge for new/added or 1%+ positions; top-ten copies not clearly above either index; wide spread between funds). `failedClaims` uses a paper's own `check` when it has one; `research-check.mjs` takes per-paper size, span, start and shrink tolerance (House: 80%, since the Congress file is a rolling two years). Tests: published data passes, contradicting numbers fail.
- Paper no. 3: section 4.5, "Filed since January 2026" (head start for purchases and the move before sales), from `oos-2026.json` and `sales-2026.json`, verdict by `judge()` ("too early" until 12 filing months). Now: purchases +1.1% vs +0.7%, sales −0.4% vs −0.4%, 9 months.
- Papers no. 4 and 5: year ranges read from the data (`tradedFrom`, `pricesThrough`); the Renaissance sentence no longer claims it behaves like the market.

## Round 85: runtime cache writes, part 3 (2026-11-10)

- Measured first: since round 79 writes fell from ~20-70 MB/hour to ~5-16 MB/hour while deploys stayed at 4-9/hour, so deploys now cost ~1-2 MB each; batching data commits would save little and wasn't done. The remaining writes come from first visits (and crawls: the sitemap was just submitted to Google) to stock and insider pages, each of which stored SEC's raw filing list (often hundreds of KB), 25 Form 4 files and years of daily prices.
- `lib/secCached.ts`: `insidersForTickerCached`, `insiderTradesByOwnerCached`, `announcementsCached` wrap the lookups in `unstable_cache`. Inside it Next treats fetches as no-store (checked in `next/dist/server/lib/patch-fetch.js`), so only the parsed result (a few KB) is stored, and pages stay ISR (●). Used by the stock page, insider page and its OG image, `/api/insiders?symbol=`, `/api/news`. The insider page also caches trades plus returns together (`withPrices`, 6 hours), so price series aren't stored.
- House member pages, their OG image and the digest page read their files from disk (`lib/congressFiles.ts`, `lib/digestFiles.ts`, kept apart from `lib/siteData.ts` because a parameterized path bundles the whole folder). `next.config.mjs` excludes `congress.json` and `congress-trades.json` (read over HTTP only) from function bundles; largest function 10.0 MB.

## Round 86: docs housekeeping (2026-11-10)

- README: renamed from Form4 to Arkanum Data; intro leads with the research; page table adds Home, insider page, Congress, Research and Open data, renames Stakes to Holdings; the insider job is every two hours, plus the Congress and monthly research jobs.
- Handoff: homepage figures updated to the post-split-fix values (under $5 −6.4%, $1M+ −4.8%, CEO-level −1.6%, pre-planned −5.1%, vs S&P 500 −6.7%), with a note that `lib/findings.ts` computes them; sample sizes 24,922 buys and 89,416 sales; five papers; the launch drafts in `docs/backtest/` flagged as stale (old name, old URL, old numbers).
- README licensing: Yahoo Finance is no longer listed as "not used". It is listed as the source of daily closes for calculated returns only (Tiingo as fallback), with no quotes shown. This is a description, not a licensing clearance.

## Round 87: ticker on federal holidays (2026-11-11)

- On Veterans Day the tape read "Live · 14 h ago": SEC's EDGAR takes no filings on federal holidays, so the insider job found 0 new filings all day and left `updated` at the previous night's run. The data was fine; the label wasn't.
- `secHolidays()` / `secClosed()` in `lib/marketDays.mjs` (federal holidays by rule: open Good Friday, closed Columbus Day and Veterans Day; test against OPM's 2026 list). On those days `components/Ticker.tsx` shows "SEC closed today" instead of "Live · …", as weekends show "This week".

## Round 88: roadmap from the owner's notes; phase 1 (2026-11-12)

- **Roadmap:** `docs/roadmap.md` turns the owner's master notes (sections 1-11) into seven phases, with the items that conflict with the research listed as decisions (ranking by past performance, the backtester's chance-finding and price-licence exposure, "Invest with evidence", "exciting news", committee wording, Excel export).
- **Congress "duplicates" investigated** (none deleted by hand). Salazar NVDA and PG (report 20035778): one buy in her UBS IRA and one in her UBS brokerage account per stock; they looked identical because the parser ignored the "Subholding Of" line. McGuire MU (20035484): three buys on three dates. Separately, 15 groups of ticker trades appeared in two reports: amendments ("Filing Status: Amended", e.g. Timmons SPCX) and later reports re-listing trades (Kean, Taylor, Rouzer, Bresnahan, Evans).
- `scripts/lib/congress.mjs`: `parsePtr` reads the account and filing status, and drops a filer's own transaction ID before the asset name; `dedupeReports` keeps one copy per trade across reports (earliest public filing; later copies named in `refiled`; an amendment that changes the amount updates it, `amendedIn`), keeps every line within one report, keeps a later report's surplus identical lines, and never merges rows without a ticker (T-bills, structured notes). Tests in `tests/congress.test.mjs`. Member files carry the account (`ac`) and an amended flag (`am`); Congress tables show them next to spouse/joint. Needs one `congress.yml` run with rebuild on to re-read every report.
- **Ticker:** "Live" while the data is under 4 hours old, else "Updated 5 h ago" (no live dot); weekends and SEC holidays as before.
- **Names:** "How unusual" is now "Insider Activity Score" everywhere on the site (tiers keep their names: Unusual, Somewhat unusual, Routine). Holdings is "Institutional Holdings" (desktop nav, page title, heading; "Holdings" on the phone tab bar and on desktops under 1100px, where the full name doesn't fit).
- **Navigation:** Research is a main section (desktop and phone); desktop links mark the current page for screen readers.
- **404 page** (`app/not-found.tsx`), served with a real 404 status. Digest archive title gets the site name. Every page checked for a title and description on a production build.
- **Security:** audit in `docs/security-audit.md`. No secrets in the browser bundle, the served files or git history; nothing to rotate. Fixed: `/api/alerts/register` and `/api/alerts/test` added to the 40-a-minute firewall rate limit (Hobby refuses new rate-limit rules, so the existing rule was extended; verified live); `/api/insiders`, `/api/news`, `/api/company` reject non-tickers; two routes no longer return internal error text. Packages: next 16.4.6, fast-xml-parser 5.12.0 (low advisory), @vercel/blob 2.9.0, jose 6.2.17; `npm audit` clean.
- **Function usage:** 0.21 GB-hours on Nov 11 and 0.14 on Nov 12 (to 17:00 UTC), under the owner's 0.33 a day target since round 85; to be watched for two weeks.

## Round 89: phase 2, research up front (2026-11-12)

- **Owner's decisions** recorded in `docs/roadmap.md`: rankings with ranges and a minimum sample; backtester as planned; tagline "Follow the money. Test the signal."; news = the company's own press releases and 8-K events from SEC (no third-party feed); CSV exports only.
- **Three kinds of trade** (`components/TradeKinds.tsx`, `components/KindsLine.tsx`): reported, unusual, tested signal. Full explainer on /research (`#kinds`), compact on the homepage, one line above every trade list (homepage dashboard, stock, insider, Congress, member and stock-Congress lists; House lists have their own wording). The "signal" text is computed: the best of all 28 buy groups against the S&P 500 (currently "Routine, price $5+", −4.6%); every one trailed, so the text says the clearest results are warnings. If a group ever beats the market with a range above zero, the text switches by itself.
- **Homepage:** compact hero (kicker, "Follow the money. Test the signal.", one-sentence value proposition, three use cases, Today's trades / Read the research), then a band with the three kinds and the research findings plus links to all papers, then "> Live dashboard". Dashboard heading at 758 px on a 1280x900 desktop, 1,180 px on an iPhone 13. Unused intro styles removed.
- **Methodology page** (`/research/methodology`, footer "Methodology"): sources, which trades, the price check and split fix, returns and benchmarks, bootstrap ranges, the verdict rule, the three kinds, what isn't tested (survivorship, costs, risk, Senate). No corrections list (owner, 2026-11-12, as in round 81). Counts read from the research files.
- **First-visit tour** (`components/Welcome.tsx`): three steps (what you'll see, what we found with the S&P 500 figure from `lib/findings.ts`, where to start), Back/Next/Skip, Escape closes.
- **Accessibility:** skip link, focus ring on everything focusable, Insiders tabs follow the ARIA pattern (arrow keys, Home/End, one tab stop, tab panel), ticker is a labelled landmark, blank table headers named, every paper page has an h1. axe (WCAG 2 A/AA + best practice): 0 violations on 14 pages in dark and light.
- **Search and AI answers:** ScholarlyArticle data on each paper, FAQPage on /research (the findings as questions, answers computed), Dataset with every file on /open-data (`components/JsonLd.tsx`).

## Round 90: phase 3, connected stock pages and per-trade analysis (2026-11-12)

- **Stock page in three bands** (`app/stock/[symbol]/StockView.tsx`): the price chart with insider trades and company announcements lined up under it, then "1 The company" (fundamentals with plain health chips, "Things to know", announcements with executive changes in bold), "2 What insiders did" (month-by-month chart, bought/sold bars, trades with Analysis, Congress, company stakes, funds), "3 What the research says" (`components/ResearchFor.tsx`: the research groups this company's trades fall into, each with median, 90% range drawn on a zero line, count and 2026 figure).
- **Analysis under every insider buy and sale** (`components/TradeAnalysis.tsx`, collapsed): conviction (score meter and reasons, or the sale flags), other insiders trading the same way within 30 days, company finances, 8-K announcements within 30 days before or after, trades like this with the 90% range drawn, and notes (price under $5, pre-planned, filed late, token purchase). Facts in `lib/context.mjs`, tested in `tests/context.test.mjs`. On stock pages it has the company's filings, announcements and fundamentals; elsewhere it shows what the trade itself carries.
- **Company risk notes** (`companyRisks`): serious 8-K items in the last year (bankruptcy, debt accelerated, delisting notice, restatement, auditor change, cybersecurity incident, layoffs), two or more executive or board changes in six months, losing money while burning cash, debt/equity above 2. Facts only; finances are labelled as untested in the research.
- **Events on the timeline** (`components/InsiderStrip.tsx`): 8-K announcements as grey squares on the strip under the chart, tap for the headline. No price chart of our own: it would show Yahoo prices, which the site doesn't display (licensing).
- **Press releases** (`lib/pressRelease.mjs`, `pressHeadline` in `lib/news.ts`): the headline of the press release filed as exhibit 99 to each of the latest four 8-Ks, shown in place of the item labels. Each headline is cached once for good (`unstable_cache`, revalidate false); network errors are not cached. The exhibit is found from the filing's index page (its type column says EX-99.1; file names like `nvidiaannouncesceotransiti.htm` can't be trusted), and only the first 64 KB is downloaded (SEC ignores byte ranges, so the read is cut off). Checked on 100 real 8-Ks from 20 companies with `scripts/diagnose/press-releases.mjs` via `diagnose.yml`: 62 had a press release, 56 gave a headline (e.g. "NVIDIA Announces CEO Transition", "Pfizer Appoints Cecile Guegan as Chief Financial Officer"), 4 MB downloaded in all. The rules that got there (skip exhibit labels, file names, phone numbers, contents pages, bare company names; rejoin wrapped headlines; give up on agreements, bond terms and financial statements) are tested in `tests/press-release.test.mjs`.
- **Charts:** month-by-month buying and selling on stock pages (12 months) and insider pages (24 months), `components/MonthBars.tsx`. Research ranges in `lib/evidence.json` now carry the 90% range (`scripts/build-evidence.mjs`).
- **Checks:** 109 tests; axe 0 violations on stock pages in both themes with every Analysis panel open (test data: real trades from insiders.json, SEC calls answered locally because SEC blocks the sandbox).

## Round 91: phase 4, Congress intelligence (2026-11-12)

- **`scripts/lib/congress-intel.mjs`** (tests in `tests/congress-intel.test.mjs`), run by the daily Congress job through `congress-summary.mjs`:
  - **Sectors:** estimated dollars bought and sold by sector, per member and for all members over the last year. Sector from the screener (SEC industry codes), trying share-class spellings (GOOG, BRK.B); covers 88% of House stock trades and 93% of the dollars; the rest (mostly foreign stocks) is "Other or foreign".
  - **Committees:** each member's full committees from the public-domain congress-legislators files (96 of 102 members matched), and `COMMITTEE_SECTORS`, Arkanum's narrow reading of which sectors ten committees cover (Financial Services: Financials, Real Estate; Armed Services: Industrials; Energy and Commerce: Energy, Utilities, Health Care, Communication Services; and so on). A trade in such a sector is marked "committee sector" (`jx`), 1,675 of 9,443 trades. Shown as a fact with a note that it isn't evidence of misuse.
  - **Bought together:** stocks two or more members bought within 30 days of each other in the last year (e.g. AMZN, 4 members, Jan 16 to Feb 10), with a note that this is a pattern, not evidence of coordination.
  - **Track records:** each member's purchases from disclosure to the latest close against the S&P 500: median of each trade's gap, 90% range from the month-block bootstrap, verdict "beat" or "trailed" only when the range excludes zero, and only with at least 10 purchases over 6 filing months (3 months first; raised because 5-month records ranked luck). Now: 22 members judged, 2 beat, 6 trailed, 14 no clear edge.
- **Congress page:** members can be ranked by "$ traded" (default) or "Track record"; the ranking states how many "beat" verdicts chance alone would give (5% per side of the members judged). New cards: Bought by several members, What House members trade by sector.
- **Member pages:** Track record (with range and verdict), Committees (with the sectors each covers), What they trade by sector; trades in a committee's sector say so next to the account.

## Round 92: phase 5, watching, alerts, exports, funds (2026-11-12)

- **Follow funds:** Follow button on each fund (`fund:<SEC ID>`, accepted by `sanitizeFollowing`). `build-funds.mjs` writes the funds that filed a new 13F this run to `$FUNDS_NEW_OUT`; `scripts/fund-alerts.mjs` (new step in `data.yml`, after the data is committed, `continue-on-error`) sends followers "Berkshire Hathaway filed its Q3 2026 holdings" with what it started buying and sold out of, linking to the fund. A fund's first appearance sends nothing.
- **Watching page** (`/watching`, noindex): watchlist stocks (30-day insider buys and sales, what tracked funds did), followed House members (latest disclosure, count since the last visit), followed funds (latest 13F, new and sold-out positions), followed insiders (links). "New" marks anything since the last visit, kept in localStorage. Linked from every Follow button and the Markets page card ("People and funds you follow").
- **CSV exports** (`components/CsvButton.tsx`, `lib/csv.mjs`, `lib/csvColumns.ts`): stock pages (insider trades), insider pages, House member pages, each fund's holdings and changes. Built in the browser from data on the page (no server time); raw filing data only, never price-based returns (owner, round 89); UTF-8 with BOM for Excel; spreadsheet formulas neutralised. Tests in `tests/csv.test.mjs`.
- **Institutional Holdings** (`/stakes`, `app/stakes/HoldingsView.tsx`): two tabs, Companies (company holdings, as before) and Funds (moved from the Insiders page's "Big funds" tab). Old `/?view=funds&fund=…` links forward; search, digest and alert links point to `/stakes?view=funds`.
- **15 more funds** (28 in all): Oaktree, Viking Global, Lone Pine, Elliott, Trian, Starboard, ValueAct, Himalaya, Akre, Dalal Street, Paulson, Fundsmith, Maverick, Glenview, Gates Foundation Trust. SEC IDs checked with `scripts/diagnose/fund-ciks.mjs` (via `diagnose.yml`); left out Scion (no 13F since Nov 2025), Greenlight and Jana (none since 2024, 2023 under those IDs), Gotham (about 1,800 positions). They appear after the next daily data run. Paper no. 5 counts funds from its own data (`FUNDS_TESTED`; the figure note no longer says 13), so it changes only when the monthly refresh reruns the study (December 5), which takes longer with 28 funds and keeps last month's results if a claim no longer holds.

## Round 93: phase 6, the research lab and saved strategies (2026-11-12)

- **Lab data** (`lib/lab.mjs`, tests in `tests/lab.test.mjs`): `scripts/backtest.mjs --lab <file>` writes one row per kept purchase (filing date, role code, insiders buying, value, pre-planned, market cap at entry, under $5, and 1-, 3- and 6-month returns minus the S&P 500's, in basis points; no prices, no raw returns). Market cap = unadjusted entry price × shares outstanding from SEC's XBRL frames (one request per quarter for every company; trade's quarter first, then earlier, so a later split can't inflate it); known for 86% of 2023-25 and 81% of 2026 purchases (foreign 20-F filers aren't in the frames). `backtest.yml` has `lab_only` and `lab_file` inputs (rebuild the table without touching the papers' results); `research-refresh.yml`'s buys leg rewrites `buys-2026.json` monthly. Files: `public/data/lab/buys-2023-25.json` (24,901 purchases, 1.1 MB) and `buys-2026.json` (6,297). Check: "all purchases" gives −6.7% vs the S&P 500 at six months, the same as paper no. 1.
- **`/research/lab`** (`app/research/lab/LabView.tsx`): two strategies side by side, each with presets and rules (CEO only, top executives only, insiders buying 1-4+, purchase size, company size at entry, leave out pre-planned, leave out under $5); 2023 to 2025 or filed since January 2026; for 1, 3 and 6 months: median vs the S&P 500, 90% range (month-block bootstrap) drawn on a zero line, share that beat it, verdict ("beat"/"trailed" only when the range excludes zero); A against B at six months by the papers' overlap rule; a count of rule sets tried this visit with the multiple-testing warning; market-cap coverage note. Runs in the browser. Linked from /research and the homepage research box.
- **Saved strategies with alerts** (owner, 2026-11-12): "Save and alert me" under each strategy (up to 5, `components/useStrategies.ts`, localStorage `arkanum.strategies`), stored with its tested six-month result; sent with the device registration (`sanitizeStrategies` in `lib/alerts.ts`, `cleanRules` in `lib/lab.mjs`); listed on the lab page and the Watching page. `scripts/instant-alerts.mjs` (every two hours) checks each new officer or director purchase with the same rules code as the lab (`matches`, `tradeAsRow`, `roleCode`, which the backtest now also uses), insiders buying from the 30-day file and market cap from `data/shares.json` (`scripts/build-shares.mjs`, daily in `data.yml`); one message per device per run: "Strategy match: <name>", the purchase, and "Tested 2023-25: −10.2% vs the S&P 500 over 6 months". Respects the instant-alerts switch. On the last 30 days, "CEO, $100K+, not pre-planned" would have matched 59 purchases and "3+ insiders" about 200.

## Round 94: phase 7, competitors, brand, launch kit (2026-11-12)

- **Competitor audit** (`docs/competitors.md`, sources linked): Quiver Quantitative, OpenInsider, Capitol Trades, Unusual Whales, the free "Quiver alternatives", InsiderScreener and Insider Monkey; strengths, weaknesses, where Arkanum is and isn't different, risks. Main finding: no competitor found publishes ongoing, out-of-sample tests of its own labels with ranges; Quiver markets backtested returns ("Congress Buys" 32.5% a year since April 2020). Caution recorded: different periods from paper no. 4, so never call their figure wrong.
- **Launch kit rebuilt** (`docs/backtest/social-drafts.md`, `writeup-draft.md`): Arkanum Data name and URL, figures from the published files as of 2026-11-12 (24,922 purchases; every group trailed the S&P 500; median −6.7%; CEO −8.7%; $1M+ −11.0%; pre-planned −13.1%; under $5 −14.0%; best group −4.6%; 2026 −5.2% "too early to judge"; House purchases −4.4% from disclosure), the lab and saved strategies. Bluesky posts under 300 characters. A sentence overstating the pre-filing move was corrected to paper no. 3's own wording.
- **Brand pillars on the site:** About has "What Arkanum stands on" (credibility at the source, transparency, evidence including when it goes against us, and independence: no ads, paid placements, accounts or tips); the methodology page opens with the same three rules.
- **Homepage fix** (shipped in its own push): the "three kinds of trade" card no longer leaves empty space; the paper links moved to a full-width strip under both cards (both cards 239 px on desktop).

## Round 96 (2026-11-13): pages in tabs (shipped 448d128)

- **Tabs instead of long scrolls** (`components/PageTabs.tsx`): stock (Overview, Company, Announcements, Insider trades, Congress and funds, Research), insider (Buys and sales, Track record, Companies), House member (Trades, Track record, Committees and sectors), fund (Largest holdings, Changes this quarter), Congress (Trades, Members, Bought together, Sectors), Research (Key findings, Papers, How we test), About and Watching. The open tab is in the address (`?tab=`); Back works; old `#section` links open the tab holding the section; every panel stays in the HTML for search engines. Empty tabs are hidden.
- The owner chose to keep the current visual design (the redesign mockups were not used).
- On this branch only (not shipped): the Risk tab on stock pages (RiskCard and red-flag count) and the "What we stand on" tab on About, carried over from round 95.

## Round 97 (2026-11-13): homepage split, risk analytics, tab links (shipped d61a052, 7e8faff)

- **Homepage is the intro only**, reached from the logo; the insider dashboard moved to `/insiders` (the Insiders tab). Old `/?view=`, `/?q=` etc. redirect there with their query (next.config.mjs); `/#dashboard` links are sent there by `components/HomeLinks.tsx`.
- **Risk analytics shipped** (built in round 95): red-flag count by the company name, a Risk tab on stock pages, risk tags on every insider trade. `build-shares.mjs` now writes `public/data/shares.json` (read by stock pages for the market-value flag); until the next data run writes it, the small-company flag doesn't show.
- **Tabs follow client navigation** (`PageTabs` reads `useSearchParams` in its own Suspense boundary, so panels still render on the server): links to `?tab=` on the same page, such as "How we test" in the three-kinds card (now `/research?tab=method`), switch the tab.
- Still on this branch only: the "What Arkanum stands on" tab on About and the methodology intro.
