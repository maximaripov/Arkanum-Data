import Link from "next/link";
import type { InsiderTrade } from "@/lib/sec";
import { fmtBig, fmtPrice } from "@/lib/format";

export const CODES: Record<string, string> = {
  P: "Buy", S: "Sale", A: "Award", M: "Option exercise", F: "Tax withholding", G: "Gift", D: "Return to issuer", C: "Conversion", X: "Option exercise", J: "Other",
};

export function InsiderTable({ trades, showSymbol }: { trades: InsiderTrade[]; showSymbol?: boolean }) {
  if (!trades.length) return <p className="muted">No insider transactions found.</p>;
  return (
    <div className="tablewrap">
      <table className="table">
        <thead>
          <tr>
            {showSymbol ? <th>Symbol</th> : null}
            <th className="hide-sm">Date</th><th>Insider</th><th>Type</th><th className="r hide-sm">Shares</th><th className="r hide-sm">Price</th><th className="r">Value</th><th className="r hide-sm">Owned after</th><th className="hide-sm"></th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => (
            <tr key={t.accession + i}>
              {showSymbol ? <td><Link href={`/stock/${t.symbol}`}><strong>{t.symbol}</strong></Link><div className="muted small ellipsis">{t.issuer}</div></td> : null}
              <td className="mono nowrap hide-sm">{t.date}</td>
              <td><div className="ellipsis">{t.owner}</div><div className="muted small ellipsis">{t.role}</div></td>
              <td>
                <span className={`pill ${t.code === "P" ? "up" : t.code === "S" ? "down" : ""}`}>{CODES[t.code] ?? t.code}</span>
                {t.planned ? <span className="muted small" title="Pre-scheduled under a Rule 10b5-1 plan"> plan</span> : null}
              </td>
              <td className="r mono hide-sm">{t.shares.toLocaleString()}</td>
              <td className="r mono hide-sm">{t.price ? fmtPrice(t.price) : "—"}</td>
              <td className="r mono">{t.value ? "$" + fmtBig(t.value) : "—"}<div className="muted small show-sm nowrap">{t.date}</div></td>
              <td className="r mono hide-sm">{t.ownedAfter != null ? fmtBig(t.ownedAfter) : "—"}</td>
              <td className="hide-sm"><a href={t.url} target="_blank" rel="noreferrer" className="muted small">SEC ↗</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
