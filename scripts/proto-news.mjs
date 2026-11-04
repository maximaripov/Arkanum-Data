// PROTOTYPE (not part of the site): can private investments be picked out of news headlines?
// Source: GDELT (free, open news index; one request per 5 seconds). Extraction: headline
// patterns only. Output: every match with its link, for checking by hand.
import { writeFile } from "node:fs/promises";

const INVESTORS = {
  NVIDIA: ["Nvidia", "NVIDIA", "NVentures"],
  Amazon: ["Amazon", "AWS", "Amazon Industrial Innovation Fund"],
  Alphabet: ["Google", "Alphabet", "GV", "CapitalG"],
  Microsoft: ["Microsoft", "M12"],
  Salesforce: ["Salesforce Ventures", "Salesforce"],
  Intel: ["Intel Capital", "Intel"],
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const AMT = String.raw`\$\s?(\d+(?:\.\d+)?)\s?(million|billion|m|bn|b)\b`;
const NAME = String.raw`([A-Z][\w.&'’-]*(?:\s+[A-Z0-9][\w.&'’-]*){0,3})`;

async function gdelt(q) {
  const u = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  for (const [k, v] of Object.entries({ query: q, mode: "artlist", format: "json", maxrecords: "250", timespan: "3months", sort: "datedesc" })) u.searchParams.set(k, v);
  for (let i = 0; i < 4; i++) {
    const r = await fetch(u, { headers: { "User-Agent": "Form4 prototype (form4-insiders.vercel.app)" } });
    const t = await r.text();
    if (r.ok) { try { return JSON.parse(t).articles ?? []; } catch { return []; } }
    console.warn(r.status, t.slice(0, 80)); await sleep(8000 * (i + 1));
  }
  return [];
}

const results = {};
for (const [inv, aliases] of Object.entries(INVESTORS)) {
  const or = aliases.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" OR ");
  const q = `(${or}) (invests OR investment OR "funding round" OR "led by" OR backed OR stake OR raises) sourcelang:english`;
  const arts = await gdelt(q);
  await sleep(6000);
  const al = aliases.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pats = [
    ["raises-led-by", new RegExp(`^${NAME}\\s+(?:raises|secures|closes|lands|nets|gets)\\b.*?(?:${AMT})?.*?\\b(?:led by|from|backed by|with participation from|including|joined by)\\b.*?\\b(?:${al})\\b`, "")],
    ["investor-invests-in", new RegExp(`\\b(?:${al})\\b(?:'s?|’s)?(?:\\s+\\w+){0,2}\\s+(?:invests|to invest|will invest|invested|leads|led|backs|takes (?:a )?stake|bets)\\b.*?\\bin\\s+${NAME}`, "")],
    ["investor-backed", new RegExp(`\\b(?:${al})-backed\\s+${NAME}`, "")],
  ];
  const seen = new Set();
  const hits = [];
  for (const a of arts) {
    const title = a.title.replace(/\s+/g, " ").trim();
    if (seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());
    for (const [kind, re] of pats) {
      const m = title.match(re);
      if (!m) continue;
      const target = m[1].replace(/['’]s$/, "").trim();
      if (new RegExp(`^(?:${al})$`, "i").test(target)) continue;
      const amt = title.match(new RegExp(AMT, "i"));
      hits.push({ kind, target, amount: amt ? `$${amt[1]}${amt[2][0].toLowerCase() === "b" ? "B" : "M"}` : null, date: a.seendate.slice(0, 8), domain: a.domain, title, url: a.url });
      break;
    }
  }
  results[inv] = { articles: arts.length, hits };
  console.log(`${inv}: ${arts.length} articles, ${hits.length} candidate deals`);
  for (const h of hits.slice(0, 12)) console.log(`   [${h.kind}] ${h.target} ${h.amount ?? ""} | ${h.title.slice(0, 110)} (${h.domain})`);
}
await writeFile(new URL("./news-result.json", import.meta.url), JSON.stringify(results, null, 2));
