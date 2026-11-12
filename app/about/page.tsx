import Link from "next/link";

export const metadata = { title: "About, methodology & privacy", description: "Where Arkanum's data comes from, how fresh it is, how the labels and research work, how to reach us, and what it does (and doesn't) keep about you.", alternates: { canonical: "/about" } };

export default function About() {
  return (
    <div className="stack prose">
      <section className="card">
        <h1>About Arkanum</h1>
        <p>Arkanum Data shows insider and Congress trades with the evidence: every trade from SEC and House filings, linked to the source, next to how trades like it have actually performed. We test our own labels and publish the results, including when they don&apos;t work. Alongside: what big funds and companies hold, what companies announce, and how their businesses are doing. No account, no ads.</p>
        <p className="muted">What insiders do with their own company&apos;s stock is public, in filings like Form 4, which executives, directors and major shareholders must submit within two business days of trading. Arkanum Data is an independent site and isn&apos;t affiliated with the SEC.</p>
      </section>

      <section className="card" id="principles">
        <h2>What Arkanum stands on</h2>
        <ul>
          <li><strong>Credibility at the source.</strong> Every trade comes from an official filing (SEC Form 4, 13F, 13D/13G, 8-K, and House STOCK Act reports) and links to it, so any row can be checked against the original. Where a filing is unclear we say so; we don&apos;t fill gaps with guesses.</li>
          <li><strong>Transparency.</strong> How every number is made is written down in the <Link href="/research/methodology">methodology</Link>: which trades are counted, how prices are checked, how ranges are worked out, and what isn&apos;t tested. The data files are <Link href="/open-data">open</Link>.</li>
          <li><strong>Evidence, including when it goes against us.</strong> Our labels are tested on years of filings and retested every month on new ones, and the results stay up when a label doesn&apos;t work. A trade is shown as reported, unusual, or a tested signal, and nothing is called a signal until it has earned it. See the <Link href="/research">research</Link> and the <Link href="/research/report-card">report card</Link>.</li>
        </ul>
        <p className="muted small">Arkanum is independent: no ads, no paid placements, no accounts, and no tips. It doesn&apos;t sell trading signals, so it has no reason to make them look better than they are.</p>
      </section>

      <section className="card">
        <h2>Not investment advice</h2>
        <p>Everything here is for information and education only. It is not a recommendation to buy or sell any security, and nothing on Arkanum considers your personal situation. Data can be delayed, incomplete or wrong. Do your own research and consider a licensed adviser before making investment decisions. Arkanum is provided as is, without warranty of any kind.</p>
      </section>

      <section className="card" id="data">
        <h2>Where the data comes from</h2>
        <ul>
          <li><strong>Stock price charts and the Markets quotes (S&amp;P 500, Nasdaq 100, bitcoin, gold, 10-year yield):</strong> embedded from <a href="https://www.tradingview.com/" target="_blank" rel="noopener nofollow">TradingView</a>; stock prices are delayed 15 minutes. Exchanges and index owners license these prices for display, so Arkanum shows them only through TradingView.</li>
          <li><strong>10-year Treasury yield on the Markets page:</strong> the Federal Reserve&apos;s H.15 release (public domain), downloaded from <a href="https://fred.stlouisfed.org/series/DGS10" target="_blank" rel="noreferrer">FRED</a>, Federal Reserve Bank of St. Louis.</li>
          <li><strong>Bitcoin and gold on the Markets page:</strong> <a href="https://www.coingecko.com/" target="_blank" rel="noreferrer">Powered by CoinGecko</a>. Gold there is the price of the PAX Gold token, which is backed by one ounce of gold each and trades within about 1% of the spot price.</li>
          <li><strong>Insider trades, big-fund holdings (13F), company announcements (8-K) and fundamentals:</strong> <a href="https://www.sec.gov/edgar" target="_blank" rel="noreferrer">SEC EDGAR</a> (public domain). Insider trades update every two hours on weekdays from about 7 AM to 11 PM Eastern; everything else after 4 PM Eastern. 13F filings are due 45 days after each quarter, so fund positions are 6–20 weeks old.</li>
          <li><strong>Congress trades:</strong> members&apos; STOCK Act periodic transaction reports from the <a href="https://disclosures-clerk.house.gov/" target="_blank" rel="noreferrer">U.S. House Clerk</a> (public domain), read each weekday evening. Amounts are the ranges members report; dollar rankings use each range&apos;s midpoint and are marked as estimates. Scanned paper filings can&apos;t be read, and the Senate&apos;s site blocks automated access, so the Senate isn&apos;t included.</li>
          <li><strong>Returns after trades</strong> (insider pages, Congress pages, the homepage lists): daily closes adjusted for splits and dividends, used only to compute the returns shown; no prices are published. A stock whose price history doesn&apos;t match the trade (a ticker reused after a merger or delisting) gets no return rather than a wrong one.</li>
          <li><strong>Big US economic releases</strong> (Fed decisions, GDP, PCE inflation, and with a FRED key the jobs report and CPI): the Bureau of Economic Analysis and the Federal Reserve (public domain).</li>
          <li><strong>Company stakes:</strong> companies&apos; own SEC filings (13F holdings reports and Schedule 13D/13G 5%+ ownership filings). <strong>Private investments</strong> come from press releases on PR Newswire and Business Wire, picked out automatically and not verified; each links to its release.</li>
          <li><strong>Ticker lookups for fund holdings:</strong> <a href="https://www.openfigi.com/" target="_blank" rel="noreferrer">OpenFIGI</a>.</li>
        </ul>
      </section>

      <section className="card" id="methodology">
        <h2>How the labels and research work</h2>
        <ul>
          <li><strong>Insider Activity Score</strong> (Unusual, Somewhat unusual, Routine, 0–100) is Arkanum&apos;s estimate of how out of the ordinary a purchase is, from what each filing says: the insider&apos;s role, how much the buy grew their stake, how long since they last bought, how many insiders are buying, and the size. Pre-planned trades and token amounts score low. It describes the trade, not the outlook: in <Link href="/research/insider-buys">our test of 2023–2025 purchases</Link>, the most unusual buys did no better than routine ones.</li>
          <li><strong>Large unplanned sale</strong> marks a sale outside a pre-set trading plan by a CEO, CFO, President or Chair of a quarter of their stake or $1M+, or anyone selling half or more. It too describes, not predicts: see <Link href="/research/insider-sales">the sales paper</Link>.</li>
          <li><strong>Trades like this</strong> under a buy or sale is the research result for its group: the six-month median return against other insider trades filed the same month, how many did better or worse, and the figure for trades filed since January 2026.</li>
          <li><strong>The research</strong> tests every open-market buy and sale by officers and directors in SEC&apos;s insider data sets, from the first close after each filing, against same-month insider trades, small-company stocks and the S&amp;P 500. It is rerun every month on new filings; the <Link href="/research/report-card">report card</Link> shows whether each label still holds.</li>
        </ul>
      </section>

      <section className="card" id="freshness">
        <h2>How fresh the data is</h2>
        <ul>
          <li><strong>Insider trades:</strong> insiders must file within two business days of trading; Arkanum reads new filings every two hours on weekdays, from about 7 AM to 11 PM Eastern.</li>
          <li><strong>Congress trades:</strong> members have up to 45 days to report (the median is shown on the Congress page); Arkanum reads new reports each weekday evening.</li>
          <li><strong>Big funds (13F):</strong> due 45 days after each quarter, so positions are 6–20 weeks old when they appear.</li>
          <li><strong>Company holdings and announcements:</strong> read each weekday; fundamentals after 4 PM Eastern.</li>
          <li><strong>Prices:</strong> stock charts are delayed 15 minutes; returns use the latest daily close.</li>
        </ul>
        <p>All the data the site shows is also published as plain files anyone can use: see <Link href="/open-data">open data</Link>.</p>
      </section>

      <section className="card" id="contact">
        <h2>Contact</h2>
        <p>Found a wrong number, a bug, or have a question? Email <a href="mailto:aripovmaxim@gmail.com">aripovmaxim@gmail.com</a>.</p>
      </section>

      <section className="card" id="privacy">
        <h2>Privacy</h2>
        <ul>
          <li><strong>No accounts.</strong> We never ask for your name, email or phone number.</li>
          <li><strong>Your watchlist and the people you follow</strong> are stored in your browser on your device.</li>
          <li><strong>If you turn on notifications,</strong> we store a random device ID, your browser&apos;s push address, your watchlist and the people you follow (SEC IDs of insiders, names of House members), only to send your digest and alerts. Turning notifications off deletes them; devices that haven&apos;t opened Arkanum in about 4 months are deleted automatically.</li>
          <li><strong>Stock charts and index quotes</strong> load from TradingView, which receives your IP address and the symbol you view (it sets no cookies, per its documentation). Our host, Vercel, keeps standard server logs.</li>
          <li><strong>Visitor counts:</strong> we use Vercel Web Analytics to count page views. It sets no cookies and doesn&apos;t track you across sites or days; visitors are counted with a hash that resets daily.</li>
          <li>We don&apos;t sell or share any data, and there are no ads or cross-site trackers.</li>
        </ul>
      </section>
      <p className="small muted"><Link href="/terms">Terms of use</Link> · <Link href="/">← Home</Link></p>
    </div>
  );
}
