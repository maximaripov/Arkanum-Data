"use client";
import { useEffect, useRef } from "react";
import { createChart, AreaSeries, CandlestickSeries, ColorType, LineStyle, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import type { Level } from "./useLevels";

export type Candle = { time: number; open: number; high: number; low: number; close: number };

export function PriceChart({ candles, mode, levels = [], onPick }: {
  candles: Candle[];
  mode: "area" | "candles";
  levels?: Level[];
  onPick?: (price: number) => void; // tap on the chart → the price at that height
}) {
  const el = useRef<HTMLDivElement>(null);
  const pick = useRef(onPick);
  pick.current = onPick;

  useEffect(() => {
    if (!el.current || !candles.length) return;
    const css = getComputedStyle(document.documentElement);
    const c = (v: string) => css.getPropertyValue(v).trim();
    const chart: IChartApi = createChart(el.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: c("--muted"), attributionLogo: true },
      grid: { vertLines: { visible: false }, horzLines: { color: c("--line") } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      crosshair: { mode: 0 },
    });
    const up = candles.at(-1)!.close >= candles[0].open;
    const data = candles.map((x) => ({ ...x, time: x.time as UTCTimestamp }));
    let series: ISeriesApi<"Candlestick"> | ISeriesApi<"Area">;
    if (mode === "candles") {
      const s = chart.addSeries(CandlestickSeries, { upColor: c("--up"), downColor: c("--down"), wickUpColor: c("--up"), wickDownColor: c("--down"), borderVisible: false });
      s.setData(data);
      series = s;
    } else {
      const color = up ? c("--up") : c("--down");
      const s = chart.addSeries(AreaSeries, { lineColor: color, topColor: color + "55", bottomColor: color + "00", lineWidth: 2 });
      s.setData(data.map((x) => ({ time: x.time, value: x.close })));
      series = s;
    }
    for (const l of levels) {
      series.createPriceLine({ price: l.price, color: c("--level"), lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: l.note });
    }
    chart.subscribeClick((p) => {
      if (!p.point || !pick.current) return;
      const price = series.coordinateToPrice(p.point.y);
      if (price != null) pick.current(Number(price));
    });
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [candles, mode, levels]);
  return <div ref={el} className="chart" />;
}
