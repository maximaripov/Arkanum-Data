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
