import { SITE } from "@/lib/site";
// A minimal RSS 2.0 document for the site's feeds (/feeds/*.xml).
export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** "2026-11-03" -> an RFC 822 date at noon UTC (filings carry the day only). */
const rssDate = (d: string) => new Date(d + "T12:00:00Z").toUTCString();

export type FeedItem = { title: string; link: string; guid: string; date: string; html: string };

export function rss({ title, path, description, items }: { title: string; path: string; description: string; items: FeedItem[] }) {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(title)}</title>
<link>${SITE}</link>
<atom:link href="${SITE}${path}" rel="self" type="application/rss+xml"/>
<description>${esc(description)}</description>
<language>en-us</language>
${items.map((i) => `<item>
<title>${esc(i.title)}</title>
<link>${esc(SITE + i.link)}</link>
<guid isPermaLink="false">${esc(i.guid)}</guid>
<pubDate>${rssDate(i.date)}</pubDate>
<description>${esc(i.html)}</description>
</item>`).join("\n")}
</channel>
</rss>
`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
