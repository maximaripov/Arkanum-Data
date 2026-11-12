// The frame around each page of a research paper: journal line, title, authors, contents
// with the current page marked, then the page, then previous/next and how to cite it.
import Link from "next/link";
import { JsonLd, PUBLISHER, SITE } from "@/components/JsonLd";

export type PaperPage = { slug: string; title: string };

export function Paper({ base, title, date, pages, current, children, no = 1 }: {
  base: string; title: string; date: string; pages: PaperPage[]; current: number; children: React.ReactNode; no?: number;
}) {
  const href = (i: number) => (pages[i].slug ? `${base}/${pages[i].slug}` : base);
  const prev = current > 0 ? current - 1 : null, next = current < pages.length - 1 ? current + 1 : null;
  return (
    <article className="paper">
      {current === 0 ? <JsonLd data={{ "@type": "ScholarlyArticle", headline: title, url: SITE + base, author: PUBLISHER, publisher: PUBLISHER, isPartOf: { "@type": "CreativeWorkSeries", name: "Arkanum Data Research working papers" }, position: no, isAccessibleForFree: true }} /> : null}
      <header className="paper-head">
        <p className="paper-series">Arkanum Data Research · Working paper no. {no} · {date}</p>
        <h1 className="paper-title">{title}</h1>
        <p className="paper-authors">Arkanum Data research team</p>
      </header>
      <nav className="paper-toc" aria-label="Pages of this paper">
        <ol>{pages.map((pg, i) => (
          <li key={pg.slug} className={i === current ? "on" : ""}>
            {i === current ? <span aria-current="page">{pg.title}</span> : <Link href={href(i)}>{pg.title}</Link>}
          </li>
        ))}</ol>
      </nav>
      <div className="paper-body">{children}</div>
      <footer className="paper-foot">
        <div className="paper-pager">
          {prev != null ? <Link href={href(prev)} rel="prev">‹ {pages[prev].title}</Link> : <span />}
          <span className="paper-pageno">Page {current + 1} of {pages.length}</span>
          {next != null ? <Link href={href(next)} rel="next">{pages[next].title} ›</Link> : <span />}
        </div>
        <p className="paper-cite"><Link href={`${base}/print`}>Download PDF</Link> · all pages in one document</p>
        <p className="paper-cite">Cite as: Arkanum Data Research (2026). &ldquo;{title}.&rdquo; Working paper no. {no}, {date}. arkanumdata.vercel.app{base}</p>
      </footer>
    </article>
  );
}
