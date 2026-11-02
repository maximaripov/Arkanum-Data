# Foresight

Personal market tracker: live quotes across stocks, indices, FX, commodities and crypto, a stock screener over every US-listed company, and insider trades from SEC filings. Free to run: no paid APIs, no API keys, no database.

**Personal use only.** Stock prices come from Yahoo Finance's unofficial endpoints, which are not licensed for showing to other people. Don't make this public.

## What's in it

| Page | What it does | Data |
|---|---|---|
| Markets | Watchlist (saved in your browser), indices, rates & FX, commodities, crypto | Yahoo, polled every 5–15 s; crypto streams tick-by-tick from Coinbase |
| Stock page | Chart (1D–5Y, line or candles), key stats, fundamentals, that company's insider trades | Yahoo + SEC EDGAR |
| Screener | ~7,000 NYSE/Nasdaq/Cboe stocks: market cap, P/E, P/S, margin, revenue growth, ROE, 1Y return, distance from 52-week high, insider buying (30 days). Presets included | Rebuilt nightly |
| Insiders | Every insider open-market buy and every sale over $250K for the last 30 days, "cluster buys" (2+ insiders, same stock), plus a live feed | SEC Form 4 |

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
4. The workflow in `.github/workflows/data.yml` rebuilds the data every weekday after the US close and commits it; Vercel redeploys on each commit. Run it once by hand from the Actions tab.

## Known limits

- **"Real-time" stock prices:** Yahoo's quotes are close to live for US stocks during market hours but are not an official feed and can lag or break. Crypto is truly live.
- **Fundamentals are annual** (last full fiscal year from SEC filings), not trailing-twelve-months. P/E uses that year's net income.
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
