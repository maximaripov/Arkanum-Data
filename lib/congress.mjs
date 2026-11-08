// Shared by the Congress data job and the site.

/** "Gilbert Ray Cisneros, Jr." -> "gilbert-ray-cisneros-jr": the member's page address.
 * @param {string} name */
export const memberSlug = (name) => String(name).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** @param {number} n */
const k = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`);
/** "$1K–15K": most reports give a range; a few give the exact amount.
 * @param {number | null} lo @param {number | null} hi */
/** A reported range's estimated size: its midpoint, or the floor of an open top range ("over $50M"). */
export const estAmount = (lo, hi) => (lo == null ? 0 : hi == null ? lo : (lo + hi) / 2);
export const amountRange = (lo, hi) => (lo == null ? "—" : hi == null ? `over ${k(lo)}` : hi === lo ? k(lo) : `${k(lo)}–${k(hi)}`);
