"use client";
import { useEffect, useRef } from "react";
import { createChart, AreaSeries, CandlestickSeries, ColorType, type IChartApi, type UTCTimestamp } from "lightweight-charts";

export type Candle = { time: number; open: number; high: number; low: number; close: number };

export function PriceChart({ candles, mode }: { candles: Candle[]; mode: "area" | "candles" }) {
  const el = useRef<HTMLDivElement>(null);
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
    if (mode === "candles") {
      chart.addSeries(CandlestickSeries, { upColor: c("--up"), downColor: c("--down"), wickUpColor: c("--up"), wickDownColor: c("--down"), borderVisible: false }).setData(data);
    } else {
      const color = up ? c("--up") : c("--down");
      chart.addSeries(AreaSeries, { lineColor: color, topColor: color + "55", bottomColor: color + "00", lineWidth: 2 })
        .setData(data.map((x) => ({ time: x.time, value: x.close })));
    }
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [candles, mode]);
  return <div ref={el} className="chart" />;
}
