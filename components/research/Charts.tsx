// Charts for the research paper, drawn as plain SVG on the server (no chart library, no
// client code). Direction is shown by position and a signed label as well as colour, so
// they read the same for colour-blind readers and in print. Each mark has a hover title.

const pct = (v: number, digits = 1) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}%`;
const tone = (v: number) => (v > 0.05 ? "var(--up)" : v < -0.05 ? "var(--down)" : "var(--muted)");

export function Figure({ n, title, note, children }: { n: number; title: string; note?: string; children: React.ReactNode }) {
  return (
    <figure className="paper-figure">
      <figcaption><strong>Figure {n}.</strong> {title}</figcaption>
      {children}
      {note ? <p className="paper-figure-note">{note}</p> : null}
    </figure>
  );
}

type Row = { label: string; value: number; n?: number };
// Two layouts per chart: wide (label beside the bar) and narrow for phones (label above the
// bar, fewer gridlines), so text stays a readable size. CSS shows one of them.
const LAYOUT = {
  wide: { W: 640, rowH: 26, labelW: 230, valueW: 64 },
  narrow: { W: 340, rowH: 40, labelW: 0, valueW: 58 },
};
function Both({ draw }: { draw: (narrow: boolean) => React.ReactNode }) {
  return <><div className="chart-wide">{draw(false)}</div><div className="chart-narrow">{draw(true)}</div></>;
}
/** Where a row's label, bar and value go in either layout. */
function rowGeom(narrow: boolean, i: number, top: number) {
  const L = narrow ? LAYOUT.narrow : LAYOUT.wide;
  const y = top + i * L.rowH;
  return narrow
    ? { y, labelX: 4, labelY: y + 13, anchor: "start" as const, barY: y + 20, barH: 12, mid: y + 26, valueY: y + 30 }
    : { y, labelX: L.labelW - 10, labelY: y + L.rowH / 2 + 4, anchor: "end" as const, barY: y + 6, barH: L.rowH - 12, mid: y + L.rowH / 2, valueY: y + L.rowH / 2 + 4 };
}

/** Horizontal bars either side of zero, one per row: "how far above or below". */
export function DivergingBars({ rows, label = "Median 6-month return vs the month's typical insider buy" }: { rows: Row[]; label?: string }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  const lim = Math.ceil(max / 2) * 2; // even, so the halfway gridlines land on whole percentages
  return <Both draw={(narrow) => {
    const L = narrow ? LAYOUT.narrow : LAYOUT.wide, top = 8, bottom = 26;
    const plotL = narrow ? 4 : L.labelW, plotR = L.W - L.valueW, H = top + rows.length * L.rowH + bottom;
    const x = (v: number) => plotL + ((v + lim) / (2 * lim)) * (plotR - plotL);
    const ticks = narrow ? [-lim, 0, lim] : [-lim, -lim / 2, 0, lim / 2, lim];
    return (
      <svg viewBox={`0 0 ${L.W} ${H}`} className="paper-chart" role="img" aria-label={label}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={top} y2={H - bottom} stroke="var(--line)" strokeWidth={t === 0 ? 1.5 : 1} strokeDasharray={t === 0 ? undefined : "2 4"} />
            <text x={x(t)} y={H - 8} textAnchor={narrow && t === -lim ? "start" : narrow && t === lim ? "end" : "middle"} className="paper-tick">{pct(t, 0)}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const g = rowGeom(narrow, i, top), x0 = x(0), x1 = x(r.value);
          return (
            <g key={r.label}>
              <title>{`${r.label}: ${pct(r.value)}${r.n ? ` (${r.n.toLocaleString("en-US")} purchases)` : ""}`}</title>
              <rect x={0} y={g.y} width={L.W} height={L.rowH} fill="transparent" />
              <text x={g.labelX} y={g.labelY} textAnchor={g.anchor} className="paper-label">{r.label}</text>
              <rect x={Math.min(x0, x1)} y={g.barY} width={Math.max(1.5, Math.abs(x1 - x0))} height={g.barH} rx={2} fill={tone(r.value)} />
              <text x={L.W - 4} y={g.valueY} textAnchor="end" className="paper-value">{pct(r.value)}</text>
            </g>
          );
        })}
      </svg>
    );
  }} />;
}

/** One dot per row on a 35–60% scale, with a reference line (50% = a coin flip). */
/** `verb` words the hover ("beat it"); `invert` colours above the line red (for sales, more doing worse is bad for the stock). */
export function DotPlot({ rows, refValue = 50, label = "Share that beat the benchmark", verb = "beat it", invert = false }: { rows: Row[]; refValue?: number; label?: string; verb?: string; invert?: boolean }) {
  const lo = 35, hi = 60;
  return <Both draw={(narrow) => {
    const L = narrow ? LAYOUT.narrow : LAYOUT.wide, top = 8, bottom = 26;
    const plotL = narrow ? 8 : L.labelW, plotR = L.W - L.valueW, H = top + rows.length * L.rowH + bottom;
    const x = (v: number) => plotL + ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (plotR - plotL);
    const ticks = narrow ? [40, 50, 60] : [35, 40, 45, 50, 55, 60];
    return (
      <svg viewBox={`0 0 ${L.W} ${H}`} className="paper-chart" role="img" aria-label={label}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={top} y2={H - bottom} stroke="var(--line)" strokeWidth={t === refValue ? 1.5 : 1} strokeDasharray={t === refValue ? undefined : "2 4"} />
            <text x={x(t)} y={H - 8} textAnchor="middle" className="paper-tick">{t}%</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const g = rowGeom(narrow, i, top);
          return (
            <g key={r.label}>
              <title>{`${r.label}: ${r.value.toFixed(1)}% ${verb}${r.n ? ` (${r.n.toLocaleString("en-US")} purchases)` : ""}`}</title>
              <rect x={0} y={g.y} width={L.W} height={L.rowH} fill="transparent" />
              <text x={g.labelX} y={g.labelY} textAnchor={g.anchor} className="paper-label">{r.label}</text>
              <line x1={x(refValue)} x2={x(r.value)} y1={g.mid} y2={g.mid} stroke="var(--line)" strokeWidth={2} />
              <circle cx={x(r.value)} cy={g.mid} r={5} fill={tone(invert ? refValue - r.value : r.value - refValue)} stroke="var(--card)" strokeWidth={2} />
              <text x={L.W - 4} y={g.valueY} textAnchor="end" className="paper-value">{r.value.toFixed(1)}%</text>
            </g>
          );
        })}
      </svg>
    );
  }} />;
}

/** Small vertical bars for a few categories (e.g. 1, 3, 6 months), above or below zero. */
export function ColumnPanel({ title, cols, lim }: { title: string; cols: { label: string; value: number }[]; lim: number }) {
  const W = 200, H = 170, top = 22, bottom = 30, left = 8, right = 8;
  const y = (v: number) => top + ((lim - v) / (2 * lim)) * (H - top - bottom);
  const bw = (W - left - right) / cols.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="paper-chart panel" role="img" aria-label={title}>
      <text x={W / 2} y={13} textAnchor="middle" className="paper-label strong">{title}</text>
      <line x1={left} x2={W - right} y1={y(0)} y2={y(0)} stroke="var(--line)" strokeWidth={1.5} />
      {cols.map((c, i) => {
        const cx = left + i * bw + bw / 2, y0 = y(0), y1 = y(c.value);
        return (
          <g key={c.label}>
            <title>{`${title}, ${c.label}: ${pct(c.value)}`}</title>
            <rect x={cx - bw / 2} y={top} width={bw} height={H - top - bottom} fill="transparent" />
            <rect x={cx - bw * 0.28} y={Math.min(y0, y1)} width={bw * 0.56} height={Math.max(1.5, Math.abs(y1 - y0))} rx={2} fill={tone(c.value)} />
            <text x={cx} y={c.value >= 0 ? Math.min(y0, y1) - 5 : Math.max(y0, y1) + 13} textAnchor="middle" className="paper-value small">{pct(c.value)}</text>
            <text x={cx} y={H - 10} textAnchor="middle" className="paper-tick">{c.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
