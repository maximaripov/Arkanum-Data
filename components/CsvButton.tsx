"use client";
// "Download CSV (opens in Excel)": builds the file in the browser from data the page already
// has, so it costs no server time. Raw filing data only (see lib/csv.mjs).
import { toCsv } from "@/lib/csv.mjs";

export function CsvButton({ rows, cols, file }: { rows: Record<string, unknown>[]; cols: [string, string][]; file: string }) {
  if (!rows.length) return null;
  const download = () => {
    const url = URL.createObjectURL(new Blob(["﻿" + toCsv(rows, cols)], { type: "text/csv;charset=utf-8" })); // BOM: Excel reads UTF-8 names correctly
    const a = Object.assign(document.createElement("a"), { href: url, download: `${file}-${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <button className="linkbtn csv-btn" onClick={download} title="A spreadsheet of these rows as filed, with links to each filing">Download CSV <span className="muted">(opens in Excel)</span></button>;
}
