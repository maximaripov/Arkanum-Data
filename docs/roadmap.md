# Arkanum Data: roadmap from the master development notes

Written 2026-11-12 (round 88) from the owner's notes, sections 1-11. Section 12 (the long-term
network and API) is listed at the end but not scheduled. Each item is checked against the code
as it stands, so "done" means verified in the repo, not assumed.

Order of work: first fix what is wrong or misleading, then what is cheap and visible, then the
big builds. Big builds that change how the site looks get screenshots for approval first
(standing rule).

## Owner's decisions (2026-11-12)

1. Rankings: show track records with a 90% range and a minimum sample; "no clear edge" when the range includes zero; default sort stays by dollars.
2. Backtester: go ahead as planned (every result shows its range and trade count).
3. Tagline: "Follow the money. Test the signal." (no "Invest with evidence").
4. News: breaking news and developments, not "exciting" judgements. Source: the company's own press releases filed with the SEC (8-K exhibit 99.1, same day, public domain, linked to the filing), plus the 8-K items already decoded in `lib/news.ts`. No third-party news feed (same licensing problem as the prices).
5. Exports: CSV only, labelled "opens in Excel".

## Decisions as first proposed

These items in the notes conflict with the site's own research or with earlier decisions. I'll
build them as written unless the owner says otherwise, but the risks are real:

1. **"Rank Congress and insiders by historical performance" (3, 4).** Paper no. 4 found no group
   of House trades clearly beat the market, and most members have a few dozen trades. A ranking by
   past returns will mostly sort luck, and putting it at the top contradicts "We test them".
   Proposal: rank by track record **with a 90% range and a minimum sample**, mark members whose
   range includes zero as "no clear edge", and default the sort to the existing dollar ranking.
2. **Interactive backtester (5).** (a) Letting users try many filters makes it easy to find a
   "winning" rule by chance. Every result should carry its range, its trade count and a note on
   how many rules were tried. (b) It exposes trade-level returns calculated from Yahoo prices,
   which are not cleared for licensing. Fine while the site is free and quiet, but this is the
   feature that raises that exposure most.
3. **Tagline "Invest with evidence" (7).** The evidence on the site says insider buys trailed the
   market. "Invest with evidence" reads as a promise of returns, and edges toward advice.
   Proposal: "Follow the money. Test the signal." and stop there.
4. **"Insider Activity Score" (3).** The score measures how unusual a buy is, and section 5 asks
   the site to keep "unusual" apart from "signal". Done: the score is renamed but its tiers keep
   their names (Unusual / Somewhat unusual / Routine), so the three-way distinction survives.
5. **"Exciting company news" (3).** Anything "exciting" is a judgement Arkanum can't defend.
   Proposal: show dated SEC 8-K events (officer changes, deals, results) next to the trade and let
   the reader judge. Item 5.02 (executive departures and appointments) covers "executive turmoil".
6. **Committees "could affect their trading" (4).** Show the fact (committee, and whether it
   oversees the stock's sector), never imply wrongdoing about a named person.
7. **Excel export (8).** CSV opens in Excel. A real .xlsx needs another library for no gain.
   Proposal: CSV only, labelled "CSV (opens in Excel)".
8. **No accounts stays.** Watchlists and alerts keep living on the device, as today.

## Phase 1: fix and tidy (this round, 88)

| Notes | Item | Status |
|---|---|---|
| 4 | Congress "duplicates": Salazar NVDA, PG; McGuire MU | Investigated, see below; parser fixed |
| 11 | Ticker: "Live" when updated within 4 hours, else the age | Round 88 |
| 3 | Rename "How unusual" to "Insider Activity Score" | Round 88 |
| 7, 9 | Rename Holdings to "Institutional Holdings" | Round 88 |
| 7 | Research in the main navigation | Round 88 |
| 2 | Custom 404 page | Round 88 |
| 2 | Meta title and description on every page | Audit in round 88 |
| 1 | Security audit (all of section 1, grouped below) | Report in `docs/security-audit.md` |
| 1 | Function usage under 0.33 GB-hours a day | Already met since round 85; watch for 14 days |

**Congress findings (round 88).** None of the three cases is an ingestion bug in the sense of a
row read twice:
- **Salazar NVDA and PG** (report 20035778): four separate purchases on 2026-10-23, one in her UBS
  IRA and one in her UBS brokerage account for each stock. They looked identical because the
  parser ignored the report's "Subholding Of" (account) line. Fixed: the account is now read and
  shown.
- **McGuire MU** (report 20035484): three purchases on three dates (Sep 24, Sep 25, Oct 1). These
  were separate trades, so nothing was wrong.
- **Real duplicates do exist elsewhere.** 15 groups of trades appear in two different reports. Some
  are explicit amendments (Timmons SPCX: the second report is marked "Filing Status: Amended"),
  others are a later report re-listing earlier trades (Kean, Taylor, Rouzer, Bresnahan). The parser
  now reads the filing status, and the build keeps one copy per trade (the earliest public filing,
  which is the right start for "since public" returns), recording the later report on it.

## Phase 2: research up front, and the three kinds of trade (round 89, done)

| Notes | Item |
|---|---|
| 5, 10 | "Reported, unusual, signal": one short explainer component used on the homepage, stock, insider, Congress and research pages; every list labels which of the three it shows. Nothing on the site is currently a tested signal, and it should say so. |
| 5, 10 | Methodology page deepened: data sources and provenance per number, the price check, the split fix, the bootstrap ranges, the verdict rule, what we don't test; a changelog of corrections |
| 7 | Homepage: compact hero, value proposition and three use cases above the fold, then a clearly separated dashboard; research navigation strip. Screenshots for approval first |
| 7 | Guided first visit: a dismissable three-step tour (what the data is, what the research says, how to follow) |
| 2 | Accessibility pass: alt text audit, keyboard navigation (focus order, visible focus, skip link, tab widgets), re-run axe on both themes |
| 2 | SEO and GEO: per-page structured data (Dataset on research files, Article on papers), FAQ-style plain answers on research pages that AI search can quote |

## Phase 3: connected stock pages and per-trade analysis (round 90, done)

| Notes | Item |
|---|---|
| 6 | Stock page in three distinct bands: Company fundamentals / What insiders did / What the research says about trades like these |
| 6 | Insider trades and 8-K announcements lined up on the strip under the TradingView chart (an own price chart was dropped: it would display Yahoo prices) |
| 3, 6 | Per-trade analysis panel: conviction (score and reasons), how many insiders bought, financial health (from fundamentals already fetched), comparable past trades and how they did (from the research files, with ranges) |
| 3 | 8-K events next to trades: officer changes (item 5.02) as "executive changes", other material events dated on the chart |
| 3 | Risk notes per trade and per ticker, from facts already held: share price under $5, small market cap, low trading volume, recent reverse split, going-concern or late-filing notices, the research verdict for that kind of trade |
| 3 | More charts: buy and sell value over time per company and per insider |

## Phase 4: Congress intelligence (round 91, done)

| Notes | Item |
|---|---|
| 4 | Sector exposure: each member's estimated buying and selling by sector (sectors.mjs already maps tickers) |
| 4 | Committees: from the public-domain congress-legislators committee files; show the member's committees and flag trades in sectors a committee oversees (fact only) |
| 4 | Overlap: stocks several members bought within the same 30 days |
| 3, 4 | Performance after disclosure per member, with ranges and minimum sample (see decision 1) |

## Phase 5: watchlists, alerts, exports (round 92, done)

| Notes | Item | Today |
|---|---|---|
| 8 | Watch tickers | Exists (watchlist, push) |
| 8 | Watch insiders | Exists (Follow, push) |
| 8 | Watch politicians | Exists (Follow on member pages, push) |
| 8 | Watch funds | **New**: Follow on funds, alert when a new 13F changes a position |
| 8 | One "Watching" page listing all four, with what changed since the last visit |
| 8 | CSV export on the trade tables, member pages and fund holdings (raw filings only, no price-based returns, see decision 2) |
| 9 | Move the 13 hedge funds (today the Insiders page's "Big funds" tab) under Institutional Holdings, next to company holdings, so the renamed section holds all institutional data |
| 9 | More funds: add the most-followed 13F filers (about 15 more), same study pipeline so paper no. 5 refreshes with them |

## Phase 6: strategy backtester (round 93, done; plus saved strategies with alerts)

| Notes | Item |
|---|---|
| 5 | `/research/lab`: filters for CEO only, 3+ insiders, value over $100K, exclude pre-planned, minimum market cap; entry at the first close after filing; median and 90% range at 1, 3 and 6 months vs the S&P 500, trade count, months covered |
| 5 | Compare two rule sets side by side; 2023-25 against 2026 for the same rule |
| 5 | Runs in the browser on a compact trade table built monthly with the research refresh (no new server functions, so no new function usage) |

## Phase 7: competitor audit and brand (round 94, done)

| Notes | Item |
|---|---|
| 10 | Competitor audit of Quiver Quantitative, OpenInsider and the next two or three (Capitol Trades, Unusual Whales, InsiderMonkey): strengths, weaknesses, what Arkanum can do better, as `docs/competitors.md` |
| 10 | Brand pillars written into About and the methodology page: source-level credibility, transparency, evidence |
| (from round 87) | Rebuild the launch kit (`docs/backtest/social-drafts.md`, `writeup-draft.md`): stale name, URL and numbers |

## Section 1 grouped (full detail in `docs/security-audit.md`)

The thirty-odd security lines in the notes collapse into six checks:

1. **Secrets** (browser code, .env, hiding keys, purge git history, rotation, server-side secrets):
   one audit of the client bundle, the deployment, the repo and its full history.
2. **Who can call what** (keys locked to Arkanum, endpoint authorization, IDs in URLs): one
   audit of every route under `app/api`.
3. **Database** (RLS, parameterized queries, database permissions): there is no database. The only
   stored user data is the device file in private Blob storage, covered by check 2.
4. **Abuse** (rate limits, DDoS): Vercel Firewall rules from rounds 77-78, rechecked.
5. **Code and packages** (headers, dependency audit, updates, sessions, attack surface, pen test):
   headers rechecked, `npm audit`, updates, and a hands-on attempt against the live endpoints.
6. **Infrastructure and cost** (SSR, data architecture, usage, performance, 0.33 GB-hours a day):
   measured from the Vercel API.

## Section 12, not scheduled

Research, intelligence and an Arkanum API as a network. Blockers before any API or anything
commercial: the price-data licence (Yahoo, Tiingo personal plan), the ARCANUM trademark question,
and the no-income constraint. SEC and House data themselves are public and free to redistribute.
