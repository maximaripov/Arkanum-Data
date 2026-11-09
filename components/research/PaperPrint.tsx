// A whole working paper on one page, for printing or saving as a PDF: the front matter, every
// page's content in order, and how to cite it. Opened from "Download PDF" on each paper page.
import Link from "next/link";
import { PrintButton } from "./PrintButton";
import type { PaperPage } from "./Paper";

export function PaperPrint({ base, title, date, no, pages, bodies, updated }: {
  base: string; title: string; date: string; no: number; pages: PaperPage[]; bodies: React.ReactNode[]; updated?: string;
}) {
  return (
    <article className="paper paper-print">
      <div className="no-print print-bar">
        <Link href={base}>‹ Back to the paper</Link>
        <PrintButton />
      </div>
      <header className="paper-head">
        <p className="paper-series">Arkanum Data Research · Working paper no. {no} · {date}{updated ? ` · Data last updated ${updated}` : ""}</p>
        <h1 className="paper-title">{title}</h1>
        <p className="paper-authors">Arkanum Data research team</p>
      </header>
      {bodies.map((b, i) => (
        <section key={pages[i].slug || "intro"} className="paper-body print-part">
          {i > 0 ? <p className="paper-series print-part-title">{pages[i].title}</p> : null}
          {b}
        </section>
      ))}
      <footer className="paper-foot">
        <p className="paper-cite">Cite as: Arkanum Data Research (2026). &ldquo;{title}.&rdquo; Working paper no. {no}, {date}. arkanumdata.vercel.app{base}</p>
      </footer>
    </article>
  );
}
