"use client";
// First-visit tour, shown once per browser: what the data is, what the research found, and
// where to start. Three short steps; Skip at any point. The research figure comes from the
// server (lib/findings.ts via the layout), so it follows the monthly refresh.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const KEY = "foresight.welcomed";

const ICON = {
  doc: <path d="M14 3H6v18h12V7zM14 3v4h4M9 12h6M9 16h6" />,
  test: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" /><path d="M7 15h10" /></>,
  go: <path d="M5 12h14M13 6l6 6-6 6" />,
};
const Icon = ({ d }: { d: React.ReactNode }) => (
  <span className="welcome-icon" aria-hidden><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg></span>
);

export function Welcome({ market }: { market?: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
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
    btn.current?.focus({ preventScroll: true });
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [open, step]);
  const close = () => { try { localStorage.setItem(KEY, "1"); } catch {} setOpen(false); };
  if (!open) return null;

  const steps = [
    {
      icon: ICON.doc, title: "What you'll see",
      body: <>
        <p>Trades disclosed in official filings, each linked to its source:</p>
        <ul className="welcome-list">
          <li><strong>Company insiders</strong>: executives and directors buying or selling their own company&apos;s stock (SEC Form 4).</li>
          <li><strong>House members</strong>: the stock trades they must report (Senate not covered).</li>
          <li><strong>Funds and companies</strong>: what big investors hold, from quarterly 13F reports.</li>
        </ul>
      </>,
    },
    {
      icon: ICON.test, title: "What we found when we tested them",
      body: <>
        <p>Other sites sell insider trades as signals. We tested years of them{market ? <>: the median insider purchase did <strong>{market}</strong> against the S&amp;P 500 over the next six months</> : null}.</p>
        <p>So Arkanum keeps three things apart: a <strong>reported</strong> trade, an <strong>unusual</strong> one, and a <strong>tested signal</strong>. Next to each trade you see how trades like it actually did.</p>
      </>,
    },
    {
      icon: ICON.go, title: "Where to start",
      body: <>
        <ul className="welcome-list">
          <li><strong>A stock you own</strong>: search it at the top of any page.</li>
          <li><Link href="/#dashboard" onClick={close}>Today&apos;s insider trades</Link> and <Link href="/congress" onClick={close}>Congress trades</Link>.</li>
          <li><Link href="/research" onClick={close}>The research</Link>: what worked and what didn&apos;t.</li>
          <li><Link href="/briefing#notify" onClick={close}>A daily digest</Link> on your phone, and alerts when people you follow trade.</li>
        </ul>
        {iosTip ? <p className="welcome-tip small">On iPhone, notifications need Arkanum on your Home Screen: Share, then &quot;Add to Home Screen&quot;.</p> : null}
      </>,
    },
  ];
  const s = steps[step], last = step === steps.length - 1;
  return (
    <div className="welcome-backdrop" onClick={close}>
      <div className="welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title" onClick={(e) => e.stopPropagation()}>
        <p className="welcome-count muted small">Welcome to Arkanum · {step + 1} of {steps.length}</p>
        <div className="welcome-head"><Icon d={s.icon} /><h2 id="welcome-title">{s.title}</h2></div>
        <div className="welcome-body" aria-live="polite">{s.body}</div>
        <div className="welcome-actions">
          {step > 0 ? <button className="btn" onClick={() => setStep(step - 1)}>Back</button> : null}
          <button ref={btn} className="btn primary big" onClick={() => (last ? close() : setStep(step + 1))}>{last ? "Get started" : "Next"}</button>
          {!last ? <button className="linkbtn" onClick={close}>Skip</button> : null}
        </div>
        <p className="muted small">Free · no account · not investment advice</p>
      </div>
    </div>
  );
}
