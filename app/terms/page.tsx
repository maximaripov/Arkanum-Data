import Link from "next/link";

export const metadata = { title: "Terms of use", description: "The terms for using Arkanum, a free market tracker.", alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <div className="stack prose">
      <section className="card">
        <h1>Terms of use</h1>
        <p className="muted small">Last updated November 5, 2026</p>
        <p>Arkanum Data is a free website that shows public market information in plain English. By using it, you agree to these terms. If you don&apos;t agree, please don&apos;t use the site.</p>
      </section>

      <section className="card">
        <h2>Not investment advice</h2>
        <p>Everything on Arkanum is for information and education only. Nothing here is a recommendation to buy, sell or hold any security, and nothing takes your personal situation into account. You are responsible for your own investment decisions. Consider talking to a licensed financial adviser.</p>
      </section>

      <section className="card">
        <h2>The data can be wrong or late</h2>
        <p>Arkanum collects information from public sources such as SEC filings, the House Clerk, the Federal Reserve, CoinGecko and TradingView (see <Link href="/about">About</Link> for the full list). Prices are delayed, filings can be misread, and any source can contain errors or stop working. Arkanum is provided &quot;as is&quot;, without warranties of any kind, including accuracy, completeness or availability. To the fullest extent the law allows, Arkanum and its creator are not liable for any loss arising from your use of the site or reliance on its information.</p>
      </section>

      <section className="card">
        <h2>Third-party data and widgets</h2>
        <p>Some data and charts come from other companies and remain theirs, under their own terms. Charts and quotes are provided by TradingView; crypto and gold figures are powered by CoinGecko. Don&apos;t copy or resell that data from Arkanum.</p>
      </section>

      <section className="card">
        <h2>Fair use of the site</h2>
        <ul>
          <li>Use Arkanum for your own personal, non-commercial purposes.</li>
          <li>Don&apos;t scrape it, overload it with automated requests, or try to break into or disrupt it.</li>
          <li>Don&apos;t use it for anything unlawful.</li>
        </ul>
      </section>

      <section className="card">
        <h2>Notifications and your data</h2>
        <p>Arkanum has no accounts. If you turn on notifications, we keep only what&apos;s needed to send them, as described in the privacy section on the <Link href="/about">About</Link> page. You can turn notifications off at any time from the Digest page, which deletes that information.</p>
      </section>

      <section className="card">
        <h2>Changes</h2>
        <p>Arkanum may change, pause or stop any feature at any time, and these terms may be updated. The date at the top shows the latest version; continuing to use the site means you accept it.</p>
      </section>
      <p className="small muted"><Link href="/">← Back to Markets</Link></p>
    </div>
  );
}
