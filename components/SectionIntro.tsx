// How every section of the site opens, so they read as one research platform: what the
// section shows, where the data comes from and how fresh it is, and what our research says
// about it (or that it hasn't been tested).
import Link from "next/link";

export function SectionIntro({ title, lead, source, research, researchHref }: {
  title: string; lead: React.ReactNode; source: React.ReactNode; research?: React.ReactNode; researchHref?: string;
}) {
  return (
    <section className="card intro span12">
      <h1>{title}</h1>
      <p className="intro-lead">{lead}</p>
      <dl className="intro-meta">
        <div><dt>Source</dt><dd>{source}</dd></div>
        <div><dt>Research</dt><dd>{research ?? "Not tested in our research yet: shown as filed."}{researchHref ? <> <Link href={researchHref}>Evidence ›</Link></> : null}</dd></div>
      </dl>
    </section>
  );
}
