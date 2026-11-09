import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Nav, TabBar } from "@/components/Nav";
import { Ticker } from "@/components/Ticker";
import { Welcome } from "@/components/Welcome";
import { Analytics } from "@vercel/analytics/next";
import { ServiceWorker } from "@/components/ServiceWorker";
import { THEME_KEY, THEME_COLORS } from "@/lib/theme";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], display: "swap", variable: "--font-mono" });

const DESCRIPTION = "Insider and Congress stock trades from official SEC and House filings, next to tested evidence of how trades like them have actually done. Free, no account.";
const OG_TITLE = "Arkanum Data: insider trades, tested";
export const metadata: Metadata = {
  metadataBase: new URL("https://arkanumdata.vercel.app"),
  title: { default: "Arkanum Data: insider and Congress trades, tested", template: "%s · Arkanum Data" },
  description: DESCRIPTION,
  openGraph: { type: "website", siteName: "Arkanum Data", title: OG_TITLE, description: DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", title: OG_TITLE, description: DESCRIPTION },
  appleWebApp: { capable: true, title: "Arkanum", statusBarStyle: "black-translucent" },
  // Lets feed readers find the RSS feeds (pages that set their own canonical link drop this).
  alternates: { types: { "application/rss+xml": [{ url: "/feeds/insider-buys.xml", title: "Arkanum Data: unusual insider buys" }, { url: "/feeds/congress.xml", title: "Arkanum Data: Congress stock trades" }] } },
};
export const viewport: Viewport = { themeColor: THEME_COLORS.dark, width: "device-width", initialScale: 1, viewportFit: "cover" };

// Tells search engines what the site is (schema.org): the site's name for brand searches, and
// the organization behind it. No social profiles yet; add them under sameAs when they exist.
const SITE = "https://arkanumdata.vercel.app";
const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: "Arkanum Data", alternateName: "Arkanum", description: DESCRIPTION, inLanguage: "en-US", publisher: { "@id": `${SITE}/#org` } },
    { "@type": "Organization", "@id": `${SITE}/#org`, name: "Arkanum Data", url: SITE, logo: `${SITE}/icon-512.png`,
      description: "Arkanum Data is a free website that shows insider and House members' stock trades from official SEC and House filings, and tests how trades like them have actually done." },
  ],
}).replace(/</g, "\\u003c");

// Applies a saved light-mode choice before the first paint, so dark-mode visitors and
// light-mode visitors both see their theme immediately (dark is the default).
const THEME_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(THEME_KEY)})==="light"){document.documentElement.dataset.theme="light";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",${JSON.stringify(THEME_COLORS.light)})}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} /></head>
      <body>
        <ServiceWorker />
        <Welcome />
        <Analytics />
        <Nav />
        <Ticker />
        <main>{children}</main>
        <footer className="site-footer">
          <div className="foot-top">
            <Link href="/" className="foot-brand"><LogoMark size={20} /><span>Arkanum Data</span></Link>
            <nav className="foot-links" aria-label="About this site">
              <Link href="/about">About</Link>
              <Link href="/about#methodology">Methodology</Link>
              <Link href="/open-data">Open data</Link>
              <Link href="/about#privacy">Privacy</Link>
              <Link href="/research">Research</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/briefing/archive">Past digests</Link>
              <Link href="/about#contact">Contact</Link>
            </nav>
          </div>
          <p className="foot-legal">Not investment advice. Filings and fundamentals from SEC EDGAR. Market quotes and stock charts by TradingView (stocks delayed 15 minutes). Bitcoin, gold and Treasury figures from the Federal Reserve (FRED) and CoinGecko.</p>
          <p className="foot-copy">&copy; {new Date().getFullYear()} Arkanum Data. All rights reserved. Independent; not affiliated with the SEC.</p>
        </footer>
        <TabBar />
      </body>
    </html>
  );
}
