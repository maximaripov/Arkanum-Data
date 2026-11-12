"use client";
// Institutional Holdings: what listed companies own (13F, 13D/13G) and what the big funds
// hold and changed (13F), as two tabs. ?view=funds opens the funds tab (links from search,
// alerts and the digest); ?view=funds&fund=<SEC ID> opens one fund.
import { useEffect, useState } from "react";
import { StakesView } from "@/components/StakesView";
import { FundsView } from "@/components/FundsView";

type Tab = "companies" | "funds";
const TABS: [Tab, string][] = [["companies", "Companies"], ["funds", "Funds"]];

export function HoldingsView() {
  const [tab, setTab] = useState<Tab>("companies");
  useEffect(() => { if (new URLSearchParams(location.search).get("view") === "funds") setTab("funds"); }, []);
  const go = (t: Tab) => { setTab(t); history.replaceState(null, "", t === "funds" ? "?view=funds" : location.pathname); };
  return (
    <div className="stack">
      <h1 className="holdings-title">Institutional Holdings</h1>
      <div className="tabs wrap-tabs" role="tablist" aria-label="Institutional holdings" onKeyDown={(e) => {
        const i = TABS.findIndex(([k]) => k === tab);
        const j = e.key === "ArrowRight" || e.key === "End" ? 1 : e.key === "ArrowLeft" || e.key === "Home" ? 0 : -1;
        if (j < 0 || j === i) return;
        e.preventDefault(); go(TABS[j][0]); (e.currentTarget.children[j] as HTMLElement | undefined)?.focus();
      }}>
        {TABS.map(([k, l]) => <button key={k} id={`htab-${k}`} role="tab" aria-selected={tab === k} aria-controls="holdings-panel" tabIndex={tab === k ? 0 : -1} className={tab === k ? "on" : ""} onClick={() => go(k)}>{l}</button>)}
      </div>
      <div id="holdings-panel" role="tabpanel" aria-labelledby={`htab-${tab}`}>
        {tab === "funds" ? <FundsView /> : <StakesView />}
      </div>
    </div>
  );
}
