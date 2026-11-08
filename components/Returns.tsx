// How a stock did after a trade, alone and against the S&P 500 (see lib/returns.mjs).
// One line per trade, and a small table summarising a person's buys and sales.
export type Pair = [number, number] | null; // [stock, S&P 500], fractions
export type RetSummary = { n: number; stock: number; spy: number; beat: number } | null;
export type RetSide = { trade: RetSummary; pub: RetSummary };

const pct = (x: number) => `${x > 0.0005 ? "+" : x < -0.0005 ? "−" : ""}${Math.abs(x * 100).toFixed(1)}%`;
const tone = (x: number) => (x > 0.0005 ? "up" : x < -0.0005 ? "down" : "");
const Pct = ({ x }: { x: number }) => <span className={`mono ${tone(x)}`}>{pct(x)}</span>;

const HELP = "Change in the stock price (with dividends) to the latest close, and the S&P 500 over the same days. 'Since the trade' starts on the trade date; 'since public' starts the first trading day after it was filed, when anyone could have acted on it.";

/** "Since the trade +12.3% (S&P 500 +4.1%) · since public +10.2% (S&P +3.9%)" */
export function ReturnLine({ trade, pub, sale = false }: { trade: Pair; pub: Pair; sale?: boolean }) {
  if (!trade && !pub) return null;
  return (
    <div className="retline small" title={HELP}>
      <span className="muted">{sale ? "Stock since the sale" : "Since the trade"}</span>{" "}
      {trade ? <><Pct x={trade[0]} /> <span className="muted">(S&amp;P 500 {pct(trade[1])})</span></> : <span className="muted">—</span>}
      <span className="muted"> · since public </span>
      {pub ? <><Pct x={pub[0]} /> <span className="muted">(S&amp;P {pct(pub[1])})</span></> : <span className="muted">—</span>}
    </div>
  );
}

/** Compact two-number cell for tables: stock and S&P over one window. */
export function ReturnCell({ p }: { p: Pair }) {
  if (!p) return <span className="muted">—</span>;
  return <><Pct x={p[0]} /><div className="muted small">S&amp;P {pct(p[1])}</div></>;
}

/** Table: after their buys / after their sales, from each starting point. */
export function ReturnsSummary({ buys, sells, asOf, who = "their" }: { buys?: RetSide | null; sells?: RetSide | null; asOf?: string | null; who?: string }) {
  const rows = ([["Buys", buys], ["Sales", sells]] as const).filter(([, s]) => s && (s.trade || s.pub));
  if (!rows.length) return null;
  const cell = (s: RetSummary) => s
    ? <><Pct x={s.stock} /> <span className="muted small">vs S&amp;P {pct(s.spy)}</span><div className="muted small">{Math.round(s.beat * 100)}% beat the S&amp;P · {s.n.toLocaleString("en-US")} trades</div></>
    : <span className="muted">—</span>;
  return (
    <section className="card flush">
      <div className="card-title"><h2>How {who} trades did <span className="muted small">median change to {asOf ? new Date(asOf + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "the latest close"}</span></h2></div>
      <table className="ttable fit">
        <thead><tr><th></th><th>Since the trade</th><th>Since it was public</th></tr></thead>
        <tbody>{rows.map(([label, s]) => (
          <tr key={label}><td><strong>{label}</strong></td><td>{cell(s!.trade)}</td><td>{cell(s!.pub)}</td></tr>
        ))}</tbody>
      </table>
      <p className="muted small pad">{HELP} For sales, a stock that then lagged the S&amp;P means the sale was well timed. Past trades don&apos;t predict future ones; see <a href="/research">our research</a>.</p>
    </section>
  );
}
