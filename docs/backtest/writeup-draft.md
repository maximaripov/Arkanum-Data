# Draft: long write-up (for the owner to edit and post, e.g. a blog, Substack or Medium)

Rewritten 2026-11-12 (round 94) for Arkanum Data. Every number is from the published research files as of that date; the papers refresh monthly, so check the figures against the site before posting. No emoji.

Suggested titles:
- "I tested the insider-buying rules on 25,000 purchases. None of them beat the market."
- "Other sites sell you insider signals. I tested them."

---

## I tested the insider-buying rules on 25,000 purchases. None of them beat the market.

When a CEO buys their own company's stock, it has to be reported to the SEC within two business days. Dozens of websites turn those filings into signals: the CEO bought, so should you; three insiders bought at once, so this is a strong buy. I run a free site that tracks the same filings, Arkanum Data (arkanumdata.vercel.app), and it used to rank purchases with exactly those rules.

Before telling anyone the rankings meant something, I tested them.

### How

Every open-market purchase by an officer or director filed with the SEC from January 2023 to December 2025: 24,922 purchases, after removing stocks with no price history and filings whose price didn't match the ticker. Each purchase is "bought" at the first close *after the filing was public*, when an outsider could actually act, and compared with the S&P 500 over the next one, three and six months, and with other insider purchases filed the same month.

Every result comes with a 90% range. Purchases filed in the same month move together (one market drop hits them all), so the range comes from resampling whole months, not single trades; counting trades one by one makes results look far more certain than they are.

### What happened

Over six months, against the S&P 500:

| Kind of purchase | Median vs S&P 500 | 90% range | Beat it |
|---|---|---|---|
| All officer and director purchases | −6.7% | −8.8% to −4.5% | 39% |
| CEO, CFO, President or Chair | −8.7% | −10.8% to −6.6% | 37% |
| Directors | −5.4% | −7.9% to −3.1% | 41% |
| Three or more insiders buying | −5.6% | −9.1% to −2.7% | 41% |
| $1 million or more | −11.0% | −13.3% to −8.8% | 36% |
| Pre-planned (10b5-1) | −13.1% | −17.0% to −8.1% | 36% |
| Stocks under $5 | −14.0% | −15.7% to −12.5% | 37% |

Every group trailed the index, and every range is below zero. The best of the 28 groups I tested, routine purchases of stocks over $5, still trailed by 4.6%. The purchases my own score rated "most unusual" did no better than routine ones.

Two of the popular rules point the wrong way: CEO purchases did worse than directors', and the biggest purchases did worse than smaller ones. It isn't the reporting delay: a separate test on the site found the stock moves a little before a purchase is public (+2.4% for $1M+ purchases, +0.7% overall), which is small next to the six-month gap. The insiders' own purchases trailed the market too.

### Fresh data

A rule that worked in 2023 to 2025 could be a fluke of that period, so the site reruns every test each month on filings since January 2026, which the rules were never tuned on. So far, with nine months of data, purchases are at −5.2% against the S&P 500: the same direction, but too early to judge. The site's rule is to call a result "changed" only after twelve months, and only if the new range doesn't overlap the old one.

### Congress

The same test on 8,895 stock trades disclosed by members of the House since November 2024: purchases trailed the S&P 500 by 4.4% over six months from disclosure, and did no better than the members' own sales.

### What changed on the site

The site now keeps three things apart on every page:

1. **Reported**: a trade someone disclosed. That's every row.
2. **Unusual**: a trade out of the ordinary for that person. A reason to read the filing, not to buy.
3. **Tested signal**: a kind of trade that held up across years of filings with a range above zero. Nothing it tracks has earned this yet.

There's also a free lab where you can test your own rules (CEO only, three or more insiders, purchase size, company size, no pre-planned trades) on the same data, compare two strategies, and save one for phone alerts. Each alert carries the strategy's tested result. The lab counts how many rule sets you've tried, because test twenty and about one will look good by chance.

### Caveats

- One three-year period plus 2026 so far. Older academic studies found that insider purchases beat the market, with the edge shrinking over time.
- Delisted stocks drop out of the data, which probably makes insiders look better than they were, not worse.
- Returns are before trading costs and taxes, which hit hardest in the small, cheap stocks where insider buying is most common.
- This describes past groups of trades. It isn't advice about any stock.

The five papers, the methodology and the lab are at arkanumdata.vercel.app/research. It's free, with no ads and no account.
