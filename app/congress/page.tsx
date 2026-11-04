import type { Metadata } from "next";
import { CongressView } from "@/components/CongressView";

export const metadata: Metadata = {
  title: "Congress stock trades",
  description: "What members of the House are buying and selling, from their STOCK Act reports: latest trades, most-bought stocks and every member's trades.",
  openGraph: { title: "Congress stock trades · Form4", url: "/congress" },
};

export default function Congress() { return <CongressView />; }
