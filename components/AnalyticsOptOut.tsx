"use client";
// Keeps the owner's own visits out of the numbers. Opening any page with ?notrack=1 marks this
// browser: Vercel Analytics drops its page views (beforeSend), Umami skips it (its own
// umami.disabled flag) and lib/track.ts sends no events. ?notrack=0 undoes it. The mark lives
// in this browser only, so it is set once per browser and device.
import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";

export const OPT_OUT_KEY = "arkanum.notrack";
const optedOut = () => { try { return localStorage.getItem(OPT_OUT_KEY) === "1"; } catch { return false; } };

export function SiteVercelAnalytics() {
  return <Analytics beforeSend={(e) => (optedOut() ? null : e)} />;
}

export function AnalyticsOptOut() {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const u = new URL(location.href);
    const v = u.searchParams.get("notrack");
    if (v !== "1" && v !== "0") return;
    try {
      if (v === "1") { localStorage.setItem(OPT_OUT_KEY, "1"); localStorage.setItem("umami.disabled", "1"); }
      else { localStorage.removeItem(OPT_OUT_KEY); localStorage.removeItem("umami.disabled"); }
      setMsg(v === "1" ? "This browser is now left out of Arkanum's analytics." : "This browser is counted in Arkanum's analytics again.");
    } catch { setMsg("Couldn't save that: this browser blocks site storage."); }
    u.searchParams.delete("notrack");
    history.replaceState(null, "", u.pathname + u.search + u.hash);
  }, []);
  if (!msg) return null;
  return <div className="optout-toast" role="status"><span>{msg}</span><button className="linkbtn" onClick={() => setMsg("")}>Close</button></div>;
}
