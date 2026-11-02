"use client";
import { useEffect, useState } from "react";
import { EVENT_INFO } from "@/lib/events";

type Ev = { date: string; time: string | null; kind: "econ" | "fed"; title: string; source: string };
const todayNY = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const daysUntil = (d: string) => Math.round((Date.parse(d + "T12:00:00Z") - Date.parse(todayNY() + "T12:00:00Z")) / 86_400_000);
const longDay = (d: string) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

/** Which group an event falls in, by calendar week (Mon–Sun). */
function group(d: string) {
  const n = daysUntil(d);
  const dow = (new Date(todayNY() + "T12:00:00Z").getUTCDay() + 6) % 7; // 0 = Monday
  if (n <= 6 - dow) return "This week";
  if (n <= 13 - dow) return "Next week";
  return "Later";
}

/** A one-event .ics file, so it can be added to the phone's calendar. */
function icsHref(e: Ev) {
  const m = (e.time ?? "").match(/(\d+):(\d+) (AM|PM)/);
  let h = m ? +m[1] % 12 + (m[3] === "PM" ? 12 : 0) : 9, min = m ? +m[2] : 0;
  const stamp = `${e.date.replace(/-/g, "")}T${String(h).padStart(2, "0")}${String(min).padStart(2, "0")}00`;
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Foresight//EN", "BEGIN:VEVENT", `UID:${e.date}-${e.title.replace(/\W/g, "")}@foresight`,
    `DTSTART;TZID=America/New_York:${stamp}`, "DURATION:PT30M", `SUMMARY:${e.title}`, `DESCRIPTION:${EVENT_INFO(e).short} (${e.source})`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export default function CalendarPage() {
  const [ev, setEv] = useState<Ev[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { fetch("/data/events.json").then((r) => r.json()).then((d) => setEv(d.events.filter((e: Ev) => daysUntil(e.date) >= 0))).catch(() => setEv([])); }, []);
  const groups = new Map<string, Ev[]>();
  for (const e of ev ?? []) { const g = group(e.date); if (!groups.has(g)) groups.set(g, []); groups.get(g)!.push(e); }
  return (
    <div className="stack">
      <section className="card">
        <h1>Economic calendar</h1>
        <p className="muted">The US data releases and Federal Reserve decisions that move markets, from the government&apos;s own schedules. Times are Eastern; markets often jump the moment the numbers come out.</p>
      </section>
      {ev === null ? <section className="card"><p className="muted">Loading…</p></section> : !ev.length ? <section className="card"><p className="muted">Nothing scheduled in the next 60 days.</p></section> : [...groups].map(([g, list]) => (
        <section className="card" key={g}>
          <h2>{g}</h2>
          <ul className="events">{list.map((e) => {
            const id = e.date + e.title, info = EVENT_INFO(e), n = daysUntil(e.date);
            return (
              <li key={id} className="event">
                <div className="event-date"><div className="event-dow">{new Date(e.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short" })}</div><div className="event-dom">{+e.date.slice(8)}</div><div className="muted small">{new Date(e.date + "T12:00:00").toLocaleDateString(undefined, { month: "short" })}</div></div>
                <div className="event-body">
                  <div><span className={`badge${e.kind === "fed" ? " up" : ""}`}>{e.kind === "fed" ? "Fed" : "Economy"}</span><strong>{e.title}</strong></div>
                  <div className="small">{info.short}</div>
                  <div className="muted small">{n === 0 ? "Today" : n === 1 ? "Tomorrow" : `In ${n} days`}{e.time ? ` · ${e.time}` : ""} · {e.source}</div>
                  {open === id ? <p className="small event-more">{info.long}</p> : null}
                  <div className="event-actions">
                    {info.long ? <button className="linkbtn" onClick={() => setOpen(open === id ? null : id)}>{open === id ? "Less" : "What is this?"}</button> : null}
                    <a className="linkbtn" href={icsHref(e)} download={`${e.title.replace(/\W+/g, "-")}.ics`} title={`Add to calendar: ${longDay(e.date)}`}>Add to calendar</a>
                  </div>
                </div>
              </li>
            );
          })}</ul>
        </section>
      ))}
    </div>
  );
}
