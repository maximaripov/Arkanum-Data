import Link from "next/link";
import { Sparkline } from "./Sparkline";
import { fmtPct, fmtPrice, tone } from "@/lib/format";

export function QuoteRow(props: { symbol: string; label?: string; price: number | null; changePct: number | null; spark?: number[]; live?: boolean; onRemove?: () => void }) {
  const { symbol, label, price, changePct, spark = [], live, onRemove } = props;
  return (
    <div className="qrow">
      <Link href={`/stock/${encodeURIComponent(symbol)}`} className="qname">
        <strong>{label ?? symbol}</strong>
        <span className="muted">{label ? symbol : ""}{live ? <span className="live" title="Streaming"> ● live</span> : null}</span>
      </Link>
      <Sparkline data={spark} up={(changePct ?? 0) >= 0} />
      <div className="qnum">
        <div className="mono">{fmtPrice(price)}</div>
        <div className={`mono small ${tone(changePct)}`}>{fmtPct(changePct)}</div>
      </div>
      {onRemove ? <button className="icon" onClick={onRemove} aria-label={`Remove ${symbol}`}>×</button> : null}
    </div>
  );
}
