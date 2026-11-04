import Link from "next/link";
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

const DESCRIPTION = "See what company insiders and big funds are buying, in plain English, from official SEC filings. Free, no account.";
export const metadata: Metadata = {
  metadataBase: new URL("https://form4-insiders.vercel.app"),
  title: { default: "Form4: what insiders are buying", template: "%s · Form4" },
  description: DESCRIPTION,
  openGraph: { type: "website", siteName: "Form4", title: "Form4: what insiders are buying", description: DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", title: "Form4: what insiders are buying", description: DESCRIPTION },
  appleWebApp: { capable: true, title: "Form4", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { themeColor: THEME_COLORS.dark, width: "device-width", initialScale: 1, viewportFit: "cover" };

// Applies a saved light-mode choice before the first paint, so dark-mode visitors and
// light-mode visitors both see their theme immediately (dark is the default).
const THEME_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(THEME_KEY)})==="light"){document.documentElement.dataset.theme="light";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",${JSON.stringify(THEME_COLORS.light)})}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body>
        <ServiceWorker />
        <Welcome />
        <Analytics />
        <Nav />
        <Ticker />
        <main>{children}</main>
        <footer className="muted small">
          Not investment advice. Filings and fundamentals from SEC EDGAR; Market quotes and stock charts by TradingView (stocks delayed 15 min). Digest market figures from the Federal Reserve via FRED and CoinGecko. <Link href="/about">About, data &amp; privacy</Link> · <Link href="/terms">Terms</Link>
        </footer>
        <TabBar />
      </body>
    </html>
  );
}
