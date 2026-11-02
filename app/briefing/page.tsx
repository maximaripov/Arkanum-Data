"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { deviceId, notificationsOn, register } from "@/lib/device";
import { useWatchlist } from "@/components/useWatchlist";
import { fmtBig } from "@/lib/format";
import { isExecOrDirector } from "@/lib/insider";
import type { InsiderTrade } from "@/lib/sec";

type Digest = {
  generated: string; date: string; filed: string | null; title: string;
  topBuys: { symbol: string; issuer: string; owner: string; role: string; value: number | null }[];
  clusters: { symbol: string; issuer: string; insiders: number; value: number }[];
  fundFilings: { fund: string; period: string; filed: string; newPositions: string[]; soldOut: string[] }[];
  events: { date: string; time: string | null; kind: string; title: string }[];
};
const day = (d: string) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const S = ({ s }: { s: string }) => <Link href={`/stock/${encodeURIComponent(s)}`}><strong>{s}</strong></Link>;

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Your watchlist's insider trades (7 days) and fund moves, computed on this device. */
function YourWatchlist() {
  const { list } = useWatchlist();
  const [trades, setTrades] = useState<InsiderTrade[] | null>(null);
  const [moves, setMoves] = useState<{ fund: string; symbol: string; change: string }[]>([]);
  useEffect(() => {
    fetch("/data/insiders.json").then((r) => r.json()).then((d) => setTrades(d.trades)).catch(() => setTrades([]));
    fetch("/data/funds.json").then((r) => r.json()).then((d) => {
      const out: { fund: string; symbol: string; change: string }[] = [];
      for (const f of d.funds) for (const h of [...f.new, ...f.added, ...f.reduced, ...f.sold]) if (h.t) out.push({ fund: f.name, symbol: h.t, change: h.change });
      setMoves(out);
    }).catch(() => {});
  }, []);
  const w = useMemo(() => new Set(list), [list]);
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const mine = (trades ?? []).filter((t) => w.has(t.symbol) && t.filed >= since && isExecOrDirector(t)).slice(0, 10);
  const myMoves = moves.filter((m) => w.has(m.symbol)).slice(0, 10);
  const WORD: Record<string, string> = { new: "opened a position in", added: "added to", reduced: "cut", sold: "sold all of" };
  return (
    <section className="card">
      <h2>Your watchlist <span className="muted small">{list.length} stocks on this device</span></h2>
      {trades === null ? <p className="muted">Loading…</p> : (
        <>
          <p className="small"><strong>Insider trades, last 7 days:</strong>{mine.length ? "" : " none by officers or directors."}</p>
          {mine.length ? <ul className="news">{mine.map((t, i) => (
            <li key={i}><S s={t.symbol} /> {t.owner} <span className="muted">({t.role})</span> {t.code === "P" ? <span className="up">bought</span> : <span className="down">sold</span>} {t.value ? "$" + fmtBig(t.value) : "shares"}<div className="muted small">filed {day(t.filed)}</div></li>
          ))}</ul> : null}
          <p className="small"><strong>Big-fund moves, latest 13F filings:</strong>{myMoves.length ? "" : " none of the tracked funds changed these stocks."}</p>
          {myMoves.length ? <ul className="news">{myMoves.map((m, i) => <li key={i}>{m.fund} {WORD[m.change] ?? m.change} <S s={m.symbol} /></li>)}</ul> : null}
        </>
      )}
    </section>
  );
}

function Notifications() {
  const [status, setStatus] = useState("");
  const [on, setOn] = useState(false);
  const [owner, setOwner] = useState("");
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
      if ((await Notification.requestPermission()) !== "granted") { setStatus("Notifications are blocked. Allow them for Foresight in your phone's Settings → Notifications."); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) }));
      await register({ subscription: sub.toJSON() });
      setOn(true); setStatus("On. Your digest arrives each weekday after the 4 PM close.");
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
    setOn(false); setStatus("Notifications are off, and this device's data was deleted from the server.");
  }
  return (
    <section className="card">
      <h2>Daily notification</h2>
      {!env.supported || (env.ios && !env.standalone) ? (
        <div className="muted">
          <p>On iPhone, notifications only work when Foresight is opened from your Home Screen:</p>
          <ol><li>In Safari, tap Share → <strong>Add to Home Screen</strong>.</li><li>Open Foresight from the new icon.</li><li>Come back to Digest and turn notifications on.</li></ol>
          {!env.supported && !env.ios ? <p>This browser doesn&apos;t support web notifications.</p> : null}
        </div>
      ) : (
        <>
          <p className="muted small">One notification each weekday after the 4 PM close: insider trades, company announcements and fund moves in your watchlist, new matches for your saved screens, and what&apos;s coming up. While it&apos;s on, your watchlist and saved screens are stored on our server to personalize it; turning it off deletes them. No account, email or name.</p>
          <div className="toolbar">{on ? <><button className="btn" onClick={test}>Send a test</button><button className="btn" onClick={disable}>Turn off</button></> : <button className="btn primary" onClick={enable}>Turn on notifications</button>}</div>
        </>
      )}
      {status ? <p className="small">{status}</p> : null}
      {on ? (
        <details className="small muted"><summary>Site owner</summary>
          <form className="levelform" onSubmit={async (e) => { e.preventDefault(); try { const r = await register({ ownerCode: owner }); setStatus(r.owner ? "This device will also get alerts if the daily update fails." : "That code isn't right."); setOwner(""); } catch (err: any) { setStatus(err.message); } }}>
            <input className="note" type="password" placeholder="Owner code" value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Owner code" />
            <button type="submit">Save</button>
          </form>
        </details>
      ) : null}
    </section>
  );
}

export default function DigestPage() {
  const [d, setD] = useState<Digest | null | "none">(null);
  useEffect(() => { fetch("/api/alerts/digest").then((r) => r.json()).then((x) => setD(x.empty ? "none" : x)).catch(() => setD("none")); }, []);
  return (
    <div className="stack">
      {d === null ? <section className="card"><p className="muted">Loading…</p></section> : d === "none" ? (
        <section className="card"><h1>Daily digest</h1><p className="muted">The first digest arrives after today&apos;s 4 PM close.</p></section>
      ) : (
        <>
          <section className="card">
            <h1>{d.title}</h1>
            <p className="muted small">What company insiders and big funds did, from official SEC filings{d.filed ? `; insider trades filed through ${day(d.filed)}` : ""}.</p>
          </section>
          <YourWatchlist />
          <div className="grid">
            <section className="card"><h2>Biggest insider buys <span className="muted small">officers &amp; directors</span></h2>
              {d.topBuys.length ? <ul className="news">{d.topBuys.map((t, i) => <li key={i}><S s={t.symbol} /> {t.owner} <span className="muted">({t.role})</span> bought {t.value ? "$" + fmtBig(t.value) : "shares"}<div className="muted small">{t.issuer}</div></li>)}</ul> : <p className="muted">None filed.</p>}
            </section>
            <section className="card"><h2>Cluster buys this week <span className="muted small">2+ insiders, same stock</span></h2>
              {d.clusters.length ? <ul className="news">{d.clusters.map((c) => <li key={c.symbol}><S s={c.symbol} /> <span className="up">{c.insiders} insiders</span> bought ${fmtBig(c.value)}<div className="muted small">{c.issuer}</div></li>)}</ul> : <p className="muted">None this week.</p>}
            </section>
            <section className="card"><h2>Big-fund filings this week <span className="muted small">13F</span></h2>
              {d.fundFilings.length ? <ul className="news">{d.fundFilings.map((f) => <li key={f.fund}><strong>{f.fund}</strong> filed its holdings{f.newPositions.length ? <> · new: {f.newPositions.join(", ")}</> : null}{f.soldOut.length ? <> · sold: {f.soldOut.join(", ")}</> : null}</li>)}</ul> : <p className="muted">No new filings from the tracked funds this week.</p>}
              <Link href="/insiders?view=funds" className="small muted">All funds →</Link>
            </section>
            <section className="card"><h2>Coming up <span className="muted small">next 7 days</span></h2>
              {d.events.length ? <ul className="news">{d.events.map((e) => <li key={e.date + e.title}><span className="pill">{e.kind === "fed" ? "Fed" : "Economy"}</span> {e.title}<div className="muted small">{day(e.date)}{e.time ? ` · ${e.time}` : ""}</div></li>)}</ul> : <p className="muted">No major releases scheduled.</p>}
            </section>
          </div>
        </>
      )}
      <Notifications />
    </div>
  );
}
