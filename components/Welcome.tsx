"use client";
// First-visit welcome: what Form4 is, in one screen. Shown once per browser.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const KEY = "foresight.welcomed";

export function Welcome() {
  const [open, setOpen] = useState(false);
  const [iosTip, setIosTip] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let seen = "1";
    try { seen = localStorage.getItem(KEY) ?? ""; } catch {}
    if (seen) return;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    setIosTip(ios && !standalone);
    setOpen(true);
  }, []);
  useEffect(() => {
    if (!open) return;
    btn.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [open]);
  const close = () => { try { localStorage.setItem(KEY, "1"); } catch {} setOpen(false); };
  if (!open) return null;
  return (
    <div className="welcome-backdrop" onClick={close}>
      <div className="welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="welcome-title">Welcome to Form4</h2>
        <p>See what company insiders and big investment funds are doing with their own money, explained in plain English, from official SEC filings. (The name comes from Form 4, the filing executives must send the SEC within two days of trading their company&apos;s stock.)</p>
        <ol className="welcome-steps">
          <li><span className="welcome-icon" aria-hidden><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg></span><div><strong>Follow your stocks</strong><span className="muted">Search for a company at the top and tap &quot;Add to watchlist&quot;.</span></div></li>
          <li><span className="welcome-icon" aria-hidden><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg></span><div><strong>See who&apos;s buying</strong><span className="muted">The Insiders tab shows executives buying their own company&apos;s stock, and what big funds bought last quarter.</span></div></li>
          <li><span className="welcome-icon" aria-hidden><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21h4" /></svg></span><div><strong>Get a daily digest</strong><span className="muted">One notification each weekday after the market closes, about your stocks.</span></div></li>
        </ol>
        {iosTip ? <p className="welcome-tip small">On iPhone, notifications need Form4 on your Home Screen: tap the Share button, then &quot;Add to Home Screen&quot;, and open it from there.</p> : null}
        <div className="welcome-actions">
          <button ref={btn} className="btn primary big" onClick={close}>Get started</button>
          <Link href="/briefing#notify" className="linkbtn" onClick={close}>Set up the daily digest</Link>
        </div>
        <p className="muted small">Free · no account · not investment advice</p>
      </div>
    </div>
  );
}
