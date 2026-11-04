// Private investments by listed companies, picked out of press releases: a startup
// announcing "X raises $50M led by NVentures", or "Intel Capital invests in Y". Headlines
// and summaries only; every deal links to its release. Shared by build-private.mjs and tests.

// Listed companies and the names their investing shows up under. Names that are also
// ordinary words or other firms (Delta, United, GE, Merck KGaA's M Ventures) are left out
// or narrowed to the venture arm.
export const INVESTORS = [
  ["NVDA", "Nvidia", ["NVIDIA", "Nvidia", "NVentures"]],
  ["AMZN", "Amazon", ["Amazon", "AWS", "Alexa Fund", "Amazon Industrial Innovation Fund"]],
  ["GOOG", "Alphabet", ["Alphabet", "Google", "GV", "CapitalG", "Gradient Ventures"]],
  ["MSFT", "Microsoft", ["Microsoft", "M12"]],
  ["CRM", "Salesforce", ["Salesforce Ventures", "Salesforce"]],
  ["INTC", "Intel", ["Intel Capital", "Intel"]],
  ["AMD", "AMD", ["AMD Ventures", "AMD"]],
  ["QCOM", "Qualcomm", ["Qualcomm Ventures", "Qualcomm"]],
  ["CSCO", "Cisco", ["Cisco Investments", "Cisco"]],
  ["DELL", "Dell", ["Dell Technologies Capital"]],
  ["WDAY", "Workday", ["Workday Ventures"]],
  ["NOW", "ServiceNow", ["ServiceNow Ventures"]],
  ["SNOW", "Snowflake", ["Snowflake Ventures"]],
  ["ORCL", "Oracle", ["Oracle"]],
  ["META", "Meta", ["Meta Platforms"]],
  ["SFTBF", "SoftBank Group", ["SoftBank", "Vision Fund"]],
  ["UBER", "Uber", ["Uber"]],
  ["TM", "Toyota", ["Toyota Ventures", "Woven Capital", "Toyota"]],
  ["WMT", "Walmart", ["Walmart"]],
  ["JNJ", "Johnson & Johnson", ["Johnson & Johnson Innovation", "JJDC"]],
  ["PFE", "Pfizer", ["Pfizer Ventures", "Pfizer"]],
  ["MRK", "Merck & Co.", ["MRK Ventures", "Merck Global Health Innovation Fund"]],
  ["GSK", "GSK", ["GSK"]],
  ["SNY", "Sanofi", ["Sanofi Ventures", "Sanofi"]],
  ["LLY", "Eli Lilly", ["Eli Lilly"]], // not "Lilly": Lilly Asia Ventures is a separate firm
  ["GILD", "Gilead", ["Gilead"]],
  ["BABA", "Alibaba", ["Alibaba"]],
  ["CMCSA", "Comcast", ["Comcast Ventures"]],
  ["HON", "Honeywell", ["Honeywell Ventures"]],
  ["LMT", "Lockheed Martin", ["Lockheed Martin Ventures"]],
  ["BA", "Boeing", ["Boeing"]],
  ["CVX", "Chevron", ["Chevron Technology Ventures"]],
  ["XOM", "ExxonMobil", ["ExxonMobil"]],
  ["SHEL", "Shell", ["Shell Ventures"]],
  ["PYPL", "PayPal", ["PayPal Ventures"]],
  ["COIN", "Coinbase", ["Coinbase Ventures"]],
  ["MA", "Mastercard", ["Mastercard"]],
  ["V", "Visa", ["Visa"]],
  ["UAL", "United Airlines", ["United Airlines Ventures"]],
  ["DAL", "Delta Air Lines", ["Delta Air Lines"]],
];

// Case-insensitive text inside a case-sensitive pattern (investor names must keep their case:
// "Intel" is a company, "intel" isn't).
const ci = (s) => s.replace(/[a-z]/gi, (c) => `[${c.toLowerCase()}${c.toUpperCase()}]`);
const ROLE = ci("led by|co-led by|participation from|participation of|participation by|investors include|investors including|investors such as|investor|investors|backed by|investment from|investments from|funding from|joined by|alongside");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const decode = (s) => String(s ?? "")
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&#39;|&apos;|&#8217;|&rsquo;/g, "'").replace(/&quot;|&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/** Items of an RSS feed: title, link, date (YYYY-MM-DD), summary. */
export function parseRss(xml) {
  return [...String(xml).matchAll(/<item[\s>]([\s\S]*?)<\/item>/g)].map((m) => {
    const get = (t) => m[1].match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))?.[1] ?? "";
    const d = new Date(decode(get("pubDate")));
    return { title: decode(get("title")), link: decode(get("link")) || decode(get("guid")), date: isNaN(d) ? null : d.toISOString().slice(0, 10), summary: decode(get("description")).slice(0, 600) };
  });
}

const FUNDING = /\b(raises?|raised|secures?|closes?|closed|completes?|lands|announces?|receives?)\b[^.]*?\b(funding|financing|investment|round|seed|series [a-h]\b|capital)\b|\binvests?\b|\binvestment (from|by)\b|-backed\b/i;
const AMOUNT = /(?:US)?\$\s?(\d+(?:[.,]\d+)?)\s?(million|billion|mn|bn|m|b)\b/i;
const ROUND = /\b(pre-seed|seed|series [a-h])\b/i;
// "{Startup} Raises/Secures/Closes ..." — the startup is whatever comes before the verb.
const RAISER = /^(.{2,60}?)\s*(?:,\s*[^,]{3,60},\s*)?\b(?:raises|secures|closes|completes|lands|announces|receives|nabs|bags)\b/i;
// "Boston quantum startup QuEra" → "QuEra", "Surat-based Rocket" → "Rocket"; a phrase that
// ends in an ordinary word ("Belgian data center", "STEM skills") isn't a company: "".
function cleanName(t) {
  const words = t.replace(/^.*?-(?:backed|based|owned)\s+/i, "").replace(/['']s$/, "").replace(/\s*\([^)]*\)\s*/g, " ").replace(/[,:;]+$/, "").trim().split(/\s+/);
  let last = -1;
  words.forEach((w, i) => { if (/^[a-z]/.test(w)) last = i; });
  return words.slice(last + 1).join(" ");
}
// Investments in a country or region are spending (data centres), not stakes.
const PLACES = new RegExp(`^(?:${["US", "USA", "America", "Europe", "Asia", "Africa", "India", "China", "Japan", "Korea", "South Korea", "Taiwan", "Singapore", "Indonesia", "Malaysia", "Thailand", "Vietnam", "Philippines", "Australia", "New Zealand", "Canada", "Mexico", "Brazil", "Argentina", "Chile", "Colombia", "Peru", "Dominican Republic", "UK", "Britain", "England", "Scotland", "Wales", "Ireland", "Northern Ireland", "France", "Germany", "Italy", "Spain", "Portugal", "Netherlands", "Belgium", "Switzerland", "Austria", "Poland", "Sweden", "Norway", "Denmark", "Finland", "Greece", "Turkey", "Israel", "Saudi Arabia", "UAE", "Qatar", "Egypt", "Nigeria", "Kenya", "South Africa", "Pakistan", "Bangladesh", "Texas", "California", "Ohio", "Virginia", "Georgia", "Arizona", "Oregon", "Iowa", "Nebraska", "Indiana", "Mississippi", "Louisiana", "Pennsylvania", "Michigan", "Wisconsin", "Belgian", "Swiss", "Taiwanese", "Indian", "Chinese", "Japanese", "Korean", "German", "French", "British", "Israeli", "Canadian", "Australian"].join("|")})$`);
const NOT_A_NAME = /^(the|a|an|this|new|report|exclusive|press release|ceo|cfo|coo|cto|president|chair(man)?|board)\b/i;

/** Every tracked listed investor named as backing a startup in a release (one deal each). */
export function extractDeals(item) {
  const found = [];
  const text = `${item.title}. ${item.summary ?? ""}`;
  if (!FUNDING.test(text)) return found;
  for (const [ticker, name, aliases] of INVESTORS) {
    const al = aliases.map(esc).join("|");
    // The investor named after "led by", "participation from", "investors include"… in the
    // same sentence ("Acme raises $20M led by Sequoia and NVentures"), not just mentioned.
    const roleBefore = new RegExp(`\\b(?:${ROLE})\\b[^.!?]{0,200}?(?<!\\bof\\s)\\b(?:${al})\\b(?!\\)|\\s+(?:Alumni|Asia Ventures|Cloud|Marketplace|Play|Maps|Search|Store|Prime|Web Services|Azure|Teams)\\b)`);
    const backed = new RegExp(`\\b(?:${al})-backed\\b`);
    const invests = new RegExp(`^(?:${al})\\b[^.]{0,40}?\\b(?:${ci("invests|leads|backs|makes an investment|makes a strategic investment|makes strategic investment|announces investment|announces an investment|announces a strategic investment|announces strategic investment")})\\b[^.]*?\\b(?:${ci("in|into")})\\s+([A-Z0-9][^,;:()]{1,80}?)(?=\\s+(?:to|for|at|as|and|amid|with|ahead|after|in|on|of|via|valued)\\b|[,;:(]|$)`);
    let target = null;
    const inv = item.title.match(invests);
    if (inv) target = inv[1];
    else if (roleBefore.test(text) || backed.test(text)) {
      const r = item.title.split(/:\s+/).pop().match(RAISER); // "From Seed to Unicorn: Upscale AI Closes…"
      if (r) target = r[1];
    }
    if (!target) continue;
    target = cleanName(target);
    if (!target || NOT_A_NAME.test(target) || PLACES.test(target) || new RegExp(`^(?:${al})\\b`, "i").test(target)) continue;
    const amt = text.match(AMOUNT), round = text.match(ROUND);
    found.push({
      investor: ticker, investorName: name, target,
      amount: amt ? Math.round(parseFloat(amt[1].replace(",", ".")) * (/^b/i.test(amt[2]) ? 1e9 : 1e6)) : null,
      round: round ? round[1].replace(/^./, (c) => c.toUpperCase()).replace(/series (\w)/i, (_, l) => `Series ${l.toUpperCase()}`) : null,
      date: item.date, title: item.title, url: item.link,
    });
  }
  return found;
}
/** The first one, or null. */
export const extractDeal = (item) => extractDeals(item)[0] ?? null;

/** One deal per investor and startup ("Verily" and "Verily Health" are one). */
export const dealKey = (d) => `${d.investor}:${d.target.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ")[0]}`;

/** Lowercase alias as it appears in a release's web address ("intel-capital"). */
export const SLUG_ALIASES = INVESTORS.flatMap(([, , aliases]) => aliases.map((a) => a.toLowerCase().replace(/&/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")));
