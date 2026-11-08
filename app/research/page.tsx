// The research index: Arkanum's working papers, newest first.
import Link from "next/link";
import type { Metadata } from "next";
import { oosWarns } from "./insider-sales/paper";

const PAPERS = [
  { no: 2, href: "/research/insider-sales", title: "Do insider stock sales predict anything? A test of 84,000 sales", date: "November 2026",
    summary: "Sales by company officers and directors from 2023 to 2025, including the ones Arkanum labels notable, were followed by the same returns as any other insider sale" + (oosWarns() ? "; sales filed in 2026 so far are an exception worth watching." : ".") },
  { no: 1, href: "/research/insider-buys", title: "Do insider stock purchases beat the market? A test of 23,000 buys", date: "November 2026",
    summary: "How purchases by company officers and directors performed afterwards, whether Arkanum's buy score picked out the better ones, and a check on 2026 filings the score was never tuned on." },
];

export const metadata: Metadata = {
  title: "Research",
  description: "Arkanum Data's working papers: tests of what insider purchases and sales filed with the SEC were followed by.",
  alternates: { canonical: "/research" },
};

export default function Research() {
  return (
    <article className="paper">
      <header className="paper-head">
        <p className="paper-series">Arkanum Data Research</p>
        <p className="paper-title">Working papers</p>
        <p className="paper-authors">Tests of Arkanum&apos;s own labels against what happened next</p>
      </header>
      <ol className="research-list">
        {PAPERS.map((x) => (
          <li key={x.no}>
            <p className="paper-series">Working paper no. {x.no} · {x.date}</p>
            <Link href={x.href} className="research-title">{x.title}</Link>
            <p>{x.summary}</p>
          </li>
        ))}
      </ol>
    </article>
  );
}
