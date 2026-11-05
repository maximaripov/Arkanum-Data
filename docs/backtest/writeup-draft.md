# Draft: backtest write-up (for the owner to edit and post)

Every number below is from [results.md](results.md) (6-month returns unless noted). Nothing here is published yet.

Suggested titles:
- Hacker News: "Show HN: I scored 23,000 insider stock purchases; the popular signals didn't pick better buys"
- Reddit (r/stocks, r/investing): "I tested the usual insider-buying rules on 23,000 purchases from 2023–2025. Most of them didn't work."

---

## I scored 23,000 insider stock purchases. The signals people watch didn't pick better buys.

I run a free site, Form4 (form4-insiders.vercel.app), that turns SEC insider filings into plain English: when a CEO or director buys their own company's stock, it usually shows up within an hour or two.

Like most insider-trading sites, it ranked each purchase with a score built from the usual advice:

- a CEO or CFO buying counts for more than a director
- a big purchase counts for more than a small one
- a first purchase in years is a stronger sign
- several insiders buying at once is a stronger sign
- a large increase in their own stake is a stronger sign
- purchases set up in advance (Rule 10b5-1 plans) count for less

Before telling anyone those scores meant something, I tested them.

### What I tested

Every open-market purchase by an officer or director filed from January 2023 to December 2025: 22,969 purchases after removing stocks with no price history and filings whose price didn't match the ticker. Each was scored with exactly the formula the site used. Returns start at the first close *after the filing*, when the public could actually act, not the insider's own trade date.

The main comparison is against **other insider purchases filed the same month**. That removes the market and the timing, so the only question left is: within insider buys, did a higher score pick the better ones?

### What I found

Six months after the filing, compared with the month's typical insider buy:

| Group | Purchases | Median vs. month | Share that beat the month |
|---|---|---|---|
| All officer/director buys | 22,784 | 0.0% | 50% |
| Top-scored (60+) | 4,091 | −0.3% | 49% |
| Lowest-scored (under 40) | 12,642 | 0.0% | 50% |
| Highest-scored (80+) | 688 | −0.9% | 47% |
| $1M+ purchases | 1,298 | −4.6% | 44% |
| CEO, CFO, President or Chair | 7,790 | −1.2% | 47% |
| Directors only | 11,945 | +0.6% | 51% |
| 3+ insiders buying | 7,903 | +0.2% | 51% |
| Buying alone | 9,997 | −0.3% | 49% |
| Pre-planned (10b5-1) | 764 | −6.9% | 38% |

In plain terms:

- **The score didn't rank buys.** Top-scored purchases did no better than the lowest-scored ones at 1, 3 or 6 months. The very highest scores did slightly worse.
- **The biggest buys did worst.** $1M+ purchases had the lowest median of any group: −4.6%, and only 44% beat the month's typical insider buy.
- **CEO buys did worse than director buys**, the opposite of the usual advice.
- **Several insiders buying, first buys in years, and big stake increases** made no real difference.
- **The one rule that held up:** pre-planned purchases did badly (median −6.9%, 38% beat). Discounting them was right.
- **Cheap stocks are lottery tickets.** Under $5, the median purchase lagged (−2.6%) but the average was +14.7%: most lost, a few soared.

And the bigger question: **did following insider buys beat the market at all?** Not in this period. Against small caps (IWM), the median purchase trailed by 2.8% over six months, and 46% beat it. Against the S&P 500 it was worse, mostly because small caps lagged large caps in 2023–2025.

### What I changed

The site no longer calls high scores "Strong signals." The labels now say what the score actually measures: **Unusual**, **Somewhat unusual**, **Routine**: how out of the ordinary a purchase is for that person, not how it will do. I also removed the line that called group buying "the strongest signal."

### Caveats

- **One three-year period.** Older academic studies found insider buying beat the market, with the effect shrinking over time; a different period could differ.
- **Survivorship.** 654 stocks had no price history, mostly delisted companies. Delistings usually mean losses, so the true results are probably a little worse, not better.
- **Overlapping purchases.** Many buys overlap in time and cluster in the same stocks, so the statistical confidence is lower than the raw sample size suggests.
- **This tests one formula.** It's possible a different combination of factors works; I haven't tested any reweighted version out of sample, and I'm not going to claim one does until I have.

Form4 is free, has no ads and no accounts. The filings are still interesting to read; I just no longer think a score tells you which ones to follow.

---

## Before posting

- **Read it as yourself.** It's written in your voice ("I"); change anything that doesn't sound like you.
- **Price data source.** Returns were computed from Yahoo daily closes. The post publishes only aggregate statistics, not prices, which I believe is fine, but I'm not a lawyer.
- **Where to host it.** Posting the full text as a page on the site (for example `/research/insider-buys`) and linking that from HN/Reddit sends readers to the site itself; a Reddit text post keeps them on Reddit. Reddit often removes posts that are just a link to your own site, so there: post the findings as text, with the site mentioned once.
- **Wait for the insider-data fix** (round 33) to be live before posting, so visitors see the corrected numbers.
