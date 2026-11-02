"use client";
import { useEffect, useState } from "react";
import { TradingView } from "@/components/TradingView";

type Ev = { date: string; time: string | null; kind: "econ" | "fed"; title: string; source: string };
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const daysUntil = (d: string) => Math.round((Date.parse(d + "T12:00:00Z") - Date.parse(today() + "T12:00:00Z")) / 86_400_000);
const when = (d: string) => {
  const n = daysUntil(d);
  const label = new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return n === 0 ? `Today · ${label}` : n === 1 ? `Tomorrow · ${label}` : `${label} · in ${n} days`;
};

export default function CalendarPage() {
  const [ev, setEv] = useState<Ev[] | null>(null);
  useEffect(() => { fetch("/data/events.json").then((r) => r.json()).then((d) => setEv(d.events)).catch(() => setEv([])); }, []);
  return (
    <div className="stack">
      <section className="card">
        <h1>Calendar</h1>
        <p className="muted">The US economic releases and Fed decisions that move markets, for the next 60 days, straight from the government&apos;s published schedules.</p>
        {ev === null ? <p className="muted">Loading…</p> : !ev.filter((e) => daysUntil(e.date) >= 0).length ? <p className="muted">Nothing scheduled.</p> : (
          <ul className="news">{ev.filter((e) => daysUntil(e.date) >= 0).map((e) => (
            <li key={e.date + e.title}>
              <span className={`pill${e.kind === "fed" ? " up" : ""}`}>{e.kind === "fed" ? "Fed" : "Economy"}</span> {e.title}
              <div className="muted small">{when(e.date)}{e.time ? ` · ${e.time}` : ""} · {e.source}</div>
            </li>
          ))}</ul>
        )}
      </section>
      <section className="card">
        <h2>Global economic calendar</h2>
        <TradingView widget="events" height={600} config={{ width: "100%", height: "100%", importanceFilter: "0,1", countryFilter: "us,eu,gb,jp,cn" }} label="Economic calendar by TradingView" />
      </section>
    </div>
  );
}
