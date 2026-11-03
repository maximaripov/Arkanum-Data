import Link from "next/link";
import type { Metadata, Viewport } from "next";
import { Nav } from "@/components/Nav";
import { Welcome } from "@/components/Welcome";
import { Analytics } from "@vercel/analytics/next";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

const DESCRIPTION = "See what company insiders and big funds are buying, in plain English, from official SEC filings. Free, no account.";
export const metadata: Metadata = {
  metadataBase: new URL("https://form4-insiders.vercel.app"),
  title: { default: "Form4: what insiders are buying", template: "%s · Form4" },
  description: DESCRIPTION,
  openGraph: { type: "website", siteName: "Form4", title: "Form4: what insiders are buying", description: DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", title: "Form4: what insiders are buying", description: DESCRIPTION },
  appleWebApp: { capable: true, title: "Form4", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { themeColor: "#0b0e14", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ServiceWorker />
        <Welcome />
        <Analytics />
        <Nav />
        <main>{children}</main>
        <footer className="muted small">
          Not investment advice. Filings and fundamentals from SEC EDGAR; Market quotes and stock charts by TradingView (stocks delayed 15 min). Digest market figures from the Federal Reserve via FRED and CoinGecko. <Link href="/about">About, data &amp; privacy</Link> · <Link href="/terms">Terms</Link>
        </footer>
      </body>
    </html>
  );
}
