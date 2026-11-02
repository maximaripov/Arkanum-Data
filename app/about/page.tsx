import Link from "next/link";

export const metadata = { title: "About, data & privacy · Foresight" };

export default function About() {
  return (
    <div className="stack prose">
      <section className="card">
        <h1>About Foresight</h1>
        <p>Foresight is a free market tracker built around official filings: what company insiders buy and sell, what big funds hold, what companies announce, and how their businesses are doing — in plain English, with charts and prices from TradingView. No account, no ads.</p>
      </section>

      <section className="card">
        <h2>Not investment advice</h2>
        <p>Everything here is for information and education only. It is not a recommendation to buy or sell any security, and nothing on Foresight considers your personal situation. Data can be delayed, incomplete or wrong. Do your own research and consider a licensed adviser before making investment decisions. Foresight is provided as is, without warranty of any kind.</p>
      </section>

      <section className="card">
        <h2>Where the data comes from</h2>
        <ul>
          <li><strong>Prices, charts, headlines, price screener and global economic calendar:</strong> embedded widgets by <a href="https://www.tradingview.com/" target="_blank" rel="noopener nofollow">TradingView</a>. US stock prices are delayed 15 minutes; forex and crypto are real-time.</li>
          <li><strong>Insider trades, big-fund holdings (13F), company announcements (8-K) and fundamentals:</strong> <a href="https://www.sec.gov/edgar" target="_blank" rel="noreferrer">SEC EDGAR</a> (public domain). Updated each weekday after 4 PM Eastern; 13F filings are due 45 days after each quarter, so fund positions are 6–20 weeks old.</li>
          <li><strong>Retail trading volume:</strong> <a href="https://otctransparency.finra.org/" target="_blank" rel="noreferrer">FINRA OTC Transparency data</a>, published with a 2–4 week delay. Shown for personal, non-commercial use; not for redistribution.</li>
          <li><strong>US economic calendar:</strong> the Bureau of Economic Analysis and the Federal Reserve (public domain).</li>
          <li><strong>Ticker lookups for fund holdings:</strong> <a href="https://www.openfigi.com/" target="_blank" rel="noreferrer">OpenFIGI</a>.</li>
        </ul>
      </section>

      <section className="card">
        <h2>Privacy</h2>
        <ul>
          <li><strong>No accounts.</strong> We never ask for your name, email or phone number.</li>
          <li><strong>Your watchlist and saved screens</strong> are stored in your browser on your device.</li>
          <li><strong>If you turn on notifications,</strong> we store a random device ID, your browser&apos;s push address, and your watchlist and saved screens, only to send your daily digest. Turning notifications off deletes them; devices that haven&apos;t opened Foresight in about 4 months are deleted automatically.</li>
          <li><strong>TradingView widgets</strong> load from TradingView, which receives your IP address and the page and symbol you view (it sets no cookies, per its documentation). Our host, Vercel, keeps standard server logs.</li>
          <li>We don&apos;t sell or share any data, and there are no ads or trackers.</li>
        </ul>
      </section>
      <p className="small muted"><Link href="/">← Back to Markets</Link></p>
    </div>
  );
}
