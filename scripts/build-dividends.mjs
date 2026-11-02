#!/usr/bin/env node
// Builds public/data/dividends.json: every dividend declared on US exchanges with an
// ex-dividend date in the next 5 weeks (Nasdaq's dividend calendar). Runs in the 4 PM job.
import { writeFile, mkdir } from "node:fs/promises";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ymd = (d) => d.toISOString().slice(0, 10);
const us = (s) => { const m = String(s ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? `${m[3]}-${m[1]}-${m[2]}` : null; };

const rows = {};
let days = 0, failed = 0;
for (let k = 0; k <= 35; k++) {
  const d = new Date(Date.now() + k * 86_400_000);
  if ([0, 6].includes(d.getUTCDay())) continue;
  days++;
  try {
    const r = await fetch(`https://api.nasdaq.com/api/calendar/dividends?date=${ymd(d)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Foresight personal app)", Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    const list = (await r.json())?.data?.calendar?.rows ?? [];
    for (const x of list) {
      const ex = us(x.dividend_Ex_Date);
      if (!x.symbol || !ex) continue;
      const sym = String(x.symbol).toUpperCase().replace(/\./g, "-");
      if (rows[sym] && rows[sym].ex <= ex) continue; // keep the soonest
      rows[sym] = { ex, pay: us(x.payment_Date), amount: Number(x.dividend_Rate) || null, annual: Number(x.indicated_Annual_Dividend) || null };
    }
  } catch { failed++; }
  await sleep(300);
}
await mkdir("public/data", { recursive: true });
await writeFile("public/data/dividends.json", JSON.stringify({ updated: new Date().toISOString(), days, failed, rows }));
console.log(`dividends.json: ${Object.keys(rows).length} upcoming dividends over ${days} weekdays (${failed} days failed)`);
if (failed > days / 2) process.exit(1); // mostly failed: let the health check report it
