"use client";
/** Opens the browser's print dialog, where "Save as PDF" saves the paper. */
export function PrintButton() {
  return <button className="btn primary" onClick={() => window.print()}>Save as PDF</button>;
}
