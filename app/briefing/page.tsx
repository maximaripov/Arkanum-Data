"use client";
import { SectionIntro } from "@/components/SectionIntro";
import { useEffect, useState } from "react";
import { deviceId, notificationsOn, register } from "@/lib/device";
import { DigestView, PastDigests, isDigest, type Digest } from "@/components/DigestView";

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
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
      setOn(true); setStatus("You're set. The digest arrives each weekday at 5:00 PM ET.");
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
          <p className="muted">One notification each weekday at 5:00 PM ET with the day&apos;s biggest insider buy, and a week in review on Saturdays.</p>
          <label className="check"><input type="checkbox" checked={instant} onChange={(e) => (on ? toggleInstant(e.target.checked) : setInstant(e.target.checked))} /> <span><strong>Instant alerts:</strong> also tell me within about an hour when a CEO, CFO or other top executive buys a stock on my watchlist (or anyone makes an unusual buy of it), and whenever someone I follow buys or makes a large sale.</span></label>
          <div className="toolbar">{on ? <><button className="btn" onClick={test}>Send a test</button><button className="btn" onClick={disable}>Turn off</button></> : <button className="btn primary big" onClick={enable}>Turn on notifications</button>}</div>
          <p className="muted small">No account, email or name. While it&apos;s on we keep your watchlist and the people you follow, for instant alerts; turning it off deletes them.</p>
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

type Entry = { date: string; kind: string; title: string; lead?: string };

export default function DigestPage() {
  const [d, setD] = useState<Digest | null | "none">(null);
  const [past, setPast] = useState<Entry[]>([]);
  useEffect(() => {
    // The latest digest is stored by the 4 PM job; the archive (committed with the data) is the fallback.
    const archive = fetch("/data/digests/index.json").then((r) => (r.ok ? r.json() : { digests: [] })).then((x) => x.digests as Entry[]).catch(() => [] as Entry[]);
    archive.then(setPast);
    (async () => {
      const x = await fetch("/api/alerts/digest").then((r) => r.json()).catch(() => null);
      if (isDigest(x)) return setD(x);
      const latest = (await archive)[0];
      const y = latest ? await fetch(`/data/digests/${latest.date}.json`).then((r) => r.json()).catch(() => null) : null;
      setD(isDigest(y) ? y : "none");
    })();
  }, []);
  const shown = d && d !== "none" ? d.date : null;

  return (
    <div className="stack">
      <SectionIntro title="Daily digest"
        lead="One notification each weekday at 5:00 PM ET with the day's biggest insider buys, groups of insiders buying and big-fund moves, and a week in review on Saturdays. Every digest is archived here."
        source="SEC Form 4 and 13F filings, the same data as the rest of the site."
        research={<>The digest lists what was filed, not tips: in our research, the most unusual buys did no better than routine ones.</>}
        researchHref="/research" />
      {d === null ? <section className="card"><p className="muted">Loading…</p></section> : d === "none" ? (
        <section className="card"><p className="muted">The first digest arrives at 5:00 PM ET on the next weekday.</p></section>
      ) : <DigestView d={d} latest />}
      <PastDigests list={past.filter((x) => x.date !== shown)} />
      <Notifications />
    </div>
  );
}
