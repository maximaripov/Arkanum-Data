import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Economic calendar",
  description: "Upcoming US economic releases and Fed meetings, explained in plain English.",
  openGraph: { title: "Economic calendar · Form4", description: "Upcoming US economic releases and Fed meetings, explained in plain English.", url: "/calendar" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
