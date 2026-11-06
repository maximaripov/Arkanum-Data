"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { deviceId, notificationsOn, register } from "@/lib/device";
import { useWatchlist } from "@/components/useWatchlist";
import { TradeList, Signal, personName, roleLabel } from "@/components/TradeList";
import { ComingUp } from "@/components/ComingUp";
import { loadInsiders } from "@/lib/insiderData";
import { WeekSummary, useMarkets } from "@/components/MarketBoard";
import { TradingView } from "@/components/TradingView";
import { fmtBig } from "@/lib/format";
import { isExecOrDirector } from "@/lib/insider";
import type { Conviction, InsiderTrade } from "@/lib/sec";
import { companyName } from "@/lib/people.mjs";

type Digest = {
  generated: string; date: string; filed: string | null; title: string;
  topBuys: { symbol: string; issuer: string; owner: string; role: string; value: number | null; conv?: Conviction | null }[];
  clusters: { symbol: string; issuer: string; insiders: number; value: number }[];
  fundFilings: { fund: string; period: string; filed: string; newPositions: string[]; soldOut: string[] }[];
  events: { date: string; time: string | null; kind: string; title: string }[];
};
type Move = { fund: string; symbol: string; change: string };
const day = (d: string) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const titleCase = (s: string, sym?: string | null) => companyName(s, sym);
const VERB: Record<string, [string, string]> = { new: ["bought", "up"], added: ["added", "up"], reduced: ["cut", "down"], sold: ["sold out", "down"] };

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Data for "your watchlist", computed on this device from the public files. */
function useWatchlistActivity() {
  const { list } = useWatchlist();
  const [trades, setTrades] = useState<InsiderTrade[] | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  useEffect(() => {
    loadInsiders().then((d) => setTrades(d.trades)).catch(() => setTrades([]));
    fetch("/data/funds.json").then((r) => r.json()).then((d) => {
      const out: Move[] = [];
      for (const f of d.funds) {
        const seen = new Set<string>();
        for (const h of [...f.new, ...f.added, ...f.reduced, ...f.sold]) if (h.t && !seen.has(h.t)) { seen.add(h.t); out.push({ fund: f.name, symbol: h.t, change: h.change }); }
      }
      setMoves(out);
    }).catch(() => {});
  }, []);
  const w = useMemo(() => new Set(list), [list]);
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const mine = (trades ?? []).filter((t) => w.has(t.symbol) && t.filed >= since && isExecOrDirector(t));
  const byStock = new Map<string, Move[]>();
  for (const m of moves) if (w.has(m.symbol)) { if (!byStock.has(m.symbol)) byStock.set(m.symbol, []); byStock.get(m.symbol)!.push(m); }
  return { list, loading: trades === null, mine, byStock: [...byStock] };
}

function YourWatchlist({ a }: { a: ReturnType<typeof useWatchlistActivity> }) {
  const [allFunds, setAllFunds] = useState(false);
  return (
    <section className="card">
      <div className="card-head"><h2>Your watchlist</h2><Link href="/" className="small">Edit ›</Link></div>
      {!a.list.length ? <p className="muted">Add stocks to your watchlist from their pages to see their insider trades and fund moves here.</p> : a.loading ? <p className="muted">Loading…</p> : (
        <>
          <h3 className="dayhead">Insider trades this week</h3>
          {a.mine.length ? <TradeList trades={a.mine} pageSize={6} /> : <p className="muted small">No trades by executives or directors in {a.list.join(", ")} this week.</p>}
          <h3 className="dayhead">Big-fund moves <span className="muted">(latest quarterly filings)</span></h3>
          {a.byStock.length ? (
            <>
              <ul className="rows">{(allFunds ? a.byStock : a.byStock.slice(0, 5)).map(([s, ms]) => (
                <li key={s} className="row-static">
                  <div className="row-main">
                    <Link href={`/stock/${s}`}><strong>{s}</strong></Link>
                    <div className="small">{ms.map((m, i) => <span key={m.fund}>{i ? " · " : ""}{m.fund} <span className={VERB[m.change]?.[1]}>{VERB[m.change]?.[0] ?? m.change}</span></span>)}</div>
                  </div>
                </li>
              ))}</ul>
              {a.byStock.length > 5 && !allFunds ? <button className="linkbtn" onClick={() => setAllFunds(true)}>Show {a.byStock.length - 5} more stocks</button> : null}
            </>
          ) : <p className="muted small">None of the tracked funds changed these stocks last quarter.</p>}
        </>
      )}
    </section>
  );
}

function Notifications() {
  const [status, setStatus] = useState("");
  const [on, setOn] = useState(false);
  const [owner, setOwner] = useState("");
  // Instant alerts are on unless this device switched them off (remembered here and on the server).
  const [instant, setInstant] = useState(true);
  useEffect(() => { try { setInstant(localStorage.getItem("foresight.instant") !== "0"); } catch {} }, []);
  async function toggleInstant(v: boolean) {
    setInstant(v);
    try { localStorage.setItem("foresight.instant", v ? "1" : "0"); } catch {}
    try { await register({ instant: v }); setStatus(v ? "Instant alerts are on." : "Instant alerts are off. You'll still get the daily digest."); }
    catch (e: any) { setStatus(`Couldn't save that: ${e.message ?? e}`); }
  }
  const [ownerMode, setOwnerMode] = useState(false);
  const [ownerSaving, setOwnerSaving] = useState(false);
  const [ownerMsg, setOwnerMsg] = useState("");
  useEffect(() => setOwnerMode(new URLSearchParams(location.search).has("owner")), []);
  const [env, setEnv] = useState({ supported: true, ios: false, standalone: false });
  useEffect(() => {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    setEnv({ supported: "serviceWorker" in navigator && "PushManager" in window && "Notification" in window, ios, standalone });
    setOn(notificationsOn());
  }, []);
  async function enable() {
    try {
      setStatus("Asking for permission…");
      if ((await Notification.requestPermission()) !== "granted") { setStatus("Notifications are blocked. Allow them for Arkanum in your phone's Settings → Notifications."); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) }));
      await register({ subscription: sub.toJSON(), instant });
      setOn(true); setStatus("You're set. The digest arrives each weekday after the 4 PM close.");
    } catch (e: any) { setStatus(`Couldn't turn on notifications: ${e.message ?? e}`); }
  }
  async function test() {
    const r = await fetch("/api/alerts/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deviceId() }) });
    const d = await r.json().catch(() => ({}));
    setStatus(r.ok ? "Test sent. It should arrive in a few seconds." : `Test failed: ${d.error ?? d.errors?.join(", ") ?? r.status}`);
  }
  async function disable() {
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    await register({ unsubscribe: true }).catch(() => {});
    await sub?.unsubscribe();
    setOn(false); setStatus("Notifications are off, and this device's data was deleted from our server.");
  }
  return (
    <section className="card" id="notify">
      <h2>{on ? "Daily notification is on" : "Get this on your phone"}</h2>
      {!env.supported || (env.ios && !env.standalone) ? (
        <div>
          <p className="muted">On iPhone, notifications work once Arkanum is on your Home Screen:</p>
          <ol className="steps"><li>In Safari, tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.</li><li>Open Arkanum from the new icon.</li><li>Come back here and tap <strong>Turn on notifications</strong>.</li></ol>
          {!env.supported && !env.ios ? <p className="muted small">This browser doesn&apos;t support notifications.</p> : null}
        </div>
      ) : (
        <>
          <p className="muted">One notification each weekday after the 4 PM close (usually by about 4:30 PM ET) with your watchlist&apos;s insider trades, company announcements and fund moves.</p>
          <label className="check"><input type="checkbox" checked={instant} onChange={(e) => (on ? toggleInstant(e.target.checked) : setInstant(e.target.checked))} /> <span><strong>Instant alerts:</strong> also tell me within about an hour when a CEO, CFO or other top executive buys a stock on my watchlist (or anyone makes an unusual buy of it), and whenever someone I follow buys or makes a large sale.</span></label>
          <div className="toolbar">{on ? <><button className="btn" onClick={test}>Send a test</button><button className="btn" onClick={disable}>Turn off</button></> : <button className="btn primary big" onClick={enable}>Turn on notifications</button>}</div>
          <p className="muted small">No account, email or name. While it&apos;s on we keep your watchlist and the people you follow to personalize it; turning it off deletes them.</p>
        </>
      )}
      {status ? <p className="small status">{status}</p> : null}
      {/* A small link opens the owner box (also /briefing?owner); it still needs the owner code. */}
      {on && !ownerMode ? <button className="linkbtn small owner-link" onClick={() => setOwnerMode(true)}>Site owner</button> : null}
      {on && ownerMode ? (
        <details className="small owner-box" open><summary className="muted">Site owner</summary>
          <form className="levelform" onSubmit={async (e) => {
            e.preventDefault();
            setOwnerSaving(true); setOwnerMsg("");
            try {
              const r = await register({ ownerCode: owner.trim() });
              setOwnerMsg(r.owner ? "Saved. This phone will get alerts if the daily or hourly update fails." : "That code isn't right. Check capital letters and dashes.");
              if (r.owner) setOwner("");
            } catch (err: any) { setOwnerMsg(`Couldn't save: ${err.message ?? err}`); }
            setOwnerSaving(false);
          }}>
            {/* No auto-capitalizing or autocorrect: phones would otherwise change the code. */}
            <input className="note" type="password" placeholder="Owner code" value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Owner code" autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} />
            <button type="submit" className="btn primary" disabled={ownerSaving || !owner.trim()}>{ownerSaving ? "Saving…" : "Save"}</button>
          </form>
          {ownerMsg ? <p className="small owner-msg" role="status">{ownerMsg}</p> : null}
        </details>
      ) : null}
    </section>
  );
}

export default function DigestPage() {
  const [d, setD] = useState<Digest | null | "none">(null);
  const a = useWatchlistActivity();
  const markets = useMarkets();
  useEffect(() => { fetch("/api/alerts/digest").then((r) => r.json()).then((x) => setD(x.empty ? "none" : x)).catch(() => setD("none")); }, []);

  const summary = d && d !== "none" ? [
    a.list.length ? `${a.mine.length ? `${a.mine.length} insider ${a.mine.length === 1 ? "trade" : "trades"}` : "No insider trades"} in your watchlist this week${a.byStock.length ? `; ${a.byStock.length} of your stocks moved by big funds last quarter` : ""}.` : null,
    d.clusters[0] ? `${d.clusters[0].insiders} insiders bought ${d.clusters[0].symbol} (${titleCase(d.clusters[0].issuer, d.clusters[0].symbol)}) this week, $${fmtBig(d.clusters[0].value)} in total.` : null,
    d.topBuys[0] ? `Most unusual buy: ${personName(d.topBuys[0].owner)} at ${d.topBuys[0].symbol}, $${fmtBig(d.topBuys[0].value ?? 0)}.` : null,
    d.fundFilings.length ? `${d.fundFilings.length} tracked ${d.fundFilings.length === 1 ? "fund" : "funds"} filed new holdings this week.` : null,
    d.events[0] ? `Next: ${d.events[0].title} on ${day(d.events[0].date)}.` : null,
  ].filter(Boolean) as string[] : [];

  return (
    <div className="stack">
      {d === null ? <section className="card"><p className="muted">Loading…</p></section> : d === "none" ? (
        <section className="card"><h1>Daily digest</h1><p className="muted">The first digest arrives after today&apos;s 4 PM close.</p></section>
      ) : (
        <>
          <section className="card">
            <h1>Daily digest</h1>
            <p className="muted small">{day(d.date)} · what company insiders and big funds did, plus the markets</p>
            <h2 className="subhead">In 30 seconds</h2>
            <ul className="summary">{summary.map((s) => <li key={s}>{s}</li>)}</ul>
            <h2 className="subhead">S&amp;P 500 and Nasdaq 100 <span className="muted" style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>· latest day, last month&apos;s chart</span></h2>
            {/* Index levels are licensed by S&P and Nasdaq, so they come only through TradingView's widgets (round 13). */}
            <div className="idx2">{["FOREXCOM:SPXUSD", "FOREXCOM:NSXUSD"].map((symbol) => (
              <div key={symbol} className="mcard tvq">
                <TradingView widget="mini-symbol-overview" height={150} config={{ symbol, width: "100%", height: "100%", dateRange: "1M", isTransparent: true, noTimeScale: true }} label="TradingView" />
              </div>
            ))}</div>
            {markets?.length ? <><h2 className="subhead">Markets this week</h2><WeekSummary groups={markets} /></> : null}
            <Link href="/markets" className="small">Charts ›</Link>
          </section>
          <YourWatchlist a={a} />
          <div className="twocol">
            <section className="card">
              <div className="card-head"><h2>Most unusual insider buys</h2><Link href="/?view=trades&signal=1" className="small">All trades ›</Link></div>
              <p className="muted small">Filed {d.filed ? day(d.filed) : "recently"} by executives and directors.</p>
              {d.topBuys.length ? <ul className="rows">{d.topBuys.map((t, i) => (
                <li key={i}><Link href={`/stock/${t.symbol}`} className="row-link">
                  <div className="row-main"><div><strong>{t.symbol}</strong> <span className="muted">{titleCase(t.issuer, t.symbol)}</span></div><div className="small muted">{personName(t.owner)} ({roleLabel(t.role)})</div>{t.conv ? <Signal c={t.conv} compact /> : null}</div>
                  <div className="row-value up mono">{t.value ? "$" + fmtBig(t.value) : "—"}</div>
                </Link></li>
              ))}</ul> : <p className="muted">None filed.</p>}
            </section>
            <section className="card">
              <div className="card-head"><h2>Several insiders buying</h2><Link href="/?view=groups" className="small">More ›</Link></div>
              <p className="muted small">2+ executives or directors buying the same stock this week.</p>
              {d.clusters.length ? <ul className="rows">{d.clusters.map((c) => (
                <li key={c.symbol}><Link href={`/stock/${c.symbol}`} className="row-link">
                  <div className="row-main"><div><strong>{c.symbol}</strong> <span className="muted">{titleCase(c.issuer, c.symbol)}</span></div><div className="small up">{c.insiders} insiders</div></div>
                  <div className="row-value up mono">${fmtBig(c.value)}</div>
                </Link></li>
              ))}</ul> : <p className="muted">None this week.</p>}
            </section>
            {/* Funds file quarterly (mid-Feb, May, Aug, Nov); most weeks there is nothing to show. */}
            {d.fundFilings.length ? (
            <section className="card">
              <div className="card-head"><h2>Big-fund filings this week</h2><Link href="/?view=funds" className="small">All funds ›</Link></div>
              <ul className="rows">{d.fundFilings.map((f) => (
                <li key={f.fund} className="row-static"><div className="row-main"><strong>{f.fund}</strong><div className="small">{f.newPositions.length ? <>New: {f.newPositions.join(", ")}</> : null}{f.newPositions.length && f.soldOut.length ? " · " : ""}{f.soldOut.length ? <>Sold: {f.soldOut.join(", ")}</> : null}</div></div></li>
              ))}</ul>
            </section>
            ) : null}
            <ComingUp limit={4} />
          </div>
        </>
      )}
      <Notifications />
    </div>
  );
}
