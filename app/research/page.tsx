// The research index: what we found in plain words first (with the numbers, from the same
// results as the papers), then how we test, then the working papers.
import Link from "next/link";
import type { Metadata } from "next";
import { oosState } from "./insider-sales/paper";
import { findings } from "@/lib/findings";
import { OOS, SALES, SALES_OOS, SAMPLE } from "@/lib/research";
import { TITLE as HOUSE_TITLE } from "./house-trades/paper";

const PAPERS = [
  { no: 4, href: "/research/house-trades", title: HOUSE_TITLE, date: "November 2026",
    summary: "Stock trades disclosed by members of the U.S. House, measured from the day each became public and from the member's own trade date: what they bought did no better than what they sold." },
  { no: 2, href: "/research/insider-sales", title: "Do insider stock sales predict anything? A test of 89,000 sales", date: "November 2026",
    summary: "Sales by company officers and directors from 2023 to 2025, including the ones Arkanum labels large and unplanned, were followed by the same returns as any other insider sale" + (oosState() === "warns" ? "; sales filed since 2026 are an exception." : ".") },
  { no: 1, href: "/research/insider-buys", title: "Do insider stock purchases beat the market? A test of 25,000 buys", date: "November 2026",
    summary: "How purchases by company officers and directors performed afterwards, whether Arkanum's buy score picked out the better ones, and a monthly check on 2026 filings the score was never tuned on." },
];

export const metadata: Metadata = {
  title: "Research",
  description: "What Arkanum Data found when it tested insider purchases and sales filed with the SEC against what happened next: key findings in plain words, and the working papers.",
  alternates: { canonical: "/research" },
};

export default function Research() {
  const tested = SAMPLE.kept + OOS.kept + SALES.kept + SALES_OOS.kept;
  return (
    <article className="paper">
      <header className="paper-head">
        <p className="paper-series">Arkanum Data Research</p>
        <h1 className="paper-title">What insider trades tell you, tested</h1>
        <p className="paper-authors">{tested.toLocaleString("en-US")} trades by company officers and directors, 2023 to 2026, checked against what the stock did next</p>
      </header>

      <section className="paper-body">
        <h2>Key findings</h2>
        <ol className="findings">
          {findings().map((f) => (
            <li key={f.id}>
              <span className="find-fig mono">{f.figure}</span>
              <div>
                <strong>{f.head}</strong>
                <p>{f.body} <Link href={f.href}>Evidence ›</Link></p>
              </div>
            </li>
          ))}
        </ol>

        <p><Link href="/research/report-card"><strong>Report card ›</strong></Link> Every label on the site, how it did in 2023–2025 and whether that has held on trades filed since, updated monthly.</p>

        <h2>How we test</h2>
        <ul>
          <li><strong>Every trade, not a selection:</strong> all open-market buys and sales by officers and directors in SEC&apos;s insider data sets, with the few whose ticker or price didn&apos;t match left out and counted.</li>
          <li><strong>From when the public could act:</strong> returns start at the first close after the filing became public, and are compared with other insider trades filed the same month, small-company stocks and the S&amp;P 500.</li>
          <li><strong>Our own labels, unchanged:</strong> the buy score and the sale label are tested exactly as the site uses them, and the results stay up even where they don&apos;t work.</li>
          <li><strong>Re-checked every month:</strong> the tests are rerun on trades filed since January 2026, which the labels were never tuned on; a paper&apos;s text is updated only while its conclusions still hold.</li>
        </ul>

        <h2>The papers</h2>
      </section>
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
