# Posts to paste (the owner posts these; nothing is posted automatically)

Post only after the insider-data rebuild (round 33) is live. Numbers are from [results.md](results.md). Edit anything that doesn't sound like you.

## Hacker News

Post as **Show HN** (the site is the thing you made), link to `https://form4-insiders.vercel.app`, then immediately add the first comment below. Stay around for the first 1-2 hours to answer questions.

**Title (80 characters max):**

Show HN: Form4 – SEC insider and Congress stock trades in plain English

**First comment:**

I built Form4 to read SEC Form 4 filings (executives and directors buying or selling their own company's stock) and House members' STOCK Act reports, and show them in plain English. It's free, no ads, no accounts. Data jobs run on GitHub Actions; the site is Next.js on Vercel.

Like most insider sites, it scored each purchase with the usual rules: CEO buys count more, bigger buys count more, first buy in years, several insiders buying at once. Before claiming that meant anything, I backtested it on 22,969 officer and director purchases filed 2023-2025, comparing each against other insider buys filed the same month.

The score didn't pick better buys. Six months out, top-scored purchases did no better than the lowest-scored (median -0.3% vs 0.0% against the month's typical buy). $1M+ purchases did worst (median -4.6%, 44% beat the month). CEO buys did worse than director buys. The one rule that held up: pre-planned 10b5-1 purchases did badly (median -6.9%). Overall, following insider buys trailed small caps in this period.

So I renamed the labels from "Strong signal" to "Unusual": the score now says how out of the ordinary a buy is, not how it will do. Caveats: one three-year period, survivorship bias from delisted stocks, overlapping trades. Happy to answer questions about the method or the SEC data.

## Reddit (r/stocks or r/investing; read each subreddit's self-promotion rules first)

Post as a **text post**, not a link. One subreddit at a time, a few days apart.

**Title:**

I tested the usual insider-buying rules on 23,000 purchases from 2023-2025. Most of them didn't work.

**Body:**

Insider-buying sites (mine included) rank purchases with the same rules of thumb: CEO buys matter more than director buys, bigger buys matter more, a first buy in years is a strong sign, several insiders buying at once is the strongest sign.

I tested those rules on 22,969 open-market purchases by officers and directors filed from 2023 to 2025. Each buy was compared with other insider buys filed the same month, so the market's ups and downs cancel out. Returns start the day after the filing, when the public could actually act.

Six months later:

- Top-ranked buys did no better than bottom-ranked ones (median -0.3% vs 0.0% against the month's typical insider buy).
- $1M+ purchases did worst of any group: median -4.6%, only 44% beat the month's typical buy.
- CEO/CFO buys did worse than director buys (-1.2% vs +0.6%).
- Several insiders buying, first buys in years, and big stake increases made no real difference.
- The one rule that held up: pre-planned (10b5-1) purchases did badly (median -6.9%, 38% beat).
- Under-$5 stocks were lottery tickets: median -2.6%, but the average was +14.7% because a few soared.

And overall, the median insider buy trailed small caps (IWM) by 2.8% over six months in this period.

Caveats: one three-year period (older studies found insider buying did beat the market, with the edge shrinking over time), delisted stocks dropped (so real results are probably a bit worse), and many buys overlap in time.

I run a free site that tracks these filings (Form4, no ads or accounts) and changed its labels from "Strong signal" to "Unusual" because of this. Happy to share more of the numbers.

## Bluesky (thread; 300 characters per post)

1/ I scored 23,000 insider stock purchases from 2023-2025 with the usual rules: CEO buys count more, big buys count more, first buy in years, several insiders buying. Then I checked how they did. The rules didn't pick better buys.

2/ Six months out, top-ranked buys did no better than bottom-ranked ones. $1M+ buys did worst (median -4.6% vs other insider buys that month). CEO buys trailed director buys.

3/ One rule held up: pre-planned 10b5-1 purchases did badly (median -6.9%). And overall, the median insider buy trailed small caps by 2.8% over six months.

4/ So my free tracker, Form4, now labels buys "Unusual" instead of "Strong signal": how out of the ordinary a buy is, not how it'll do. form4-insiders.vercel.app

## X (thread; 280 characters per post)

1/ I tested the usual insider-buying rules on 23,000 purchases from 2023-2025: CEO buys, big buys, first buy in years, several insiders at once. None of them picked better buys.

2/ Six months out, top-ranked buys did no better than bottom-ranked. $1M+ buys did worst: median -4.6% vs the month's other insider buys. CEO buys trailed director buys.

3/ One rule held up: pre-planned 10b5-1 buys did badly (median -6.9%). Overall, the median insider buy trailed small caps by 2.8% over six months.

4/ So my free tracker now labels buys "Unusual," not "Strong signal": how out of the ordinary a buy is, not how it'll do. form4-insiders.vercel.app
