// Readable names and roles from SEC filings ("HEALY JAMES" → "James Healy",
// "Chief Executive Officer, Director" → "CEO & director"). Plain JS: used by the site (server and browser) and the alert scripts.
const ORG = /\b(LLC|L\.?P\.?|INC|CORP|FUND|TRUST|HOLDINGS?|CAPITAL|PARTNERS|MANAGEMENT|ADVISORS?|GROUP|LTD|LIMITED|FOUNDATION|VENTURES|INVESTMENTS?|ASSOCIATES|PLC|SA|AG|NV|CO)\b/i;
export const titleCase = (s) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\bIi\b/g, "II").replace(/\bIii\b/g, "III");

/** SEC lists people surname-first in capitals ("HEALY JAMES"); show "James Healy". */
export function personName(raw) {
  const first = raw.split(",")[0].trim(); // several filers on one form → the first one
  const more = raw.includes(",") ? " and others" : "";
  if (ORG.test(first)) return titleCase(first) + more;
  const parts = first.split(/\s+/);
  const suffix = /^(JR|SR|II|III|IV)\.?$/i.test(parts.at(-1) ?? "") ? " " + parts.pop() : "";
  const name = parts.length > 1 ? [...parts.slice(1), parts[0]].join(" ") : first;
  return titleCase(name) + titleCase(suffix) + more;
}

/** Titles: keep ones already in mixed case; in ALL-CAPS ones keep short abbreviations
 *  (SVP, EVP, GC, VP) and lowercase small words ("and", "of"). */
function niceTitle(p) {
  if (/[a-z]/.test(p)) return p;
  return p.split(/\s+/).map((w) => (/^[A-Z&]{1,4}$/.test(w) && !/^(AND|OF|THE|FOR)$/.test(w) ? w : /^(AND|OF|THE|FOR)$/.test(w) ? w.toLowerCase() : titleCase(w))).join(" ");
}

const SHORT = [
  [/chief executive officer|\bceo\b/i, "CEO"], [/chief financial officer|\bcfo\b/i, "CFO"], [/chief operating officer|\bcoo\b/i, "COO"],
  [/chief technology officer|\bcto\b/i, "CTO"], [/general counsel/i, "General Counsel"], [/chair(man|woman|person)?/i, "Chair"], [/president/i, "President"],
];
/** "Chief Executive Officer, Director, 10% owner" → "CEO & director, major shareholder" */
export function roleLabel(role) {
  // The role string is "<officer title>, Director, 10% owner", but titles can contain
  // commas themselves ("SVP, GC and Government Affairs"), so rejoin the title fragments.
  const raw = role.split(",").map((p) => p.trim()).filter(Boolean);
  const parts = [];
  for (const p of raw) {
    if (["Director", "10% owner", "Other"].includes(p) || !parts.length || ["Director", "10% owner", "Other"].includes(parts.at(-1))) parts.push(p);
    else parts[parts.length - 1] += ", " + p;
  }
  const out = [];
  for (const p of parts) {
    if (p === "Other") continue;
    if (p === "Director") { out.push("director"); continue; }
    if (p === "10% owner") { out.push("major shareholder"); continue; }
    const hit = SHORT.find(([re]) => re.test(p));
    out.push(hit ? hit[1] : p.length > 34 ? "Officer" : niceTitle(p));
  }
  return out.length ? out.join(", ").replace(/, director/, " & director") : "insider";
}
