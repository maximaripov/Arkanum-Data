# Foresight

Personal market tracker: live quotes across stocks, indices, FX, commodities and crypto, a stock screener over every US-listed company, and insider trades from SEC filings. Free to run: no paid APIs, no API keys, no database.

**Personal use only.** Stock prices come from Yahoo Finance's unofficial endpoints, which are not licensed for showing to other people. Don't make this public.

## What's in it

| Page | What it does | Data |
|---|---|---|
| Markets | Watchlist (saved in your browser), indices, rates & FX, commodities, crypto | Yahoo, polled every 5–15 s; crypto streams tick-by-tick from Coinbase |
| Stock page | Chart (1D–5Y, line or candles) with 50/200 moving averages, volume and RSI, % comparison against up to 3 symbols (one tap for the S&P 500), your own price levels and notes, key stats, sector, fundamentals, headlines, the company's SEC 8-K announcements, its insider trades | Yahoo + SEC EDGAR |
| Screener | ~7,000 NYSE/Nasdaq/Cboe stocks: sector and industry, market cap, P/E, P/S, margin, revenue growth, ROE, 1Y return, distance from 52-week high, officer/director buying (30 days). Presets included | Rebuilt nightly |
| Briefing | Daily summary at the 4 PM Eastern close, also sent as a phone notification (GitHub starts the job at 4:02 PM; it usually arrives 4:05–4:20): indices, rates, oil, gold, bitcoin, sectors, breadth, biggest movers, your watchlist and price levels, officer/director buys, and the next 7 days of catalysts (GDP, PCE, trade, Fed decisions, earnings; jobs report and CPI with a FRED key) | Yahoo, SEC, BEA, Federal Reserve, Nasdaq, FRED |
| Insiders | Every insider open-market buy and every sale over $250K for the last 30 days, filterable to officers & directors or funds & 10% owners, "cluster buys" (2+ insiders, same stock), plus a live feed | SEC Form 4 |

On a phone, open the site and use **Share → Add to Home Screen** (iOS) or **Install app** (Android). It runs full-screen like an app.

## Run it locally

```bash
npm install
cp .env.example .env.local      # put your own name + email in SEC_USER_AGENT
npm run dev                     # http://localhost:3000
```

Refresh the data files by hand:

```bash
node scripts/build-screener.mjs           # a few minutes
node scripts/build-insiders.mjs --days 30 # first run ~30 min, then ~2 min/day
```

## Deploy for free

1. Push this folder to a **private** GitHub repo.
2. Import the repo on [Vercel](https://vercel.com/new) (Hobby plan is free). Add the environment variable `SEC_USER_AGENT`, e.g. `Foresight personal app you@example.com`.
3. In GitHub → Settings → Secrets and variables → Actions, add the same `SEC_USER_AGENT` as a secret.
4. The workflow in `.github/workflows/data.yml` runs every weekday at 4:02 PM New York time (two UTC schedules cover daylight saving; a gate job keeps the right one): closing prices, the briefing, insider trades, then a commit. Vercel redeploys on each commit. Run it once by hand from the Actions tab.

## Phone notifications (daily briefing)

1. On iPhone: open the site in Safari → Share → **Add to Home Screen**, then open Foresight from the Home Screen icon (iOS only allows notifications for Home Screen apps).
2. Go to **Briefing**, enter the passcode (Vercel setting `ALERTS_PASSCODE`), tap **Turn on notifications**, then **Send a test**.
3. The 4 PM GitHub job (`scripts/daily-briefing.mjs`) builds the briefing and calls `/api/alerts/send`. It proves its identity with a GitHub-signed token (no secret to copy); the site only accepts tokens from this repo's `main` branch. Optional: `FRED_API_KEY` (free at fred.stlouisfed.org) adds jobs report, CPI, PPI, retail sales and jobless claims dates.

Every time the app opens (and on every change), a device with the passcode sends its Markets-tab watchlist and price levels to a private Vercel Blob store, so the briefing lists the same stocks in the same order.

## Known limits

- **"Real-time" stock prices:** Yahoo's quotes are close to live for US stocks during market hours but are not an official feed and can lag or break. Crypto is truly live.
- **Fundamentals use the last 4 reported quarters** where SEC data allows (fiscal Q4 is rebuilt as full year minus Q1–Q3), otherwise the last fiscal year. Banks and some others only get annual figures. P/E uses reported net income, so one-time gains or losses distort it.
- **Sectors come from SEC industry (SIC) codes**, mapped to familiar sector names. SIC is older than the usual classification, so a few companies land in a surprising sector.
- **Headlines come from Yahoo** and are mixed with general market stories; the stock page puts stories naming the company first. The SEC 8-K list is official.
- **Watchlist and price levels sync between devices that have the passcode.** Each device loads the shared copy on open and when it returns to the foreground, and sends edits right away; if two devices edit before syncing, the later edit wins. A device without the passcode keeps its own copy.
- **Notifications on iPhone** need iOS 16.4+ and the Home Screen app. If you delete the Home Screen icon, turn notifications on again.
- **Market cap is missing for some companies with several share classes** (e.g. Visa, Berkshire), because they report share counts per class.
- **Foreign companies** filing 20-F/40-F (Toyota, TSMC…) have prices but no fundamentals, since SEC's dataset only covers US GAAP filers.
- **SEC rules:** SEC asks for a contact email in `SEC_USER_AGENT` and no more than 10 requests per second. The scripts stay under that.

## Layout

```
app/              pages (Markets, screener, insiders, stock/[symbol]) and API routes
components/       UI pieces, polling and watchlist hooks
lib/yahoo.ts      quotes, charts, search
lib/sec.ts        ticker→CIK, per-company and live Form 4 trades
lib/form4.mjs     Form 4 XML parser shared by the app and the nightly script
scripts/          nightly builders for public/data/screener.json and insiders.json
```
