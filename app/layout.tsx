import type { Metadata, Viewport } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Foresight",
  description: "Personal market tracker: live quotes, stock screener and insider trades.",
  appleWebApp: { capable: true, title: "Foresight", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { themeColor: "#0b0e14", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main>{children}</main>
        <footer className="muted small">
          Prices: Yahoo Finance (unofficial, may lag) and Coinbase. Fundamentals and insider filings: SEC EDGAR. Personal use only. Not investment advice.
        </footer>
      </body>
    </html>
  );
}
