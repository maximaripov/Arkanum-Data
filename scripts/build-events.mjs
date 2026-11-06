#!/usr/bin/env node
// Builds public/data/events.json: US economic releases and Fed decisions for the next
// 60 days, from public-domain government sources (BEA, Federal Reserve) and, with a free
// FRED_API_KEY (or else BLS's own calendar), the jobs report and CPI.
import { writeFile, mkdir } from "node:fs/promises";

const UA = process.env.SEC_USER_AGENT || "Arkanum (set SEC_USER_AGENT)";
const FRED = process.env.FRED_API_KEY;
const get = async (url, as = "text") => {
  try { const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) }); return r.ok ? (as === "json" ? r.json() : r.text()) : null; } catch { return null; }
};
const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const addDays = (ymd, n) => new Date(Date.parse(ymd + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
const end = addDays(today, 60);
const inWindow = (d) => d >= today && d <= end;
const events = [];
const sources = [];

// BEA: GDP and PCE inflation (Personal Income and Outlays). Big releases only.
const bea = await get("https://www.bea.gov/news/schedule/ics/online-calendar-subscription.ics");
if (bea) {
  sources.push("BEA");
  const BEA = [[/^GDP/i, "GDP"], [/Personal Income and Outlays/i, "PCE inflation, income & spending"]];
  for (const ev of bea.replace(/\r?\n[ \t]/g, "").split("BEGIN:VEVENT").slice(1)) {
    const start = ev.match(/DTSTART[^:]*:(\d{8})/), summary = ev.match(/SUMMARY[^:]*:(.*)/)?.[1]?.replace(/\\,/g, ",").trim();
    if (!start || !summary) continue;
    const label = BEA.find(([re]) => re.test(summary));
    if (!label || /State|County|Industry|Multinational/i.test(summary)) continue;
    const d = `${start[1].slice(0, 4)}-${start[1].slice(4, 6)}-${start[1].slice(6, 8)}`;
    const period = summary.includes(",") ? summary.split(",").at(-1).trim() : "";
    if (inWindow(d)) events.push({ date: d, time: "8:30 AM ET", kind: "econ", title: period ? `${label[1]} (${period})` : label[1], source: "BEA" });
  }
}

// Federal Reserve: rate decision on the second day of each FOMC meeting.
const fomc = await get("https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm");
if (fomc) {
  sources.push("Federal Reserve");
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  for (const year of [+today.slice(0, 4), +today.slice(0, 4) + 1]) {
    const i = fomc.indexOf(`${year} FOMC Meetings`);
    if (i < 0) continue;
    const next = fomc.indexOf("FOMC Meetings", i + 20);
    const seg = fomc.slice(i, next > 0 ? next : i + 20000);
    for (const [, month, days] of seg.matchAll(/fomc-meeting__month[^>]*>\s*<strong>([^<]+)<\/strong>[\s\S]*?fomc-meeting__date[^>]*>([^<]+)</g)) {
      const m = month.split("/").at(-1).trim();
      const mi = MONTHS.findIndex((x) => x.startsWith(m.slice(0, 3)));
      const day = Number(days.replace(/\*/, "").split("-").at(-1));
      if (mi < 0 || !day) continue;
      const d = `${year}-${String(mi + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (inWindow(d)) events.push({ date: d, time: "2:00 PM ET", kind: "fed", title: `Fed rate decision${days.includes("*") ? " + economic projections" : ""}`, source: "Federal Reserve" });
    }
  }
}

// FRED (optional free key): BLS releases.
if (FRED) {
  const d = await get(`https://api.stlouisfed.org/fred/releases/dates?api_key=${FRED}&file_type=json&realtime_start=${today}&realtime_end=${end}&include_release_dates_with_no_data=true&limit=1000&sort_order=asc`, "json");
  const WANT = [[/^Employment Situation$/i, "Jobs report"], [/^Consumer Price Index$/i, "CPI inflation"]]; // the market-moving ones
  if (d) sources.push("FRED");
  for (const r of d?.release_dates ?? []) {
    const hit = WANT.find(([re]) => re.test(r.release_name));
    if (hit && inWindow(r.date)) events.push({ date: r.date, time: "8:30 AM ET", kind: "econ", title: hit[1], source: "BLS via FRED" });
  }
}

// Without FRED: BLS's own release calendar (it refuses requests without contact details,
// which SEC_USER_AGENT carries). If it refuses anyway, Coming up just lacks jobs and CPI.
if (!sources.includes("FRED")) {
  const bls = await get("https://www.bls.gov/schedule/news_release/bls.ics");
  if (bls?.includes("BEGIN:VEVENT")) {
    sources.push("BLS");
    const BLS = [[/^Employment Situation\b/i, "Jobs report"], [/^Consumer Price Index\b/i, "CPI inflation"]];
    for (const ev of bls.replace(/\r?\n[ \t]/g, "").split("BEGIN:VEVENT").slice(1)) {
      const start = ev.match(/DTSTART[^:]*:(\d{8})/), summary = ev.match(/SUMMARY[^:]*:(.*)/)?.[1]?.replace(/\\,/g, ",").trim();
      const label = summary && BLS.find(([re]) => re.test(summary));
      if (!start || !label) continue;
      const d = `${start[1].slice(0, 4)}-${start[1].slice(4, 6)}-${start[1].slice(6, 8)}`;
      const period = summary.match(/\bfor (\w+ \d{4})/i)?.[1];
      if (inWindow(d)) events.push({ date: d, time: "8:30 AM ET", kind: "econ", title: period ? `${label[1]} (${period})` : label[1], source: "BLS" });
    }
  } else console.warn("BLS calendar unavailable; jobs and CPI dates skipped");
}

events.sort((a, b) => a.date.localeCompare(b.date));
await mkdir("public/data", { recursive: true });
await writeFile("public/data/events.json", JSON.stringify({ updated: new Date().toISOString(), sources, events }));
console.log(`events.json: ${events.length} events (${sources.join(", ")})`);
if (!bea && !fomc) process.exit(1);
