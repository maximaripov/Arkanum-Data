# Posts to paste (the owner posts these; nothing is posted automatically)

Rewritten 2026-11-12 (round 94) for Arkanum Data. Numbers are from the published research files as of that date (`docs/backtest/results.json`, `congress.json`, `public/data/lab/`); the papers refresh monthly, so check the homepage strip before posting and update any figure that moved. Edit anything that doesn't sound like you. No emoji.

Before posting: open the site on your phone and check the homepage, a stock page, /research/lab and /congress load (the firewall stops automated checks).

## Hacker News

Post as **Show HN**, link to `https://arkanumdata.vercel.app`, then add the first comment below straight away. Stay for the first hour or two to answer questions.

**Title (80 characters max):**

Show HN: Arkanum – insider and Congress stock trades, tested against the market

**First comment:**

I built a free tracker for SEC insider filings (executives and directors buying or selling their own company's stock) and House members' stock trades. Like most insider sites, it scored each purchase with the usual rules: CEO buys count more, big buys count more, several insiders at once, a first buy in years.

Before claiming that meant anything I tested it on every open-market purchase by an officer or director filed from 2023 to 2025: 24,922 of them, each bought at the first close after the filing became public, when anyone could act. Every number has a 90% range from resampling whole filing months, because trades filed in the same month move together.

What I found: every kind of insider purchase I tested trailed the S&P 500 over the next six months. The median purchase did 6.7% worse than the index (range −8.8% to −4.5%), and only 39% beat it. CEO, CFO and Chair purchases did worse than directors'. $1M+ purchases and pre-planned (10b5-1) purchases did worse than the typical insider buy. Stocks under $5 were the worst: 14% behind the S&P 500. The "most unusual" buys did no better than routine ones. Filings since January 2026, which the score was never tuned on, point the same way so far (−5.2%), though with nine months of data that's too early to judge.

House members' trades looked the same: purchases did no better than sales, and trailed the S&P 500 by 4.4% over six months from disclosure.

So the site now keeps three things apart: a reported trade, an unusual one, and a tested signal, and says that none of what it tracks has earned the last label yet. There's also a free lab where you can test your own rules (CEO only, 3+ insiders, $100K+, company size, no pre-planned trades) and save one for phone alerts; it tells you how many rule sets you've tried, because try twenty and one will look good by luck.

Caveats: one three-year period plus 2026 so far; delisted stocks drop out (which flatters insiders); returns before costs. Stack: Next.js on Vercel, data jobs on GitHub Actions, all from free public filings. Happy to answer questions about the method.

## Reddit (r/stocks, r/investing, r/SecurityAnalysis; read each subreddit's self-promotion rules first)

Post as a **text post**, not a link. One subreddit at a time, a few days apart.

**Title:**

I tested the popular insider-buying rules on 25,000 purchases from 2023-2025. Every one of them trailed the S&P 500.

**Body:**

Insider-buying sites rank purchases with the same rules of thumb: a CEO buying matters more than a director, bigger is better, several insiders at once is the strongest sign. I tested them on 24,922 open-market purchases by officers and directors filed from 2023 to 2025. Each purchase was "bought" at the first close after the filing became public, and every figure has a 90% range.

Six months later, against the S&P 500:

- The median insider purchase: −6.7% (39% beat the index).
- CEO, CFO, President or Chair purchases: −8.7%. Directors: −5.4%.
- Purchases of $1M or more: −11.0%.
- Three or more insiders buying: −5.6%.
- Pre-planned (10b5-1) purchases: −13.1%.
- Stocks under $5: −14.0%.
- The best group of all, routine purchases of $5+ stocks, still trailed by 4.6%.

Purchases filed since January 2026 (data the rules were never tuned on) are at −5.2% so far (too early to judge: nine months of data). House members' purchases trailed the S&P 500 by 4.4% from disclosure, and did no better than their sales.

Older academic studies found insider buying did beat the market, with the edge shrinking over time; this is one recent period, and delisted stocks drop out, which flatters insiders. But the usual rules didn't pick winners here.

I run a free site with the data and the five papers behind this (Arkanum Data, no ads or accounts), plus a lab where you can test your own rules. Happy to share more of the numbers.

## Bluesky (thread; 300 characters per post)

1/ I tested the usual insider-buying rules on 25,000 purchases by executives and directors, 2023-2025, bought at the first close after each filing. Every group trailed the S&P 500 over six months.

2/ Median purchase: −6.7% vs the index. CEO buys −8.7%. $1M+ buys −11.0%. Pre-planned buys −13.1%. Stocks under $5 −14.0%. "Most unusual" buys did no better than routine ones.

3/ 2026 filings, which the rules were never tuned on: −5.2% so far, too early to judge. House members' purchases: −4.4% from disclosure.

4/ So my free tracker keeps "reported", "unusual" and "tested signal" apart, and has a lab to test your own rules, with ranges. arkanumdata.vercel.app
