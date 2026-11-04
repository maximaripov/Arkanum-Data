# Signal backtest (owner-only)

Generated 2026-11-04. Officer and director open-market purchases filed 2023-01-01 to the end of 2025Q4, scored with the site's `conviction()`; returns from the first close after the filing date, minus SPY over the same days. History for "first buy in N years" from 2020-01-01.

31380 buys scored; 26625 had prices (659 of 3767 stocks had none, mostly delisted or renamed: survivorship bias, see notes).

Excess return = stock − SPY. Mean is winsorized at 1%/99%; t is mean ÷ standard error and overstates confidence because buys overlap in time.

| Group | 1 month: n · mean · median · beat SPY · t | 3 months: n · mean · median · beat SPY · t | 6 months: n · mean · median · beat SPY · t |
|---|---|---|---|
| All officer/director buys | 26256 · -0.3% · -1.5% · 43% · -3.5 | 26218 · -1.3% · -3.4% · 41% · -7.7 | 26094 · -2.5% · -6.8% · 39% · -9.2 |
| Strong (60+) | 4759 · +0.1% · -1.1% · 46% · 0.5 | 4756 · -1.4% · -3.4% · 42% · -3.2 | 4723 · -3.4% · -7.9% · 40% · -5.2 |
| Notable (40–59) | 7002 · -0.0% · -1.3% · 44% · -0.0 | 6996 · -0.7% · -3.4% · 41% · -2.0 | 6974 · -2.0% · -6.6% · 40% · -3.6 |
| Routine (<40) | 14495 · -0.6% · -1.7% · 42% · -5.0 | 14466 · -1.5% · -3.4% · 41% · -6.9 | 14397 · -2.5% · -6.6% · 39% · -7.3 |
| Score 80+ | 825 · +0.5% · -0.7% · 47% · 0.7 | 824 · -0.0% · -3.7% · 41% · -0.0 | 812 · -3.8% · -8.8% · 40% · -2.3 |
| Score 70–79 | 1623 · -0.2% · -1.1% · 45% · -0.4 | 1621 · -2.7% · -3.3% · 42% · -3.7 | 1610 · -4.7% · -8.9% · 39% · -4.2 |
| Score 60–69 | 2311 · +0.0% · -1.1% · 46% · 0.1 | 2311 · -1.3% · -3.4% · 43% · -2.2 | 2301 · -2.2% · -7.1% · 41% · -2.4 |
| Score 40–59 | 7002 · -0.0% · -1.3% · 44% · -0.0 | 6996 · -0.7% · -3.4% · 41% · -2.0 | 6974 · -2.0% · -6.6% · 40% · -3.6 |
| Score 20–39 | 12239 · -0.8% · -1.7% · 42% · -5.5 | 12219 · -1.8% · -3.5% · 40% · -7.6 | 12156 · -3.0% · -6.4% · 39% · -8.1 |
| Score <20 | 2256 · +0.1% · -1.5% · 44% · 0.5 | 2247 · +0.0% · -2.9% · 43% · 0.0 | 2241 · +0.7% · -6.9% · 40% · 0.6 |
| Top executive (CEO/CFO/President/Chair) | 9049 · -0.3% · -1.6% · 43% · -1.4 | 9047 · -1.6% · -4.2% · 40% · -5.0 | 9013 · -3.9% · -8.9% · 37% · -8.0 |
| Other officer | 3551 · +0.4% · -1.0% · 45% · 1.4 | 3550 · -1.3% · -3.4% · 40% · -2.9 | 3521 · -0.7% · -6.6% · 39% · -0.9 |
| Director only | 13656 · -0.6% · -1.5% · 43% · -4.6 | 13621 · -1.1% · -3.0% · 43% · -4.8 | 13560 · -2.0% · -5.4% · 41% · -5.8 |
| First buy in 2+ years | 8836 · -0.4% · -1.3% · 45% · -2.2 | 8825 · -1.4% · -3.5% · 41% · -4.4 | 8761 · -2.8% · -6.9% · 40% · -5.8 |
| Not a first buy | 15402 · -0.5% · -1.6% · 42% · -4.4 | 15378 · -1.5% · -3.3% · 41% · -6.9 | 15322 · -2.6% · -6.8% · 39% · -7.8 |
| Stake +50% or more | 5186 · +0.0% · -1.5% · 44% · 0.1 | 5179 · -1.5% · -3.9% · 41% · -3.2 | 5147 · -3.9% · -8.6% · 37% · -5.4 |
| 2+ insiders buying | 14653 · -0.4% · -1.4% · 44% · -3.2 | 14650 · -1.2% · -3.1% · 42% · -5.6 | 14560 · -2.6% · -6.3% · 40% · -7.5 |
| 3+ insiders buying | 9034 · -0.7% · -1.5% · 44% · -4.5 | 9034 · -2.1% · -3.0% · 42% · -7.9 | 8978 · -3.8% · -6.0% · 40% · -9.7 |
| Alone | 11603 · -0.2% · -1.6% · 42% · -1.6 | 11568 · -1.4% · -3.9% · 40% · -5.3 | 11534 · -2.4% · -7.2% · 38% · -5.6 |
| Value $1M+ | 1514 · -1.1% · -1.9% · 42% · -2.7 | 1511 · -2.8% · -5.3% · 39% · -4.0 | 1507 · -5.8% · -11.5% · 36% · -5.4 |
| Value $100K–1M | 5749 · -0.2% · -1.4% · 44% · -0.9 | 5741 · -1.5% · -3.7% · 41% · -3.9 | 5712 · -2.9% · -7.7% · 39% · -5.1 |
| Value under $100K | 18993 · -0.3% · -1.5% · 43% · -2.8 | 18966 · -1.2% · -3.3% · 42% · -5.8 | 18875 · -2.1% · -6.3% · 40% · -6.4 |
| Pre-planned | 982 · +0.1% · -1.0% · 46% · 0.3 | 982 · +2.6% · -3.3% · 43% · 1.9 | 981 · -1.9% · -12.2% · 36% · -1.0 |
| Strong, price $5+ | 3843 · -0.8% · -1.1% · 45% · -3.7 | 3843 · -3.1% · -3.3% · 42% · -8.1 | 3820 · -6.4% · -7.6% · 40% · -11.2 |
| Routine, price $5+ | 9851 · -1.4% · -1.6% · 42% · -12.2 | 9833 · -3.3% · -3.2% · 40% · -16.4 | 9806 · -6.1% · -6.0% · 38% · -20.3 |

## Notes
- Prices: Yahoo daily adjusted closes, used only to compute these numbers (not published). Stocks with no price history are dropped, which favors survivors.
- Entry is the first close after the filing date (when the public could act), not the trade date.
- One event per filing and insider; several fills are combined. 10% owners who aren't officers or directors are excluded, as on the site.
- "First buy" uses only the history in this data set (2020q1 on), capped at 5 years, like the site's own lookback.
- Skipped quarters (not yet published): none.
