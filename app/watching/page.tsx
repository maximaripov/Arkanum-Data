import type { Metadata } from "next";
import { WatchingView } from "./WatchingView";

export const metadata: Metadata = {
  title: "Watching",
  description: "The stocks, insiders, House members and funds you watch on Arkanum, with what's new since your last visit. Kept on your device; no account.",
  alternates: { canonical: "/watching" },
  robots: { index: false }, // a personal page: nothing for search engines
};

export default function Watching() { return <WatchingView />; }
