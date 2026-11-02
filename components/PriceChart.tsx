"use client";
import { useEffect, useRef } from "react";
import {
  createChart, AreaSeries, CandlestickSeries, HistogramSeries, LineSeries, ColorType, LineStyle,
  type IChartApi, type ISeriesApi, type SeriesType, type UTCTimestamp,
} from "lightweight-charts";
import type { Level } from "./useLevels";
import { rsi, sma } from "@/lib/indicators";

export type Candle = { time: number; open: number; high: number; low: number; close: number; volume?: number | null };
export type Indicators = { ma50: boolean; ma200: boolean; volume: boolean; rsi: boolean };
export type CompareLine = { symbol: string; candles: Candle[] };

const T = (t: number) => t as UTCTimestamp;

export function PriceChart({ candles, from, mode, levels = [], onPick, indicators, compare = [] }: {
  candles: Candle[];
  from?: number; // start of the visible period; earlier bars only warm up the indicators
  mode: "area" | "candles";
  levels?: Level[];
  onPick?: (price: number) => void; // tap on the chart → the price at that height
  indicators?: Indicators;
  compare?: CompareLine[]; // when set, every line shows % change from the start of the period
}) {
  const el = useRef<HTMLDivElement>(null);
  const pick = useRef(onPick);
  pick.current = onPick;
  const comparing = compare.length > 0;
  const showRsi = !comparing && !!indicators?.rsi;

  useEffect(() => {
    if (!el.current || !candles.length) return;
    const css = getComputedStyle(document.documentElement);
    const c = (v: string) => css.getPropertyValue(v).trim();
    const start = from ?? candles[0].time;
    const chart: IChartApi = createChart(el.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: c("--muted"), attributionLogo: true, panes: { separatorColor: c("--line") } },
      grid: { vertLines: { visible: false }, horzLines: { color: c("--line") } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      crosshair: { mode: 0 },
    });
    const times = candles.map((x) => x.time);
    const closes = candles.map((x) => x.close);
    let main: ISeriesApi<SeriesType>;

    if (comparing) {
      // Every symbol as % change from its first bar in the visible period.
      const pctLine = (cs: Candle[], color: string, width: 1 | 2 | 3 = 2) => {
        const base = cs.find((x) => x.time >= start)?.close;
        const s = chart.addSeries(LineSeries, { color, lineWidth: width, priceFormat: { type: "percent", precision: 1 }, lastValueVisible: true, priceLineVisible: false });
        if (base) s.setData(cs.filter((x) => x.time >= start).map((x) => ({ time: T(x.time), value: (x.close / base - 1) * 100 })));
        return s;
      };
      main = pctLine(candles, c("--text"), 3);
      compare.forEach((cl, i) => pctLine(cl.candles, c(`--cmp${i + 1}`)));
    } else {
      const up = candles.at(-1)!.close >= (candles.find((x) => x.time >= start)?.open ?? candles[0].open);
      const data = candles.map((x) => ({ ...x, time: T(x.time) }));
      if (mode === "candles") {
        const s = chart.addSeries(CandlestickSeries, { upColor: c("--up"), downColor: c("--down"), wickUpColor: c("--up"), wickDownColor: c("--down"), borderVisible: false });
        s.setData(data);
        main = s;
      } else {
        const color = up ? c("--up") : c("--down");
        const s = chart.addSeries(AreaSeries, { lineColor: color, topColor: color + "55", bottomColor: color + "00", lineWidth: 2 });
        s.setData(data.map((x) => ({ time: x.time, value: x.close })));
        main = s;
      }
      const line = (pts: { time: number; value: number }[], color: string) =>
        chart.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })
          .setData(pts.map((p) => ({ time: T(p.time), value: p.value })));
      if (indicators?.ma50) line(sma(times, closes, 50), c("--ma50"));
      if (indicators?.ma200) line(sma(times, closes, 200), c("--ma200"));
      if (indicators?.volume) {
        const vol = chart.addSeries(HistogramSeries, { priceScaleId: "volume", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false });
        vol.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        vol.setData(candles.filter((x) => x.volume != null).map((x) => ({ time: T(x.time), value: x.volume!, color: (x.close >= x.open ? c("--up") : c("--down")) + "66" })));
      }
      if (showRsi) {
        const r = chart.addSeries(LineSeries, { color: c("--rsi"), lineWidth: 1, priceLineVisible: false, lastValueVisible: true }, 1);
        r.setData(rsi(times, closes, 14).map((p) => ({ time: T(p.time), value: p.value })));
        for (const lvl of [70, 30]) r.createPriceLine({ price: lvl, color: c("--muted"), lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: "" });
        chart.panes()[0].setStretchFactor(3);
        chart.panes()[1].setStretchFactor(1);
      }
      for (const l of levels) {
        main.createPriceLine({ price: l.price, color: c("--level"), lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: l.note });
      }
      chart.subscribeClick((p) => {
        if (!p.point || !pick.current || (p.paneIndex ?? 0) !== 0) return;
        const price = main.coordinateToPrice(p.point.y);
        if (price != null) pick.current(Number(price));
      });
    }
    chart.timeScale().setVisibleRange({ from: T(start), to: T(candles.at(-1)!.time) });
    return () => chart.remove();
  }, [candles, from, mode, levels, indicators, compare, comparing, showRsi]);

  return <div ref={el} className={`chart${showRsi ? " tall" : ""}`} />;
}
