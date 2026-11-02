import Link from "next/link";
import type { Metadata, Viewport } from "next";
import { Nav } from "@/components/Nav";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Foresight",
  description: "Free market tracker: insider trades, big-fund moves, company filings and fundamentals in plain English, with rates, energy, currencies and crypto.",
  appleWebApp: { capable: true, title: "Foresight", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { themeColor: "#0b0e14", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ServiceWorker />
        <Nav />
        <main>{children}</main>
        <footer className="muted small">
          Not investment advice. Filings and fundamentals from SEC EDGAR; rates and economic data from US government sources via FRED; exchange rates from the ECB; crypto powered by CoinGecko; stock charts by TradingView (delayed 15 min). <Link href="/about">About, data &amp; privacy</Link>
        </footer>
      </body>
    </html>
  );
}
