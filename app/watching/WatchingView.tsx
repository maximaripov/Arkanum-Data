"use client";
// Everything this device watches, in one place: stocks on the watchlist, insiders, House members
// and funds it follows, with what's new since the last visit to this page. Nothing leaves the
// device except the watchlist lookup (no accounts); the last-visit time is kept in localStorage.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useWatchlist } from "@/components/useWatchlist";
import { useFollowing, type Followed } from "@/components/useFollowing";
import { fmtBig } from "@/lib/format";

const SEEN = "arkanum.watching.seen";
type WatchItem = { t: string; name: string | null; insiders: { buys: number; buyValue: number; sells: number; sellValue: number }; funds: { bought: string[]; sold: string[] } };
type MemberFile = { member: { m: string; last: string }; trades: { f: string; t: string; y: string }[] };
type Fund = { cik: number; name: string; who: string; period: string; filed: string; new: { t: string | null; name: string }[]; sold: { t: string | null; name: string }[] };

const day = (d: string) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const quarter = (p: string) => { const [y, m] = p.split("-"); return `Q${Math.ceil(+m / 3)} ${y}`; };
const New = () => <span className="new-tag">New</span>;

export function WatchingView() {
  const { list: tickers } = useWatchlist();
  const { list: following } = useFollowing();
  const [since, setSince] = useState<string | null>(null);
  const [stocks, setStocks] = useState<WatchItem[] | null>(null);
  const [members, setMembers] = useState<Record<string, MemberFile | null>>({});
  const [funds, setFunds] = useState<Fund[] | null>(null);

  // The previous visit marks what's new; this visit becomes the next "since".
  useEffect(() => {
    let prev: string | null = null;
    try { prev = localStorage.getItem(SEEN); localStorage.setItem(SEEN, new Date().toISOString().slice(0, 10)); } catch {}
    setSince(prev);
  }, []);
  const houses = following.filter((f) => f.cik.startsWith("house:"));
  const fundIds = following.filter((f) => f.cik.startsWith("fund:")).map((f) => Number(f.cik.slice(5)));
  const people = following.filter((f) => /^\d+$/.test(f.cik));

  useEffect(() => {
    if (!tickers.length) { setStocks([]); return; }
    fetch(`/api/watch?symbols=${encodeURIComponent(tickers.join(","))}`).then((r) => r.json()).then(setStocks).catch(() => setStocks([]));
  }, [tickers]);
  useEffect(() => {
    for (const h of houses) {
      const slug = h.cik.slice(6);
      if (slug in members) continue;
      fetch(`/data/congress/${slug}.json`).then((r) => (r.ok ? r.json() : null)).then((d) => setMembers((m) => ({ ...m, [slug]: d }))).catch(() => setMembers((m) => ({ ...m, [slug]: null })));
    }
  }, [houses.map((h) => h.cik).join()]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!fundIds.length) { setFunds([]); return; }
    fetch("/data/funds.json").then((r) => r.json()).then((d) => setFunds(d.funds)).catch(() => setFunds([]));
  }, [fundIds.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const isNew = (date?: string | null) => !!since && !!date && date > since;
  const nothing = !tickers.length && !following.length;
  return (
    <div className="stack">
      <section className="card">
        <h1>Watching</h1>
        <p className="muted">Stocks on your watchlist and the insiders, House members and funds you follow, on this device.{since ? <> Marked <New /> if it happened since your last visit ({day(since)}).</> : " Next time, anything new since today will be marked."} With <Link href="/briefing#notify">notifications</Link> on, you also get an alert when they trade.</p>
        {nothing ? <p>Nothing yet. Add a stock to your watchlist from its page, or press <strong>Follow</strong> on an insider, a <Link href="/congress">House member</Link> or a <Link href="/stakes?view=funds">fund</Link>.</p> : null}
      </section>

      {tickers.length ? (
        <section className="card flush">
          <div className="card-title"><h2>Stocks <span className="muted small">insider trades in the last 30 days, and what tracked funds did</span></h2><Link href="/markets" className="linkbtn">Edit watchlist ›</Link></div>
          {stocks === null ? <p className="muted pad">Loading…</p> : (
            <ul className="lrows">{stocks.map((s) => (
              <li key={s.t}><Link href={`/stock/${s.t}`}>
                <strong className="lrow-sym">{s.t}</strong>
                <span className="lrow-main"><span className="muted small">{s.name ?? ""}</span>
                  <span className="small">{s.insiders.buys || s.insiders.sells ? <>{s.insiders.buys ? <span className="up">{s.insiders.buys} buys ${fmtBig(s.insiders.buyValue)}</span> : null}{s.insiders.buys && s.insiders.sells ? " · " : ""}{s.insiders.sells ? <span className="down">{s.insiders.sells} sales ${fmtBig(s.insiders.sellValue)}</span> : null}</> : <span className="muted">No insider buys or sales</span>}
                  {s.funds.bought.length ? <span className="muted"> · bought by {s.funds.bought.join(", ")}</span> : null}{s.funds.sold.length ? <span className="muted"> · cut by {s.funds.sold.join(", ")}</span> : null}</span></span>
              </Link></li>
            ))}</ul>
          )}
        </section>
      ) : null}

      {houses.length ? (
        <section className="card flush">
          <div className="card-title"><h2>House members <span className="muted small">latest disclosed trade</span></h2></div>
          <ul className="lrows">{houses.map((h: Followed) => {
            const d = members[h.cik.slice(6)];
            const latest = d?.trades?.[0];
            const fresh = d ? d.trades.filter((t) => isNew(t.f)).length : 0;
            return (
              <li key={h.cik}><Link href={`/congress/${h.cik.slice(6)}`}>
                <span className="lrow-main"><strong>{h.name} {fresh ? <New /> : null}</strong>
                  <span className="muted small">{d === undefined ? "Loading…" : !latest ? "No recent stock trades" : <>{fresh ? `${fresh} new disclosure${fresh === 1 ? "" : "s"} · ` : ""}latest: {latest.y === "P" ? "bought" : "sold"} {latest.t}, disclosed {day(latest.f)}</>}</span></span>
              </Link></li>
            );
          })}</ul>
        </section>
      ) : null}

      {fundIds.length ? (
        <section className="card flush">
          <div className="card-title"><h2>Funds <span className="muted small">latest quarterly report (13F)</span></h2></div>
          <ul className="lrows">{fundIds.map((cik) => {
            const f = funds?.find((x) => x.cik === cik);
            const name = following.find((x) => x.cik === `fund:${cik}`)?.name ?? "Fund";
            return (
              <li key={cik}><Link href={`/stakes?view=funds&fund=${cik}`}>
                <span className="lrow-main"><strong>{name} {f && isNew(f.filed) ? <New /> : null}</strong>
                  <span className="muted small">{!f ? (funds === null ? "Loading…" : "Not in the tracked funds any more") : <>{quarter(f.period)}, filed {day(f.filed)}{f.new.length ? ` · new: ${f.new.slice(0, 3).map((h) => h.t ?? h.name).join(", ")}` : ""}{f.sold.length ? ` · sold out: ${f.sold.slice(0, 3).map((h) => h.t ?? h.name).join(", ")}` : ""}</>}</span></span>
              </Link></li>
            );
          })}</ul>
        </section>
      ) : null}

      {people.length ? (
        <section className="card flush">
          <div className="card-title"><h2>Insiders <span className="muted small">executives and directors you follow</span></h2></div>
          <ul className="lrows">{people.map((p) => (
            <li key={p.cik}><Link href={`/insider/${p.cik}`}><span className="lrow-main"><strong>{p.name}</strong><span className="muted small">their buys and sales ›</span></span></Link></li>
          ))}</ul>
        </section>
      ) : null}
    </div>
  );
}
