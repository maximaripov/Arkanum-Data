# Foresight

Personal market tracker: live quotes across stocks, indices, FX, commodities and crypto; a screener over every US-listed company; insider trades and big-fund holdings from SEC filings; earnings, dividends, options, analyst ratings and retail-investor interest; and a daily briefing sent to your phone at the 4 PM close. Free to run: no paid APIs.

**Personal use only.** Prices come from Yahoo Finance's and Nasdaq's unofficial endpoints, which are not licensed for showing to other people. Keep the repo private.

## What's in it

| Page | What it does | Data |
|---|---|---|
| Markets | Watchlist, indices, rates & FX, commodities, crypto | Yahoo (polled every 5–15 s); crypto streams from Coinbase |
| Stock page | Chart (1D–5Y, line or candles) with MA 50/200, volume, RSI; % comparison with up to 3 symbols; your price levels with notes; fundamentals; earnings dates and results vs estimates; dividends; **options chain with the implied move**; **analyst ratings and price targets**; **retail interest** (Reddit mentions, retail-wholesaler volume); big funds holding it; headlines; SEC 8-K announcements; insider trades | Yahoo, Nasdaq, SEC, ApeWisdom, FINRA |
| Screener | ~7,100 NYSE/Nasdaq/Cboe stocks: sector/industry, market cap, P/E, P/S, margin, revenue growth, ROE, dividend yield, debt/equity, FCF yield, 1Y return, distance from 52-week high, officer/director buying. Presets and saved screens | Rebuilt at 4 PM |
| Insiders | Insider trades (30 days; officers & directors vs funds; cluster buys; live feed) and **Big funds (13F)**: holdings, new positions, adds, cuts and exits for 13 well-known funds | SEC Form 4, SEC 13F |
| Calendar | Earnings and dividends for your watchlist, next 90 days | Nasdaq, Yahoo |
| Briefing | 4 PM summary, also a phone notification: markets, sectors, breadth, movers, your watchlist and levels, insider buys, Reddit spikes, saved-screen changes, next 7 days of catalysts | All of the above, plus BEA, Federal Reserve, FRED |

On a phone: open the site, then **Share → Add to Home Screen** (iOS) or **Install app** (Android).

## Run it locally

```bash
npm install
cp .env.example .env.local      # put your own name + email in SEC_USER_AGENT
npm run dev                     # http://localhost:3000
```

Data files (the 4 PM job builds these; run by hand if needed):

```bash
node scripts/build-screener.mjs           # prices + SEC fundamentals, a few minutes
node scripts/build-insiders.mjs --days 30 # insider trades; first run ~30 min, then ~2 min/day
node scripts/build-dividends.mjs          # declared dividends, next 5 weeks
node scripts/build-funds.mjs              # 13F holdings; first run ~5 min, then only new filings
node scripts/health-check.mjs all         # validates everything above
```

## Deploy (free)

1. Push to a **private** GitHub repo and import it on [Vercel](https://vercel.com/new) (Hobby plan).
2. Vercel environment variables: `SEC_USER_AGENT` (e.g. `Foresight personal app you@example.com`), `ALERTS_PASSCODE`, `ALERTS_SECRET`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and a private Blob store (`BLOB_READ_WRITE_TOKEN`).
3. GitHub → Settings → Secrets → Actions: `SEC_USER_AGENT`; optionally `FRED_API_KEY` (free at fred.stlouisfed.org) for jobs-report and CPI dates.
4. `.github/workflows/data.yml` runs weekdays at 4:02 PM New York time (two UTC schedules cover daylight saving; a gate job keeps the right one): closing prices → health check → briefing → insider trades → dividends → 13F → health check → commit. If any step fails, nothing is published and your phone gets an alert naming the step. Run it by hand from the Actions tab; untick "notify" to update the page silently, tick "test alert" to test failure alerts.

## Phone notifications and sync

1. On iPhone, add Foresight to the Home Screen and open it from there (iOS only allows notifications for Home Screen apps).
2. **Briefing** tab → enter the passcode → **Turn on notifications** → **Send a test**.

Devices with the passcode share one watchlist, price levels and saved screens (stored in a private Vercel Blob store): each device loads the shared copy on open and on returning to the foreground, and sends edits right away. The 4 PM job proves its identity with a GitHub-signed token, so no secret is stored in GitHub.

## Known limits

- **Unofficial prices:** Yahoo and Nasdaq data can lag or break. Crypto (Coinbase) is live; SEC data is official.
- **Fundamentals** use the last 4 reported quarters where SEC data allows (fiscal Q4 = full year − Q1–Q3), otherwise the last fiscal year. Dividends and free cash flow use the last fiscal year. P/E uses reported net income, so one-time gains distort it.
- **Sectors** come from SEC industry (SIC) codes, which are older than the usual classification.
- **Options** are 15-minute delayed, near-the-money strikes, next 75 days. The implied move is the at-the-money call + put price: the typical size of the move, not a range the stock usually stays within.
- **Analyst data** (Zacks via Nasdaq) has ratings and targets but no individual upgrades/downgrades.
- **Retail interest** has no free "how many people bought" figure (Robinhood closed its data in 2020). Reddit mentions are chatter, not trades; FINRA wholesaler volume shows retail-type trading but not buy vs sell, with a 2–4 week delay.
- **13F holdings** are 6–20 weeks old when published, US long positions only. Greenlight and Scion stopped filing and aren't tracked.
- **Market cap is missing** for some multi-class companies (Visa, Berkshire). Foreign filers have prices but no fundamentals.
- **Notifications** need iOS 16.4+ and the Home Screen app.
- **SEC rules:** contact email in `SEC_USER_AGENT`, at most 10 requests per second. The scripts stay under that.

See [docs/build-log.md](docs/build-log.md) for decisions, fixes and the full history.
