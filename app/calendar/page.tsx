"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWatchlist } from "@/components/useWatchlist";
import { CalendarCard, daysUntil, money, when, type CalendarInfo as Info } from "@/components/CalendarCard";

type Event = { date: string; symbol: string; kind: "earnings" | "ex" | "pay"; text: string; tentative: boolean };

export default function CalendarPage() {
  const { list } = useWatchlist();
  const [data, setData] = useState<Record<string, Info> | null>(null);
  const key = list.join(",");
  useEffect(() => {
    if (!key) return;
    setData(null);
    fetch(`/api/calendar?symbols=${encodeURIComponent(key)}`).then((r) => r.json()).then(setData).catch(() => setData({}));
  }, [key]);

  const events = useMemo(() => {
    const out: Event[] = [];
    for (const [s, i] of Object.entries(data ?? {})) {
      const e = i.earnings?.next, d = i.dividends?.next;
      if (e) out.push({ date: e.date, symbol: s, kind: "earnings", text: `Earnings${e.time ? `, ${e.time}` : ""}${e.epsEstimate != null ? ` · EPS est. ${money(e.epsEstimate)}` : ""}`, tentative: !e.confirmed });
      if (d) {
        out.push({ date: d.ex, symbol: s, kind: "ex", text: `Ex-dividend${d.amount ? ` · ~${money(d.amount)}/share` : ""} (buy before this date to get it)`, tentative: d.estimated });
        if (d.pay) out.push({ date: d.pay, symbol: s, kind: "pay", text: `Dividend paid${d.amount ? ` · ${money(d.amount)}/share` : ""}`, tentative: false });
      }
    }
    return out.filter((x) => daysUntil(x.date) >= 0 && daysUntil(x.date) <= 90).sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  return (
    <div className="stack">
      <section className="card">
        <h1>Calendar</h1>
        <p className="muted">Earnings and dividends for your watchlist over the next 90 days. Dates marked &quot;estimated&quot; aren&apos;t announced yet: earnings dates come from analysts&apos; models, dividend dates from each company&apos;s past payments.</p>
        {!list.length ? <p className="muted">Your watchlist is empty. Add stocks with ☆ on any stock page.</p> : data === null ? <p className="muted">Loading…</p> : events.length ? (
          <ul className="news">{events.map((x, i) => (
            <li key={i}>
              <span className={`pill${x.kind === "earnings" ? " up" : ""}`}>{x.kind === "earnings" ? "Earnings" : x.kind === "ex" ? "Ex-dividend" : "Payment"}</span>{" "}
              <Link href={`/stock/${encodeURIComponent(x.symbol)}`}><strong>{x.symbol}</strong></Link> {x.text}{x.tentative ? <span className="muted"> · estimated</span> : null}
              <div className="muted small">{when(x.date)}</div>
            </li>
          ))}</ul>
        ) : <p className="muted">Nothing scheduled in the next 90 days.</p>}
      </section>
      {data ? <div className="grid">{list.filter((s) => data[s]).map((s) => <CalendarCard key={s} symbol={s} info={data[s]} />)}</div> : null}
    </div>
  );
}
