# Form4

A free, public market tracker built around official filings: what company insiders buy and sell, what big funds hold, what companies announce, and how their businesses are doing — in plain English — with prices, charts and news from TradingView. No account, no ads. Works on any phone via **Add to Home Screen**, with an optional daily notification.

Live: https://form4-insiders.vercel.app

## What's in it

| Page | What it does | Data |
|---|---|---|
| Markets | Ticker tape and market overview (indices, commodities, bonds, forex, crypto), your watchlist, this week's insider buying | TradingView widgets; SEC Form 4 |
| Stock page | TradingView quote header (incl. next earnings, market cap, P/E, yield) and full chart (indicators, compare); SEC fundamentals; 8-K announcements in plain English; TradingView headlines; big funds holding it; FINRA retail-wholesaler volume; insider trades | TradingView, SEC, FINRA |
| Insiders | Insider trades (30 days; officers & directors vs funds; cluster buys; live feed) and Big funds (13F) for 13 well-known funds | SEC Form 4, SEC 13F |
| Stakes | What listed companies (NVIDIA, Amazon, Alphabet…) own in other companies: quarterly holdings and changes, 5%+ stakes, and private investments announced in press releases (unverified, linked) | SEC 13F, SEC 13D/13G; PR Newswire, Business Wire |
| Digest | Daily summary after the 4 PM close: biggest insider buys, cluster buys, big-fund filings, coming events, and your watchlist's insider trades and fund moves. Optional push notification personalized to your watchlist, plus instant alerts for watchlist buys and people you follow | All of the above |
| About | Disclaimer, data sources and attribution, privacy | — |

## Data licensing (why it's built this way)

Everything shown is either public domain or explicitly licensed for free display:

- **SEC EDGAR, BEA, Federal Reserve:** public domain.
- **TradingView widgets:** free to embed on other sites as long as TradingView's attribution stays as designed (the "by TradingView" links under each widget). US stock prices in widgets are delayed; forex and crypto are real-time.
- **FINRA OTC Transparency data:** may be shown to end users for non-commercial use with FINRA credited as the source; users may not redistribute it.
- **OpenFIGI:** CUSIP → ticker lookups.

Not used, because their terms don't allow showing their data to the public: Yahoo Finance, Nasdaq's site API (options, analyst ratings, earnings/dividend calendars), Coinbase market data, ApeWisdom (Reddit mentions).

## How it runs (free)

- **Vercel Hobby** hosts the site (free for non-commercial use). A private **Vercel Blob** store holds devices that turned on notifications (random device ID, push address, watchlist, people followed) and the latest digest.
- **GitHub Actions** (`.github/workflows/data.yml`) runs weekdays at 4:02 PM New York time: SEC fundamentals → insider trades → 13F holdings → big economic releases → health check → digest → commit. `insiders-hourly.yml` adds new filings hourly; `stakes.yml` updates company stakes each weekday morning. If any step fails, nothing is sent or published and the owner's devices get an alert naming the step. The job proves its identity to the site with a GitHub-signed token (no secret stored in GitHub).

### Settings

- Vercel: `SEC_USER_AGENT` (name + contact email, required by SEC), `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `ALERTS_PASSCODE` (owner code: entering it under Digest → Site owner makes that device receive failure alerts), `ALERTS_SECRET` (manual runs), `BLOB_READ_WRITE_TOKEN`.
- GitHub Actions secrets: `SEC_USER_AGENT`; optional `FRED_API_KEY` (free) adds jobs report, CPI, PPI, retail sales and jobless claims to Coming up.

### Run locally

```bash
npm install
cp .env.example .env.local   # SEC_USER_AGENT etc.
npm run dev
node scripts/build-screener.mjs && node scripts/build-insiders.mjs --days 30 && node scripts/build-funds.mjs && node scripts/build-events.mjs
node scripts/health-check.mjs all
node scripts/daily-digest.mjs --dry-run
```

## Known limits

- **Free-tier limits:** Vercel Hobby and the Blob store have usage limits; notifications are capped at 5,000 devices. If Form4 gets popular, these are the first things to revisit.
- **Fundamentals** use the last 4 reported quarters where SEC data allows, otherwise the last fiscal year; dividends and free cash flow use the last fiscal year. Banks, insurers and funds don't get free cash flow or debt/equity.
- **ETFs** aren't in SEC's company list, so search doesn't suggest them; typing the ticker and pressing Enter still opens a TradingView chart.
- **13F holdings** are 6–20 weeks old when published. **FINRA** volume is 2–4 weeks delayed and doesn't show buys vs sells.
- **Notifications on iPhone** need iOS 16.4+ and the Home Screen app.

See [docs/build-log.md](docs/build-log.md) for the history and decisions.
