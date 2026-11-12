// The 404 page: unknown addresses, and stock, insider, member, digest or paper pages that
// don't exist (notFound()). Next adds noindex itself. Most visitors land here from a mistyped
// ticker or an old link, so it points them to search and the main sections.
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page doesn't exist on Arkanum Data. Search for a stock, insider, House member or fund, or start from the research.",
};

export default function NotFound() {
  return (
    <section className="card">
      <h1>404: page not found</h1>
      <p>There&apos;s nothing at this address. If you were looking for a stock, an insider or a House member, use the search at the top of the page. Every company listed with the SEC has a stock page; a ticker that isn&apos;t one lands here.</p>
      <ul>
        <li><Link href="/">Insider trades</Link>: this month&apos;s purchases and large sales by company insiders</li>
        <li><Link href="/congress">Congress trades</Link>: stock trades disclosed by House members</li>
        <li><Link href="/research">Research</Link>: what we tested and what held up</li>
        <li><Link href="/briefing">Digest</Link>: the latest daily summary</li>
      </ul>
    </section>
  );
}
