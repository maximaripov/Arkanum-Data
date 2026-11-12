// A company's press release, filed with the SEC as exhibit 99 to an 8-K: which file in the
// filing it is, and its headline. Public domain, filed the same day as the news; this is how the
// stock page shows "breaking news and developments" without a third-party news feed.

/** The press-release exhibit among a filing's file names (ex99-1.htm, ex991.htm, d123dex991.htm…). */
export function pickExhibit(names) {
  const docs = (names ?? []).filter((n) => /\.(htm|html|txt)$/i.test(n) && !/index|R\d+\.htm/i.test(n));
  return docs.find((n) => /(ex|exhibit)[-_ ]?99[-_.]?0?1\b|ex991|ex99[-_]?1|dex991/i.test(n))
    ?? docs.find((n) => /(ex|exhibit)[-_ ]?99/i.test(n))
    ?? null;
}

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", reg: "®", trade: "™", copy: "©", bull: "•" };
const decode = (s) => s
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&([a-z]+);/gi, (m, e) => ENT[e.toLowerCase()] ?? m);

// Lines that come before the headline in most releases and are never it.
const SKIP = [
  /^exhibit\b/i, /^ex-?\s?99/i, /for immediate release/i, /^press release$/i, /^news release$/i, /^\(?news\)?$/i,
  /^(media|investor|press) (contact|relations)/i, /^contacts?:?/i, /^source:/i, /^page \d/i, /^table of contents$/i,
  /^[A-Z][a-z]+\.? \d{1,2}, \d{4}$/, /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, /^(nyse|nasdaq)\b[^a-z]*$/i, /^https?:\/\//i, /@/,
];

/** The headline of a press release from its HTML or text: the first line that reads like one. */
export function headline(doc) {
  const text = decode(String(doc ?? "")
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/?(p|div|br|tr|td|h[1-6]|li|table|center)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " "));
  for (const raw of text.split(/\n+/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (line.length < 25 || line.length > 240 || !/[a-z]/i.test(line)) continue;
    if (SKIP.some((re) => re.test(line))) continue;
    // A dateline ("NEW YORK, Nov. 10, 2026 /PRNewswire/ -- ...") is the body, not the headline.
    if (/\/(PRNewswire|Business ?Wire|GLOBE ?NEWSWIRE|ACCESSWIRE)\//i.test(line) || /^[A-Z .,]+, [A-Z][a-z]+\.? \d{1,2}, \d{4}/.test(line)) return null;
    return line.replace(/\s+([,.;:])/g, "$1");
  }
  return null;
}
