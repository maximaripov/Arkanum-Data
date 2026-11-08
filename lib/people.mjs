// Readable names and roles from SEC filings ("HEALY JAMES" → "James Healy",
// "Chief Executive Officer, Director" → "CEO & director"). Plain JS: used by the site (server and browser) and the alert scripts.
const ORG = /\b(LLC|L\.?P\.?|INC|CORP|FUND|TRUST|HOLDINGS?|CAPITAL|PARTNERS|MANAGEMENT|ADVISORS?|GROUP|LTD|LIMITED|FOUNDATION|VENTURES|INVESTMENTS?|ASSOCIATES|PLC|SA|AG|NV|CO)\b/i;
export const titleCase = (s) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\bIi\b/g, "II").replace(/\bIii\b/g, "III");

const SMALL = new Set(["AND", "OF", "THE", "FOR", "IN", "TO", "ON", "AT", "BY", "OR", "AN", "A", "DE", "LA", "DU", "DI"]);
const KEEP_UPPER = new Set(["US", "USA", "UK", "AI", "ADR", "ADS", "ESG", "REIT", "ETF", "LLC", "LP", "PLC", "SE", "NV", "AG", "SA", "AB", "ASA", "NA", "II", "III", "IV", "VI", "RE", "HK", "TV", "IT", "SPAC", "BDC", "ETN", "CEF", "NYSE"]);
/** Brands whose own spelling no casing rule can produce (by ticker). */
const SPELLED = {
  AMZN: "Amazon.com, Inc.", NVDA: "NVIDIA Corp", UNH: "UnitedHealth Group Inc", JPM: "JPMorgan Chase & Co",
  EME: "EMCOR Group, Inc.", IBM: "IBM", PYPL: "PayPal Holdings, Inc.", EBAY: "eBay Inc.", MCD: "McDonald's Corp",
  HCA: "HCA Healthcare, Inc.", KLAC: "KLA Corp", ADP: "ADP", BLK: "BlackRock, Inc.", XOM: "Exxon Mobil Corp",
  // SEC's company names drop apostrophes ("LOWES COMPANIES INC").
  ORLY: "O'Reilly Automotive, Inc.", LOW: "Lowe's Companies, Inc.", KSS: "Kohl's Corp", M: "Macy's, Inc.", DKS: "Dick's Sporting Goods, Inc.",
  BJ: "BJ's Wholesale Club Holdings, Inc.", BJRI: "BJ's Restaurants, Inc.", CASY: "Casey's General Stores, Inc.", DPZ: "Domino's Pizza, Inc.",
  WEN: "The Wendy's Company", PZZA: "Papa John's International, Inc.", PLAY: "Dave & Buster's Entertainment, Inc.", MCO: "Moody's Corp",
  DDS: "Dillard's, Inc.", CRI: "Carter's, Inc.", PLCE: "The Children's Place, Inc.", LE: "Lands' End, Inc.",
};
const SUFFIX = { CORP: "Corp", INC: "Inc", LTD: "Ltd", CO: "Co", HLDGS: "Holdings", HOLDINGS: "Holdings" };

/** Company names from SEC filings. Known brands use their own spelling (SPELLED). Otherwise
 *  ALL-CAPS words are title-cased except acronyms: words with no vowels (LKQ, CME), known
 *  ones (USA, REIT, PLC), two-letter words (SK, AI) and the stock's own symbol (UMH
 *  Properties). In names already in mixed case ("Duke Energy CORP") only stray capital
 *  words of five letters or more change, since shorter ones are usually acronyms or brands (CVS, CBIZ, NIKE).
 *  "COM" after a name becomes ".com"; state tags like "/DE/" are dropped. */
export function companyName(raw, symbol) {
  const sym = String(symbol ?? "").toUpperCase();
  if (SPELLED[sym]) return SPELLED[sym];
  const s = String(raw ?? "").replace(/\s*\/[A-Z]{2,3}\/?\s*$/, "").replace(/\s*\((?:de|DE|md|MD|nv|NV|ma|MA)\)\s*$/, "")
    .replace(/(\w) COM\b/, "$1.COM").replace(/\s+/g, " ").trim();
  const lower = (s.match(/[a-z]/g) ?? []).length, upper = (s.match(/[A-Z]/g) ?? []).length;
  const mixed = lower > upper * 0.25;
  return s.split(" ").map((w, i) => {
    const core = w.replace(/[^A-Za-z0-9&'.-]/g, "");
    const bare = core.replace(/[.,]/g, "");
    if (!bare || /[a-z]/.test(core.replace(/\.com$/i, ""))) return w; // already in mixed case ("Co")
    if (/^[A-Z0-9&'-]+\.COM,?$/.test(core)) return titleCase(w.slice(0, w.indexOf(".COM"))).replace(/'S\b/, "'s") + ".com" + w.slice(w.indexOf(".COM") + 4);
    if (SUFFIX[bare] && i > 0) return w.replace(bare, SUFFIX[bare]);
    if (mixed && (bare.length < 5 || bare === sym || KEEP_UPPER.has(bare) || /[&\d]/.test(bare) || !/[AEIOUY]/.test(bare))) return w;
    if (SMALL.has(bare) && i > 0) return w.toLowerCase();
    if (KEEP_UPPER.has(bare) || bare === sym || /&/.test(bare) || /\d/.test(bare)) return w;
    if (!/[AEIOUY]/.test(bare) || (bare.length === 2 && !SMALL.has(bare))) return w;
    return titleCase(w).replace(/'S\b/, "'s").replace(/^Mc([a-z])/, (_, c) => "Mc" + c.toUpperCase());
  }).join(" ").replace(/\bO ([A-Z][a-z]+)/g, "O'$1"); // "O Reilly" (SEC drops the apostrophe) → "O'Reilly"
}

/** SEC lists people surname-first in capitals ("HEALY JAMES"); show "James Healy". */
/** True when the filer is a fund or company (a board seat makes it an insider), not a person. */
export const isEntity = (raw) => ORG.test(String(raw ?? "").split(",")[0].trim());

export function personName(raw) {
  const first = raw.split(",")[0].trim(); // several filers on one form → the first one
  const more = raw.includes(",") ? " and others" : "";
  if (ORG.test(first)) return companyName(first) + more; // keeps LLC, LP, LTD in capitals
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
    if (p === "Other" || /^see remarks$/i.test(p)) continue; // "See Remarks": the title is only in the filing's footnotes
    if (p === "Director") { out.push("director"); continue; }
    if (p === "10% owner") { out.push("major shareholder"); continue; }
    const hit = SHORT.find(([re]) => re.test(p));
    out.push(hit ? hit[1] : p.length > 34 ? "Officer" : niceTitle(p));
  }
  return out.length ? out.join(", ").replace(/, director/, " & director") : "insider";
}

/** Officers and directors trade their own company with inside knowledge; 10% owners
 *  are usually investment funds. `role` is "<officer title>, Director, 10% owner". */
export function isExecOrDirector(t) {
  return String(t?.role ?? "").split(",").map((s) => s.trim()).some((p) => p && p !== "10% owner" && p !== "Other");
}
