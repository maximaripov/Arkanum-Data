"use client";
// Embeds a free TradingView widget. TradingView's terms allow widgets on other sites only
// with their attribution kept "as originally designed", so the copyright link below
// must stay. Stock prices in widgets are delayed; forex and crypto are real-time.
import { useEffect, useRef, useState } from "react";

// Must match --card and --line in globals.css.
const BLEND = {
  dark: { backgroundColor: "#12161f", gridColor: "rgba(31, 38, 51, 0.5)" },
  light: { backgroundColor: "#ffffff", gridColor: "rgba(229, 231, 235, 0.6)" },
};

export function TradingView({ widget, config, height, label, blend }: {
  widget: string; // e.g. "advanced-chart" → embed-widget-advanced-chart.js
  config: Record<string, unknown>;
  height: number | string;
  label?: string; // attribution text
  blend?: boolean; // chart widgets: use the page's card color and faint grid so it looks part of the page
}) {
  const box = useRef<HTMLDivElement>(null);
  // Unknown until the browser reports it: embedding before that and again after would leave
  // the first script running against a removed element (and load every widget twice).
  const [theme, setTheme] = useState<"dark" | "light" | null>(null);
  useEffect(() => {
    const m = matchMedia("(prefers-color-scheme: light)");
    const on = () => setTheme(m.matches ? "light" : "dark");
    on(); m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  const key = JSON.stringify(config) + theme;
  useEffect(() => {
    const el = box.current;
    if (!el || !theme) return;
    el.innerHTML = "";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    el.appendChild(inner);
    const s = document.createElement("script");
    s.src = `https://s3.tradingview.com/external-embedding/embed-widget-${widget}.js`;
    s.async = true;
    s.type = "text/javascript";
    // Transparent mode shows white behind some widgets in dark mode, so let TradingView
    // draw its own background matching the theme.
    s.innerHTML = JSON.stringify({ colorTheme: theme, theme, isTransparent: false, locale: "en", ...(blend ? BLEND[theme] : {}), ...config });
    el.appendChild(s);
    return () => { el.innerHTML = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, widget]);
  return (
    <div className="tradingview-widget-container tv" style={{ height }}>
      <div ref={box} style={{ height: "calc(100% - 24px)" }} />
      <div className="tradingview-widget-copyright small">
        <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank"><span className="tvlink">{label ?? "Market data by TradingView"}</span></a>
      </div>
    </div>
  );
}
