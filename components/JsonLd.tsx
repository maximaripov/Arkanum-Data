// schema.org structured data for search engines and AI answer engines. "<" is escaped so text
// from the data can never close the script tag.
export const SITE = "https://arkanumdata.vercel.app";
export const PUBLISHER = { "@type": "Organization", name: "Arkanum Data", url: SITE };

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c") }} />;
}
