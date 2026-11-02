"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getPasscode, register, setPasscode } from "@/lib/alertsClient";
import { fmtBig, fmtPct, fmtPrice, tone } from "@/lib/format";
import type { Briefing, Move } from "@/lib/briefing";
import type { MarketStatus } from "@/lib/marketStatus";

const dayName = (d: string) => new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

/** Which day is shown and why: the previous trading day while the market is open,
 *  today's close once it has closed (or the last trading day on weekends/holidays). */
function dayNote(b: Briefing, s?: MarketStatus) {
  if (!s) return null;
  if (s.open) return `Markets are open, so this is the previous trading day: ${dayName(b.marketDate)}. Today's summary arrives after the 4 PM close.`;
  if (s.lastSession === s.today && b.marketDate < s.today)
    return `Markets closed at 4 PM. Today's summary usually arrives by 4:20 PM ET; until then this is ${dayName(b.marketDate)}.`;
  return `Markets are closed. This is the latest trading day: ${dayName(b.marketDate)}.`;
}

const KIND = { econ: "Economy", fed: "Fed", earnings: "Earnings" } as const;

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function chg(m: Move) {
  if (m.changePct == null) return "—";
  return m.unit === "yield" ? `${m.changePct > 0 ? "+" : ""}${(m.changePct * 100).toFixed(0)} bp` : fmtPct(m.changePct);
}

function MoveRows({ items }: { items: Move[] }) {
  return (
    <>
      {items.map((m) => (
        <div className="qrow brow" key={m.symbol}>
          <Link href={`/stock/${encodeURIComponent(m.symbol)}`} className="qname"><strong>{m.label}</strong><span className="muted">{m.label !== m.symbol ? m.symbol : ""}</span></Link>
          <div className="qnum"><div className="mono">{m.unit === "yield" ? `${m.price?.toFixed(2)}%` : fmtPrice(m.price)}</div><div className={`mono small ${tone(m.changePct)}`}>{chg(m)}</div></div>
        </div>
      ))}
    </>
  );
}

function Setup({ onPasscode }: { onPasscode: () => void }) {
  const [pass, setPass] = useState("");
  const [status, setStatus] = useState("");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [env, setEnv] = useState({ supported: true, ios: false, standalone: false, permission: "default" as string });
  // Read after the page loads: the server can't see this device's saved passcode.
  const [hasPass, setHasPass] = useState(false);

  useEffect(() => {
    setHasPass(!!getPasscode());
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setEnv({ supported, ios, standalone, permission: supported ? Notification.permission : "unsupported" });
    if (supported) navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then((s) => setEndpoint(s?.endpoint ?? null)).catch(() => {});
  }, []);

  async function enable() {
    try {
      setStatus("Asking for permission…");
      const perm = await Notification.requestPermission();
      setEnv((e) => ({ ...e, permission: perm }));
      if (perm !== "granted") { setStatus("Notifications are blocked. Allow them for Foresight in your phone's Settings → Notifications."); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) }));
      const r = await register({ subscription: sub.toJSON() });
      setEndpoint(sub.endpoint);
      setStatus(`On. ${r.devices} device${r.devices === 1 ? "" : "s"} will get the briefing; your watchlist (${r.watchlist} stocks) and price levels are synced.`);
    } catch (e: any) { setStatus(`Couldn't turn on notifications: ${e.message ?? e}`); }
  }
  async function test() {
    setStatus("Sending a test…");
    const r = await fetch("/api/alerts/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: getPasscode(), endpoint }) });
    const d = await r.json().catch(() => ({}));
    setStatus(r.ok ? "Test sent. It should arrive in a few seconds." : `Test failed: ${d.error ?? d.errors?.join(", ") ?? r.status}`);
  }
  async function disable() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) { await register({ unsubscribe: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
    setEndpoint(null); setStatus("Notifications are off on this device.");
  }

  return (
    <section className="card">
      <h2>Notifications</h2>
      {!hasPass ? (
        <form className="levelform" onSubmit={async (e) => {
          e.preventDefault(); setPasscode(pass.trim());
          try { await register(); onPasscode(); setHasPass(true); setStatus("Passcode saved on this device."); }
          catch (err: any) { setPasscode(""); setStatus(err.message); }
        }}>
          <input className="note" placeholder="Passcode" value={pass} onChange={(e) => setPass(e.target.value)} autoCapitalize="none" autoCorrect="off" aria-label="Passcode" />
          <button type="submit">Save</button>
        </form>
      ) : !env.supported || (env.ios && !env.standalone) ? (
        <div className="muted">
          <p>To get notifications on iPhone, Foresight has to be opened from your Home Screen:</p>
          <ol><li>In Safari, tap Share → <strong>Add to Home Screen</strong>.</li><li>Open Foresight from the new Home Screen icon.</li><li>Come back to this Briefing page and turn notifications on.</li></ol>
          {!env.supported && !env.ios ? <p>This browser doesn&apos;t support web notifications.</p> : null}
        </div>
      ) : (
        <>
          <p className="muted small">One notification each weekday at the 4 PM Eastern close (usually arrives 4:05–4:20): the day&apos;s markets, your Markets-tab watchlist and price levels, insider buys, and the week&apos;s catalysts.</p>
          <div className="toolbar">
            {endpoint ? <><button className="btn" onClick={test}>Send a test</button><button className="btn" onClick={disable}>Turn off</button></> : <button className="btn primary" onClick={enable}>Turn on notifications</button>}
          </div>
        </>
      )}
      {status ? <p className="small">{status}</p> : null}
    </section>
  );
}

export default function BriefingPage() {
  const [b, setB] = useState<Briefing | null | "none" | "locked">(null);
  const [status, setStatus] = useState<MarketStatus | undefined>();
  const [n, setN] = useState(0);
  useEffect(() => {
    const pass = getPasscode();
    if (!pass) { setB("locked"); return; }
    fetch("/api/alerts/briefing", { headers: { "x-passcode": pass } }).then(async (r) => {
      if (r.status === 401) return setB("locked");
      const d = await r.json();
      setStatus(d.status);
      if (d.empty) return setB("none");
      // Fill any missing sections so an older or partial briefing still renders.
      setB({ headline: [], markets: [], sectors: [], breadth: null, movers: { gainers: [], losers: [] }, watchlist: [], levels: [], insiders: { watchlist: [], top: [], filed: null }, catalysts: [], notes: [], ...d });
    }).catch(() => setB("none"));
  }, [n]);

  return (
    <div className="stack">
      {b === null ? <section className="card"><p className="muted">Loading…</p></section> : null}
      {b === "locked" ? <section className="card"><h1>Daily briefing</h1><p className="muted">Enter your passcode below to see your briefing on this device.</p></section> : null}
      {b === "none" ? <section className="card"><h1>Daily briefing</h1><p className="muted">No briefing yet. The first one arrives after today&apos;s US close.</p></section> : null}
      {b && typeof b === "object" ? (
        <>
          <section className="card">
            <h1>{b.title}</h1>
            {dayNote(b, status) ? <p className="daynote">{dayNote(b, status)}</p> : null}
            <p className="muted small">Generated {new Date(b.generated).toLocaleString()}</p>
            <ul className="headline">{b.headline.map((l) => <li key={l}>{l}</li>)}</ul>
          </section>
          <div className="grid">
            {b.watchlist.length ? <section className="card"><h2>Your watchlist <span className="muted small">as of the briefing</span></h2><MoveRows items={b.watchlist} /></section> : null}
            {b.markets.map((g) => <section className="card" key={g.title}><h2>{g.title}</h2><MoveRows items={g.items} /></section>)}
            <section className="card">
              <h2>Sectors</h2><MoveRows items={b.sectors} />
              {b.breadth ? <p className="muted small">{b.breadth.up.toLocaleString()} stocks rose, {b.breadth.down.toLocaleString()} fell.</p> : null}
            </section>
            <section className="card"><h2>Biggest movers <span className="muted small">$10B+ companies</span></h2><MoveRows items={[...b.movers.gainers, ...b.movers.losers]} /></section>
          </div>
          {b.levels.length ? (
            <section className="card">
              <h2>Your price levels</h2>
              <ul className="levels">{b.levels.map((l) => (
                <li key={l.symbol + l.price}><span className="swatch" aria-hidden /><Link href={`/stock/${l.symbol}`}><strong>{l.symbol}</strong></Link>
                  <span className="mono">{fmtPrice(l.price)}</span><span style={{ flex: 1 }}>{l.note}</span>
                  <span className={`small ${l.crossed ? "up" : "muted"}`}>{l.crossed ? "crossed today" : `${fmtPct(l.distPct, 1)} away`}</span></li>
              ))}</ul>
            </section>
          ) : null}
          <section className="card">
            <h2>Coming up <span className="muted small">next 7 days</span></h2>
            {b.catalysts.length ? (
              <ul className="news">{b.catalysts.map((c) => (
                <li key={c.date + c.title}><span className="pill">{KIND[c.kind]}</span> {c.title}
                  <div className="muted small">{new Date(c.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}{c.time ? ` · ${c.time}` : ""}</div></li>
              ))}</ul>
            ) : <p className="muted">Nothing major scheduled.</p>}
          </section>
          {b.insiders.watchlist.length || b.insiders.top.length ? (
            <section className="card">
              <h2>Insider buying <span className="muted small">officers & directors, filed {b.insiders.filed}</span></h2>
              <ul className="news">{[...b.insiders.watchlist, ...b.insiders.top].map((t, i) => (
                <li key={t.symbol + t.owner + i}><Link href={`/stock/${t.symbol}`}><strong>{t.symbol}</strong></Link> {t.owner} <span className="muted">({t.role})</span> bought {t.value ? "$" + fmtBig(t.value) : "shares"}
                  <div className="muted small">{t.issuer}</div></li>
              ))}</ul>
            </section>
          ) : null}
          {b.notes.length ? <p className="muted small">{b.notes.join(" ")}</p> : null}
        </>
      ) : null}
      <Setup onPasscode={() => setN((x) => x + 1)} />
    </div>
  );
}
