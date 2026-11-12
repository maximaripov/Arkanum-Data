# Competitor audit (2026-11-12, round 94)

From public pages and third-party reviews found by web search on 2026-11-12. Prices come from reviews, which disagree with each other; check each vendor's own pricing page before quoting one. Nothing here was tested hands-on.

## The field

| | What it is | Price | Strengths | Weaknesses |
|---|---|---|---|---|
| **Quiver Quantitative** | Alternative-data platform: Congress, insiders, lobbying, government contracts, WallStreetBets, 13F | Free tier; Premium about $25-30/month; API from $30/month (insider and 13F data in a $75/month API tier, per one review) | Breadth of datasets; Congress backtester and "strategies"; copy-trading through Quantbase; API and MCP server; brand recognition | Markets returns: its strategies page shows "Congress Buys" at 32.5% a year since April 2020, with no ranges or out-of-sample check on the page; backtester and screens behind the paywall; reviews disagree on what Premium includes |
| **OpenInsider** | Free Form 4 screener | Free | Fast, dense, prebuilt views (cluster buys, large purchases, officer buys); trusted by power users | No API; dated interface; fixed cluster definition; no context, no evidence of whether any view works |
| **Capitol Trades** | Free Congress trade tracker | Free (a paid alerts tier is mentioned by one source, unconfirmed) | Clean filters by politician, party, committee, issuer | Congress only; reported 24-48 hour lag; no API; no performance evidence |
| **Unusual Whales** | Options-flow platform with Congress data | About $50-75/month retail (reported inconsistently) | Ties politicians' disclosures to options flow and dark-pool prints; politician portfolios; strong social reach | Paid; Congress data is a side feature; sells excitement around political trades |
| **Free "Quiver alternatives"** (TraceFour, Signal8, InsiderCat, GovGreed, TraderCongress, Meridian and others) | Mostly SEO comparison pages around a free tracker | Free or freemium | Cheap to start; rank well for "Quiver alternative" searches | Thin, interchangeable; each claims to be the free version of the others |
| **InsiderScreener, Insider Monkey** | Paid insider screeners and newsletters | Paid | Multi-country data (InsiderScreener); long-running newsletter (Insider Monkey) | Proprietary scores described only in general terms; can't be checked |

## Where Arkanum is different, and where it isn't

**Different (hard to copy quickly):**
1. **It tests its own labels, publicly, and keeps testing.** Five working papers, every number with a 90% range, a monthly refresh on filings the labels were never tuned on, and a report card that says "changed" when a result stops holding. No competitor found does this; Quiver shows backtested returns without ranges or a fresh-data check.
2. **It says what didn't work.** Every kind of insider purchase tested trailed the S&P 500 in 2023 to 2025 (median −6.7% over six months), and the site says so on the homepage. Competitors sell the signal; Arkanum tests it.
3. **Reported, unusual and tested are kept apart** on every page, and nothing is called a buy signal.
4. **The lab is free and honest about luck**: anyone can test CEO-only, cluster or size rules, see the ranges, compare two strategies, and is told how many rule sets they've tried.
5. **Free, no account, no ads**, with trades, Congress, funds, research and alerts in one place.

**Not different (table stakes others do as well or better):**
- Raw coverage and speed: OpenInsider and Quiver are as fast or faster, and Quiver covers far more datasets (lobbying, contracts, Senate).
- Senate trades: competitors have them; Arkanum can't (the Senate's site blocks automated access).
- Options flow and dark pools: Unusual Whales' territory; not worth chasing.
- An API: Quiver has one; Arkanum has open JSON files only.

## What Arkanum can do better than all of them

- **Evidence next to every trade**: the "trades like this" line and the Analysis panel, which no tracker shows.
- **Fair Congress track records**: a range, a minimum sample and the chance baseline, where others rank politicians by raw past returns.
- **Saved strategies whose alerts carry their tested result**, so an alert reads as "meets your rules", not as a tip.
- **Plain English and source links on everything**, so a reader can check any row against the filing.

## Gaps and risks

- **Positioning risk:** "we found it doesn't work" is less exciting than "+32% a year". The pitch has to be the trustworthy answer ("Other sites sell you insider signals. We test them."), aimed at people who have already been burned or are sceptical.
- **Don't overclaim against Quiver.** Its "Congress Buys" figure covers April 2020 on; paper no. 4 covers trades from November 2024 on and finds House purchases trailed the S&P 500 (median −4.4% over six months from disclosure; −2.4% against the equal-weighted index). Different periods: say "we found no edge in the period we tested", never "their number is wrong".
- **Name:** "Arkanum" is close to the ARCANUM financial-services trademark (handoff section 8), and a newsletter called "Form4" exists (the project's old name).
- **Price data licence** (Yahoo, Tiingo personal plan) before any income or API.

## Sources

- Quiver: [bullishbears.com review](https://bullishbears.com/quiver-quantitative-review/), [findmymoat.com](https://www.findmymoat.com/tools/quiver-quantitative), [insigtrade.com](https://insigtrade.com/blog/quiver-quantitative-review-2026-is-it-worth-the-cost), [Quiver strategies page](https://www.quiverquant.com/strategies/), [QuantConnect replication](https://www.quantconnect.com/research/17886/copying-congress-trades/p1), [Finbold 2026](https://finbold.com/this-trading-bot-buys-stocks-bought-by-politicians-heres-how-much-its-up-in-2026/)
- OpenInsider: [insiderscreener.com comparison](https://www.insiderscreener.com/en/compare/openinsider), [heygotrade.com](https://www.heygotrade.com/en/blog/insider-buying-bullish-signal-how-to-track-without-bloomberg/)
- Capitol Trades and Unusual Whales: [tradercongress.com](https://tradercongress.com/blog/capitol-trades-vs-unusual-whales), [vertdata.com](https://vertdata.com/blog/best-tools-track-congressional-trading-2026), [meridianfin.io](https://meridianfin.io/knowledge/congress-tracker-comparison-2026), [insidercat.com](https://insidercat.com/blog/best-congressional-trading-trackers)
- Free alternatives: [tracefour.com](https://tracefour.com/compare/quiver), [signal8.ai](https://signal8.ai/articles/quiver-quantitative-alternatives), [adanos.org](https://adanos.org/insights/blog/quiver-quantitative-alternatives-2026/)
- Research context: [Insider Monkey](https://www.insidermonkey.com/insider-trading/education-center/amp/challenges-with-imitating-insider-transactions), [Neuberger Berman](https://nb.com/en/se/insights/systematically-speaking-may-2019)
