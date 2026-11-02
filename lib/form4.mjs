// Parses an SEC Form 4 (insider transaction) XML document into flat trade rows.
// Plain JS so both the Next.js app and the nightly Node script can use it.
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false });
const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const val = (x) => (x == null ? "" : typeof x === "object" ? String(x.value ?? "") : String(x));
const num = (x) => { const n = parseFloat(val(x)); return Number.isFinite(n) ? n : null; };
const yes = (x) => val(x) === "true" || val(x) === "1";

/** @returns {import("./sec").InsiderTrade[]} */
export function parseForm4(xml, meta) {
  const doc = parser.parse(xml)?.ownershipDocument;
  if (!doc) return [];
  const owners = arr(doc.reportingOwner);
  const owner = owners.map((o) => val(o.reportingOwnerId?.rptOwnerName)).join(", ");
  const rel = owners[0]?.reportingOwnerRelationship ?? {};
  const roles = [val(rel.officerTitle), yes(rel.isDirector) ? "Director" : "", yes(rel.isTenPercentOwner) ? "10% owner" : ""].filter(Boolean);
  const planned = yes(doc.aff10b5One);
  return arr(doc.nonDerivativeTable?.nonDerivativeTransaction).map((t) => {
    const shares = num(t.transactionAmounts?.transactionShares) ?? 0;
    const price = num(t.transactionAmounts?.transactionPricePerShare);
    return {
      ...meta,
      symbol: val(doc.issuer?.issuerTradingSymbol).toUpperCase().trim(),
      issuer: val(doc.issuer?.issuerName),
      owner,
      role: roles.join(", ") || "Other",
      date: val(t.transactionDate),
      code: val(t.transactionCoding?.transactionCode),
      shares,
      price: price || null,
      value: price ? Math.round(shares * price) : null,
      acquired: val(t.transactionAmounts?.transactionAcquiredDisposedCode) === "A",
      ownedAfter: num(t.postTransactionAmounts?.sharesOwnedFollowingTransaction),
      planned,
    };
  });
}
