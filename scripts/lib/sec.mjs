// Polite SEC EDGAR fetching for the data scripts: identifies itself (SEC asks for a
// contact in the User-Agent; set SEC_USER_AGENT), retries, and backs off when throttled.
// Tidied, because a header value can't hold a line break: a secret pasted from a phone
// (Nov 13) carried one and a non-breaking space, and every SEC request failed before sending.
export const UA = (process.env.SEC_USER_AGENT || "").replace(/[^\x20-\x7e]+/g, " ").replace(/\s+/g, " ").trim().replace(/^["']|["']$/g, "") || "Arkanum (set SEC_USER_AGENT)";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// SEC allows 10 requests a second per client; space every request out to stay under it.
let next = 0;
async function slot() {
  const now = Date.now(), at = Math.max(now, next);
  next = at + 115;
  if (at > now) await sleep(at - now);
}

/** Text of a URL; null for a missing file. Throws after repeated failures. */
export async function getText(url) {
  let last = "";
  for (let i = 0; i < 4; i++) {
    try {
      await slot();
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) });
      if (r.status === 404) return null;
      if (r.ok) return await r.text();
      // SEC's file store answers a missing file (e.g. a holiday's index) with a 403
      // "AccessDenied" XML; real throttling is an HTML "Request Rate Threshold" page.
      if (r.status === 403 && (await r.text()).includes("AccessDenied")) return null;
      if (r.status === 403 || r.status === 429) await sleep(5000 * (i + 1));
      last = `HTTP ${r.status}`;
    } catch (e) { last = e.cause?.message ?? e.message; }
    await sleep(1000 * (i + 1));
  }
  throw new Error(`Failed (${last}): ${url}`);
}
export const getJson = async (url) => { const t = await getText(url); return t ? JSON.parse(t) : null; };

/** Runs `fn` over items with `n` workers (requests are rate-limited in getText). */
export async function pool(items, n, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: n }, async () => {
    while (queue.length) { const x = queue.shift(); try { await fn(x); } catch (e) { console.warn(e.message); } }
  }));
}

/** The Form 4 files in a daily form.idx, one per filing. The index lists a filing once per
 * filer (the company and each insider), each path carrying that filer's CIK, so paths
 * are compared by accession number; reading a filing twice would double its trades. */
export function form4Files(idx) {
  const byAccession = new Map();
  for (const l of idx.split("\n")) {
    if (!/^4\s{2,}/.test(l)) continue;
    const f = l.match(/edgar\/data\/\S+\.txt/)?.[0];
    const acc = f?.split("/").pop();
    if (f && !byAccession.has(acc)) byAccession.set(acc, f);
  }
  return [...byAccession.values()];
}

/** One row per filing and direction: partial fills of a buy or sale become one trade. */
export function mergeFills(rows) {
  const merged = new Map();
  for (const t of rows) {
    if (t.code !== "P" && t.code !== "S") continue;
    const k = t.accession + t.code;
    const m = merged.get(k);
    if (!m) { merged.set(k, { ...t }); continue; }
    m.shares += t.shares;
    m.value = (m.value ?? 0) + (t.value ?? 0) || null;
    m.price = m.value && m.shares ? +(m.value / m.shares).toFixed(4) : m.price;
    if (t.date > m.date) m.date = t.date;
    m.ownedAfter = t.ownedAfter ?? m.ownedAfter;
  }
  return [...merged.values()];
}
export const MIN_SALE = 250_000; // routine small sales are noise; keep big ones only
export const keepTrade = (t) => t.symbol && (t.code === "P" || (t.value ?? 0) >= MIN_SALE);
