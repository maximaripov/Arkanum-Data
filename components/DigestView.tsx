// One digest (daily or the Saturday week in review), as built by scripts/daily-digest.mjs.
// Shared by the live Digest page and the dated archive pages, so it uses no hooks.
import Link from "next/link";
import { fmtBig } from "@/lib/format";

export type Digest = {
  kind: "daily" | "weekly"; date: string; from: string; when?: string; title: string; summary: string[];
  totals: { buys: number; value: number; insiders: number };
  buys: { symbol: string; company: string; name: string; role: string; value: number; date: string; filed: string; facts: string[] }[];
  clusters: { symbol: string; company: string; insiders: number; value: number }[];
  funds: { fund: string; filed: string; newPositions: string[]; soldOut: string[]; counts: { new: number; added: number; cut: number; sold: number } }[];
  events: { date: string; time: string | null; title: string; day: string }[];
};
export const isDigest = (x: any): x is Digest => Array.isArray(x?.summary) && Array.isArray(x?.buys);

const longDay = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
// The week in review runs on Saturday and covers Monday to Friday.
const dayBefore = (d: string) => new Date(Date.parse(d + "T12:00:00Z") - 86_400_000).toISOString().slice(0, 10);
const short = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const counts = (c: Digest["funds"][number]["counts"]) =>
  [c.new && `${c.new} new`, c.added && `${c.added} added`, c.cut && `${c.cut} cut`, c.sold && `${c.sold} sold out`].filter(Boolean).join(", ");

/** latest: shown under the Digest page's intro (a section heading); otherwise the page's own title. */
export function DigestView({ d, latest = false }: { d: Digest; latest?: boolean }) {
  const week = d.kind === "weekly";
  const when = week ? "this week" : d.when ?? "today";
  return (
    <>
      <section className="card">
        {latest ? <h2>{week ? "Week in review" : "Latest digest"}</h2> : <h1>{week ? "Week in review" : "Daily digest"}</h1>}
        <p className="muted small">{week ? `${longDay(d.from)} to ${longDay(dayBefore(d.date))}` : longDay(d.date)} · filings by company executives and directors</p>
        <h2 className="subhead">In 30 seconds</h2>
        <ul className="summary">{d.summary.map((s) => <li key={s}>{s}</li>)}</ul>
      </section>
      <div className="twocol">
        <section className="card">
          <div className="card-head"><h2>Biggest insider buys</h2><Link href="/?view=trades" className="small">All trades ›</Link></div>
          <p className="muted small">{d.totals.buys ? `${d.totals.buys} ${d.totals.buys === 1 ? "buy" : "buys"} filed ${when}, $${fmtBig(d.totals.value)} in total.` : `None filed ${when}.`}</p>
          {d.buys.length ? <ul className="rows">{d.buys.map((t, i) => (
            <li key={i}><Link href={`/stock/${t.symbol}`} className="row-link">
              <div className="row-main">
                <div><strong>{t.symbol}</strong> <span className="muted">{t.company}</span></div>
                <div className="small muted">{t.name} ({t.role}){week ? ` · ${short(t.date)}` : ""}</div>
                {t.facts.length ? <div className="signal">{t.facts.map((f) => <span key={f} className="why">{f}</span>)}</div> : null}
              </div>
              <div className="row-value up mono">${fmtBig(t.value)}</div>
            </Link></li>
          ))}</ul> : null}
        </section>
        <section className="card">
          <div className="card-head"><h2>Buying together</h2><Link href="/?view=groups" className="small">More ›</Link></div>
          <p className="muted small">2+ executives or directors buying the same stock {week ? "this week" : "over the past week"}.</p>
          {d.clusters.length ? <ul className="rows">{d.clusters.map((c) => (
            <li key={c.symbol}><Link href={`/stock/${c.symbol}`} className="row-link">
              <div className="row-main"><div><strong>{c.symbol}</strong> <span className="muted">{c.company}</span></div><div className="small up">{c.insiders} insiders</div></div>
              <div className="row-value up mono">${fmtBig(c.value)}</div>
            </Link></li>
          ))}</ul> : <p className="muted">None {week ? "this week" : "over the past week"}.</p>}
        </section>
        {/* Funds file quarterly (mid-Feb, May, Aug, Nov), so most days this is left out. */}
        {d.funds.length ? (
          <section className="card">
            <div className="card-head"><h2>Big-fund filings</h2><Link href="/stakes?view=funds" className="small">All funds ›</Link></div>
            <ul className="rows">{d.funds.map((f) => (
              <li key={f.fund} className="row-static"><div className="row-main">
                <strong>{f.fund}</strong>
                <div className="small muted">{counts(f.counts) || "No changes"}{f.newPositions.length ? <> · new: {f.newPositions.join(", ")}</> : null}</div>
              </div></li>
            ))}</ul>
          </section>
        ) : null}
        <section className="card">
          <div className="card-head"><h2>Coming up</h2><span className="muted small">big US releases</span></div>
          {d.events.length ? <ul className="rows">{d.events.map((e) => (
            <li key={e.date + e.title} className="row-static">
              <div className="row-main"><strong>{e.title.replace(/ \(.*\)$/, "")}</strong></div>
              <div className="row-value small">{e.day}<div className="muted">{e.time ?? ""}</div></div>
            </li>
          ))}</ul> : <p className="muted">Nothing major in the next week.</p>}
        </section>
      </div>
    </>
  );
}

/** Links to recent digests, newest first. */
export function PastDigests({ list, all = false }: { list: { date: string; kind: string; title: string; lead?: string }[]; all?: boolean }) {
  if (!list.length) return null;
  return (
    <section className="card">
      <div className="card-head"><h2>{all ? "All digests" : "Past digests"}</h2>{!all && list.length > 7 ? <Link href="/briefing/archive" className="small">All ›</Link> : null}</div>
      <ul className="rows">{(all ? list : list.slice(0, 7)).map((x) => (
        <li key={x.date}><Link href={`/briefing/${x.date}`} className="row-link">
          <div className="row-main"><div><strong>{x.title}</strong></div>{x.lead ? <div className="small muted">{x.lead}</div> : null}</div>
        </Link></li>
      ))}</ul>
    </section>
  );
}
