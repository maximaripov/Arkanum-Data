// Checks SEC_USER_AGENT without printing it: its shape, and what SEC answers to it, to a
// trimmed copy, and to a known-good form. Read-only.
const raw = process.env.SEC_USER_AGENT ?? "";
const shape = {
  set: raw.length > 0, length: raw.length,
  lineBreaks: /[\r\n]/.test(raw), tabs: /\t/.test(raw),
  leadingOrTrailingSpace: raw !== raw.trim(), nonAscii: /[^\x20-\x7e]/.test(raw.trim()),
  hasEmail: /\S+@\S+\.\S+/.test(raw), quoted: /^["'].*["']$/.test(raw.trim()),
  words: raw.trim().split(/\s+/).length,
};
console.log("secret shape:", JSON.stringify(shape));
const url = "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4&owner=include&count=10&start=0&output=atom";
async function tryUa(label, ua) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": ua }, signal: AbortSignal.timeout(20_000) });
    const body = await r.text();
    console.log(`${label}: HTTP ${r.status}${r.ok ? "" : ` · ${body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 160)}`}`);
  } catch (e) { console.log(`${label}: request not sent: ${e.cause?.message ?? e.message}`); }
}
await tryUa("secret as stored", raw);
await tryUa("secret trimmed", raw.trim().replace(/^["']|["']$/g, "").replace(/\s+/g, " "));
await tryUa("known-good form", "Arkanum Data info@arkanumdata.com");
