"use client";
// The next few big US economic releases and Fed decisions (BEA, Federal Reserve).
import { useEffect, useState } from "react";
import { EVENT_INFO, eventDay } from "@/lib/events";
import { isUpcoming } from "@/lib/digest.mjs";

type Ev = { date: string; time: string | null; kind: string; title: string };

export function ComingUp({ limit = 4 }: { limit?: number }) {
  const [ev, setEv] = useState<Ev[] | null>(null);
  useEffect(() => {
    // Releases already out today (an 8:30 AM report, by the afternoon) are no longer "coming up".
    fetch("/data/events.json").then((r) => r.json()).then((d) => setEv(d.events.filter((e: Ev) => isUpcoming(e)).slice(0, limit))).catch(() => setEv([]));
  }, [limit]);
  return (
    <section className="card">
      <div className="card-head"><h2>Coming up</h2><span className="muted small">big US releases</span></div>
      {ev === null ? <p className="muted">Loading…</p> : !ev.length ? <p className="muted">No major US releases scheduled soon.</p> : (
        <ul className="rows">{ev.map((e) => (
          <li key={e.date + e.title} className="row-static">
            <div className="row-main"><div><strong>{e.title.replace(/ \(.*\)$/, "")}</strong></div><div className="small muted">{EVENT_INFO(e).short}</div></div>
            <div className="row-value small">{eventDay(e.date)}<div className="muted">{e.time ?? ""}</div></div>
          </li>
        ))}</ul>
      )}
    </section>
  );
}
