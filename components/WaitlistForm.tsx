"use client";
// Early-access sign-up for the planned API (/developers). Posts to /api/waitlist.
import { useState } from "react";
import { track } from "@/lib/track";

export function WaitlistForm() {
  const [email, setEmail] = useState(""), [use, setUse] = useState(""), [plan, setPlan] = useState("unsure"), [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle"), [msg, setMsg] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending"); setMsg("");
    const r = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, use, plan, website }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (r?.ok) { track("API waitlist signup", { plan }); setState("done"); return; }
    setState("idle"); setMsg(d?.error ?? "Couldn't send that. Please try again.");
  }
  if (state === "done") return <p className="waitlist-done" role="status"><strong>You&apos;re on the list.</strong> We&apos;ll email you once, when early access opens. Nothing else.</p>;
  return (
    <form className="waitlist" onSubmit={submit}>
      <label><span>Email</span><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
      <label><span>What would you build with it? <em className="muted">(optional)</em></span><textarea value={use} onChange={(e) => setUse(e.target.value)} rows={3} maxLength={300} placeholder="A screener, a trading bot, research, a newsletter…" /></label>
      <fieldset><legend>Which plan sounds right?</legend>
        {[["free", "Free"], ["hobby", "Hobby, $19"], ["pro", "Pro, $49"], ["unsure", "Not sure yet"]].map(([v, l]) => (
          <label key={v} className="radio"><input type="radio" name="plan" value={v} checked={plan === v} onChange={() => setPlan(v)} /> {l}</label>
        ))}
      </fieldset>
      {/* Hidden from people; bots fill it in, and those sign-ups are dropped. */}
      <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} name="website" />
      <button className="btn primary" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Get early access"}</button>
      {msg ? <p className="small down" role="alert">{msg}</p> : null}
      <p className="muted small">We keep your email only to tell you when the API opens. Delete it any time by writing to info@arkanumdata.com.</p>
    </form>
  );
}
