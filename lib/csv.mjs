// CSV for the export buttons: RFC 4180 quoting, and a guard against spreadsheet formula
// injection (a cell starting with = + - @ is prefixed with ' so Excel shows it as text).
// Exports carry what the filings say, never price-based returns (the price data isn't licensed for redistribution).

/** @param {Record<string, unknown>[]} rows @param {[key: string, header: string][]} cols */
export function toCsv(rows, cols) {
  const cell = (v) => {
    if (v == null) return "";
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.map(([, h]) => cell(h)).join(","), ...rows.map((r) => cols.map(([k]) => cell(r[k])).join(","))].join("\r\n") + "\r\n";
}
