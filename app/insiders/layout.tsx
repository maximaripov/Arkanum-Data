import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Insider trades and big funds",
  description: "What company executives and directors bought in their own stock in the last 30 days, and what big funds bought last quarter.",
  openGraph: { title: "Insider trades and big funds · Foresight", description: "What company executives and directors bought in their own stock in the last 30 days, and what big funds bought last quarter.", url: "/insiders" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
