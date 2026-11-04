# What the backtest says (2026-11-04)

Run: officer/director open-market buys filed 2023-01 to 2025-12, 22,969 kept after dropping
stocks without prices and buys whose ticker didn't match the filing price. Full tables in
[results.md](results.md). Numbers below are 6-month returns unless noted; "same month" means
versus the median insider buy filed that month, which removes market and timing so it tests
only whether the score ranks buys.

## Verdict: the current score does not pick better buys

- **Strong vs Routine, same month:** median −0.3% vs 0.0%, beat rate 49% vs 50%. No edge at
  1, 3 or 6 months.
- **Score buckets aren't monotonic.** 40–69 did best; **80+ did worst** (median −0.9%, 47% beat
  the month's median; versus small caps −6.3% median).
- **The factors the score rewards most did worse:**
  - $1M+ buys (+10 points today): median −4.6%, 44% beat (worst group).
  - Top executives (+30 vs +14 for directors): median −1.2%, 47%; directors +0.6%, 51%.
  - 3+ insiders buying (+15): no clear difference (+0.2% median, but lower mean than buying alone).
  - "First buy in 2+ years" (+18) and "Stake +50%" (up to +30): no difference.
- **What does hold up:**
  - Pre-planned buys are bad (median −6.9%, 38% beat). The score already subtracts 25.
  - Stocks under $5: median −2.6% and 47% beat, but a mean of +14.7% — lottery tickets: most
    lose, a few soar. Over $5: median +0.4%, 51%.
- **Insider buying overall** versus small caps (IWM): mean +1.7%, median −2.8% at 6 months;
  for stocks over $5, mean −1.1%, median −2.2%. In this period, following insider buys did not
  beat small caps. (Versus SPY everything looks worse because small caps lagged the S&P 500.)

## Caveats

- One period (2023–2025); results in older research found insider buys beat the market, with the
  effect shrinking over time. A different period could differ.
- Survivorship: 654 stocks with no price history were dropped; most delisted, which usually
  means losses, so true results are likely a little worse, not better.
- t-statistics overstate confidence (buys overlap in time and cluster in stocks).
- Prices are Yahoo's; used only for these statistics.
