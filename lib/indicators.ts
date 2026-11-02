// Chart indicators, computed on the bars of the chart's own timeframe (as most charting
// tools do): on a daily chart "MA 50" is 50 days, on a 15-minute chart it's 50 bars.
export type Point = { time: number; value: number };

/** Simple moving average of closes. */
export function sma(times: number[], closes: number[], n: number): Point[] {
  const out: Point[] = [];
  let sum = 0;
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i];
    if (i >= n) sum -= closes[i - n];
    if (i >= n - 1) out.push({ time: times[i], value: sum / n });
  }
  return out;
}

/** Relative Strength Index with Wilder's smoothing (the standard 14-period RSI). */
export function rsi(times: number[], closes: number[], n = 14): Point[] {
  const out: Point[] = [];
  if (closes.length <= n) return out;
  let gain = 0, loss = 0;
  for (let i = 1; i <= n; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gain += d; else loss -= d;
  }
  gain /= n; loss /= n;
  const value = () => (loss === 0 ? 100 : 100 - 100 / (1 + gain / loss));
  out.push({ time: times[n], value: value() });
  for (let i = n + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gain = (gain * (n - 1) + Math.max(d, 0)) / n;
    loss = (loss * (n - 1) + Math.max(-d, 0)) / n;
    out.push({ time: times[i], value: value() });
  }
  return out;
}
