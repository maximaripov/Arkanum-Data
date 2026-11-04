import Link from "next/link";

export const metadata = { title: "About, data & privacy", description: "Where Form4's data comes from, and what it does (and doesn't) keep about you." };

export default function About() {
  return (
    <div className="stack prose">
      <section className="card">
        <h1>About Form4</h1>
        <p>Form4 is a free market tracker built around official filings: what company insiders buy and sell, what big funds hold, what companies announce, and how their businesses are doing — in plain English, alongside the major indexes, bitcoin, gold and the 10-year Treasury yield, with stock price charts from TradingView. No account, no ads.</p>
        <p className="muted">The name comes from Form 4, the SEC filing a company&apos;s executives, directors and major shareholders must submit within two business days of trading its stock. Form4 is an independent site and isn&apos;t affiliated with the SEC.</p>
      </section>

      <section className="card">
        <h2>Not investment advice</h2>
        <p>Everything here is for information and education only. It is not a recommendation to buy or sell any security, and nothing on Form4 considers your personal situation. Data can be delayed, incomplete or wrong. Do your own research and consider a licensed adviser before making investment decisions. Form4 is provided as is, without warranty of any kind.</p>
      </section>

      <section className="card">
        <h2>Where the data comes from</h2>
        <ul>
          <li><strong>Stock price charts and the Markets quotes (S&amp;P 500, Nasdaq 100, bitcoin, gold, 10-year yield):</strong> embedded from <a href="https://www.tradingview.com/" target="_blank" rel="noopener nofollow">TradingView</a>; stock prices are delayed 15 minutes. Exchanges and index owners license these prices for display, so Form4 shows them only through TradingView.</li>
          <li><strong>10-year Treasury yield in the daily digest:</strong> the Federal Reserve&apos;s H.15 release (public domain), downloaded from <a href="https://fred.stlouisfed.org/series/DGS10" target="_blank" rel="noreferrer">FRED</a>, Federal Reserve Bank of St. Louis.</li>
          <li><strong>Bitcoin and gold in the daily digest:</strong> <a href="https://www.coingecko.com/" target="_blank" rel="noreferrer">Powered by CoinGecko</a>. Gold there is the price of the PAX Gold token, which is backed by one ounce of gold each and trades within about 1% of the spot price.</li>
          <li><strong>Insider trades, big-fund holdings (13F), company announcements (8-K) and fundamentals:</strong> <a href="https://www.sec.gov/edgar" target="_blank" rel="noreferrer">SEC EDGAR</a> (public domain). Insider trades update hourly on weekdays from about 7 AM to 11 PM Eastern; everything else after 4 PM Eastern. 13F filings are due 45 days after each quarter, so fund positions are 6–20 weeks old.</li>
          <li><strong>Signal labels</strong> (Strong signal, Notable, Routine) are Form4&apos;s own estimate from what each filing says: the insider&apos;s role, how much the buy grew their stake, how long since they last bought, how many insiders are buying, and the size. Pre-planned trades and token amounts score low. A label is not a recommendation.</li>
          <li><strong>Retail trading volume:</strong> <a href="https://otctransparency.finra.org/" target="_blank" rel="noreferrer">FINRA OTC Transparency data</a>, published with a 2–4 week delay. Shown for personal, non-commercial use; not for redistribution.</li>
          <li><strong>Big US economic releases</strong> (GDP, PCE inflation, Fed decisions): the Bureau of Economic Analysis and the Federal Reserve (public domain).</li>
          <li><strong>Ticker lookups for fund holdings:</strong> <a href="https://www.openfigi.com/" target="_blank" rel="noreferrer">OpenFIGI</a>.</li>
        </ul>
      </section>

      <section className="card">
        <h2>Privacy</h2>
        <ul>
          <li><strong>No accounts.</strong> We never ask for your name, email or phone number.</li>
          <li><strong>Your watchlist and saved screens</strong> are stored in your browser on your device.</li>
          <li><strong>If you turn on notifications,</strong> we store a random device ID, your browser&apos;s push address, and your watchlist and saved screens, only to send your daily digest. Turning notifications off deletes them; devices that haven&apos;t opened Form4 in about 4 months are deleted automatically.</li>
          <li><strong>Stock charts and index quotes</strong> load from TradingView, which receives your IP address and the symbol you view (it sets no cookies, per its documentation). Our host, Vercel, keeps standard server logs.</li>
          <li><strong>Visitor counts:</strong> we use Vercel Web Analytics to count page views. It sets no cookies and doesn&apos;t track you across sites or days; visitors are counted with a hash that resets daily.</li>
          <li>We don&apos;t sell or share any data, and there are no ads or cross-site trackers.</li>
        </ul>
      </section>
      <p className="small muted"><Link href="/terms">Terms of use</Link> · <Link href="/">← Back to Markets</Link></p>
    </div>
  );
}
