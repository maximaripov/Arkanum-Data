// Parses an SEC Form 4 (insider transaction) XML document into flat trade rows.
// Plain JS so both the Next.js app and the nightly Node script can use it.
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false });
const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const val = (x) => (x == null ? "" : typeof x === "object" ? String(x.value ?? "") : String(x));
const num = (x) => { const n = parseFloat(val(x)); return Number.isFinite(n) ? n : null; };
const yes = (x) => val(x) === "true" || val(x) === "1";

/** @returns {import("./sec").InsiderTrade[]} */
// Private companies and funds file Form 4s with placeholder tickers; they aren't tradable.
const NO_TICKER = new Set(["", "NONE", "N/A", "NA", "NULL", "-", "--", "NOT APPLICABLE"]);

/** A filer's ticker field, cleaned: "NYSE:FLG" → "FLG"; "[NONE]", "N/A" and "NYSE:" → "". */
export function cleanSymbol(raw) {
  const first = String(raw ?? "").toUpperCase().trim().split(/[,;\s]+/)[0].replace(/^[A-Z]+:/, "").replace(/[\[\]()]/g, "");
  return /^(NONE|N\/?A|NA|NULL|-+)?$/.test(first) ? "" : first;
}

export function parseForm4(xml, meta) {
  const doc = parser.parse(xml)?.ownershipDocument;
  if (!doc) return [];
  const owners = arr(doc.reportingOwner);
  const owner = owners.map((o) => val(o.reportingOwnerId?.rptOwnerName)).join(", ");
  const ownerCik = String(Number(val(owners[0]?.reportingOwnerId?.rptOwnerCik)) || ""); // SEC ID of the (first) insider
  const rel = owners[0]?.reportingOwnerRelationship ?? {};
  const title = val(rel.officerTitle).trim() || (yes(rel.isOfficer) ? "Officer" : "");
  const roles = [title, yes(rel.isDirector) ? "Director" : "", yes(rel.isTenPercentOwner) ? "10% owner" : ""].filter(Boolean);
  const planned = yes(doc.aff10b5One);
  // Some filings list several share classes ("HEI, HEI.A"); keep the first ticker.
  const symbol = cleanSymbol(val(doc.issuer?.issuerTradingSymbol));
  if (NO_TICKER.has(symbol)) return [];
  // Everything the insider holds after this filing, across accounts: a filing lists each
  // account (direct, a trust, a fund) separately, and accounts that didn't trade appear as
  // plain holdings. A trade's own "owned after" covers only its account, so selling all of
  // one trust reads as 0 even when millions of shares are held elsewhere.
  const accounts = new Map();
  const acct = (r) => `${val(r.securityTitle)}|${val(r.ownershipNature?.directOrIndirectOwnership)}|${val(r.ownershipNature?.natureOfOwnership)}`;
  const txns = arr(doc.nonDerivativeTable?.nonDerivativeTransaction);
  for (const r of [...txns, ...arr(doc.nonDerivativeTable?.nonDerivativeHolding)]) {
    const after = num(r.postTransactionAmounts?.sharesOwnedFollowingTransaction);
    if (after != null) accounts.set(acct(r), after); // later rows of an account replace earlier ones
  }
  const ownedTotal = accounts.size ? [...accounts.values()].reduce((a, b) => a + b, 0) : null;
  return txns.map((t) => {
    const shares = num(t.transactionAmounts?.transactionShares) ?? 0;
    const { price, value } = priceAndValue(shares, num(t.transactionAmounts?.transactionPricePerShare));
    return {
      ...meta,
      symbol,
      issuer: val(doc.issuer?.issuerName),
      owner,
      ownerCik,
      role: roles.join(", ") || "Other",
      date: val(t.transactionDate),
      code: val(t.transactionCoding?.transactionCode),
      shares,
      price,
      value,
      acquired: val(t.transactionAmounts?.transactionAcquiredDisposedCode) === "A",
      ownedAfter: num(t.postTransactionAmounts?.sharesOwnedFollowingTransaction),
      ownedTotal,
      planned,
    };
  });
}

/** Price per share and dollar value of one transaction. Some filers type the total amount
 * into the per-share price box (189,310 shares at "$270,710.44"), which would make a
 * $270K sale look like $51B. A result over $1B at over $1,000 a share is read that way:
 * real trades that size happen at ordinary prices, and $1,000+ stocks don't trade $1B
 * at a time. */
export function priceAndValue(shares, price) {
  if (!price) return { price: null, value: null };
  if (shares > 0 && price > 1000 && shares * price > 1e9) return { price: +(price / shares).toFixed(4), value: Math.round(price) };
  return { price, value: Math.round(shares * price) };
}
