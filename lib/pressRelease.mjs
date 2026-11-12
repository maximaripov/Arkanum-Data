// A company's press release, filed with the SEC as exhibit 99 to an 8-K: which file in the
// filing it is, and its headline. Public domain, filed the same day as the news; this is how the
// stock page shows "breaking news and developments" without a third-party news feed.

/** The press-release exhibit from a filing's index page (…-index.html), which labels each file's
 * type: EX-99.1 first, then any EX-99. File names can't be trusted ("nvidiaannouncesceotransiti.htm"). */
export function exhibitFromIndex(html) {
  const rows = [...String(html ?? "").matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((m) => m[0]);
  const docs = rows.map((r) => ({
    file: /href="[^"]*\/([^"/]+\.(?:htm|html|txt))"/i.exec(r)?.[1] ?? null,
    type: /<td[^>]*>\s*(EX-99[^<\s]*)\s*<\/td>/i.exec(r)?.[1]?.toUpperCase() ?? null,
  })).filter((d) => d.file && d.type);
  return (docs.find((d) => d.type === "EX-99.1") ?? docs.find((d) => d.type.startsWith("EX-99")))?.file ?? null;
}

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", reg: "®", trade: "™", copy: "©", bull: "•" };
const decode = (s) => s
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&([a-z]+);/gi, (m, e) => ENT[e.toLowerCase()] ?? m);

// Lines that come before the headline in most releases and are never it.
const SKIP = [
  /exhibit\s*99/i, /^exhibit\b/i, /for immediate release/i, /^(press|news) release\b/i, /^\(?news\)?$/i,
  /^(media|investor|press) (contact|relations)/i, /^contacts?:?/i, /^source:/i, /^page \d/i, /^table of contents$/i,
  /^[A-Z][a-z]+\.? \d{1,2}, \d{4}$/, /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, /^(nyse|nasdaq)\b[^a-z]*$/i, /^https?:\/\//i, /@/,
  /\.(htm|html|txt)$/i, // a file name left in the document as its title
  /\(\d{3}\)\s*\d{3}-\d{4}|\b\d{3}[-.]\d{3}[-.]\d{4}\b/, // a contact's phone number
  /(\b\d{1,2}\b.*){4,}/, // a table of contents ("Highlights 03 Financial Summary 04 …")
];
// A headline wrapped onto the next line ends mid-phrase: "… Closes Paloma Acquisition And".
const UNFINISHED = /\b(and|or|of|to|for|with|the|in|on|at|by|a|an|&|announces|closes|reports|completes|enters|names|senior|its|new)$/i;
// The company name alone, in capitals ("MATADOR RESOURCES COMPANY"), sits above the real headline.
const NAME_ONLY = (l) => l === l.toUpperCase() && l.split(" ").length <= 4 && !/\d/.test(l);
// Exhibits 99 that aren't press releases: agreements, financial statements, letters.
const NOT_A_RELEASE = /made and entered into|this agreement|\(the [“"]|index to (consolidated )?financial statements|^dear (shareholders|stockholders)/i;

/** The headline of a press release from its HTML or text: the first line that reads like one.
 * A company name alone on the line before it ("United Therapeutics" / "Corporation Announces…")
 * is joined back on. Returns null when nothing reads like a headline. */
export function headline(doc) {
  const text = decode(String(doc ?? "")
    .replace(/<(script|style|head|title)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/?(p|div|br|tr|td|h[1-6]|li|table|center)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " "));
  let prev = null;
  const lines = text.split(/\n+/).map((l) => l.replace(/\s+/g, " ").trim()).filter((l) => l && /[a-z]/i.test(l));
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (NOT_A_RELEASE.test(line)) return null;
    if (SKIP.some((re) => re.test(line))) { prev = null; continue; }
    // A short line or a company name alone may be the start of the headline on the next line.
    if (line.length < 25 || NAME_ONLY(line)) { prev = line.length >= 3 && (line !== line.toUpperCase() || line.split(" ").length >= 2) && !/[!?:]$/.test(line) ? line : null; continue; }
    if (line.length > 240 || (line.length > 80 && /\.$/.test(line))) return null; // a sentence: body text, not a headline
    // A dateline ("NEW YORK, Nov. 10, 2026 /PRNewswire/ -- ...") is the body: no headline before it.
    if (/\/(PRNewswire|Business ?Wire|GLOBE ?NEWSWIRE|ACCESSWIRE)\//i.test(line) || /^[A-Z .,]+, [A-Z][a-z]+\.? \d{1,2}, \d{4}/.test(line)) return null;
    let out = prev && /^[A-Z]/.test(line) && !line.startsWith(prev.split(" ")[0]) ? `${prev} ${line}` : line;
    // Rejoin a headline that wrapped onto the next line (at most two more lines).
    for (let j = i + 1; j <= i + 2 && UNFINISHED.test(out) && lines[j] && lines[j].length <= 120 && !SKIP.some((re) => re.test(lines[j])); j++) out = `${out} ${lines[j]}`;
    return out.replace(/\s+([,.;:])/g, "$1");
  }
  return null;
}
