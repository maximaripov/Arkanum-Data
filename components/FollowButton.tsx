"use client";
import Link from "next/link";
import { useFollowing } from "./useFollowing";

/** Follow an insider (cik = SEC ID), a House member (cik = "house:<slug>") or a fund
 *  (cik = "fund:<SEC ID>"): they appear on the Watching list, and with notifications on, their
 *  new trades (or a fund's new quarterly report) trigger an alert. */
export function FollowButton({ cik, name }: { cik: string; name: string }) {
  const member = cik.startsWith("house:"), fund = cik.startsWith("fund:");
  const { has, toggle } = useFollowing();
  const on = has(cik);
  return (
    <div className="follow-row">
      <button className={`btn follow${on ? " on" : ""}`} onClick={() => toggle({ cik, name })} aria-pressed={on}>{on ? "Following" : "Follow"}</button>
      <span className="muted small">{on
        ? <>You&apos;ll get an alert when {fund ? "it files new quarterly holdings" : member ? "they disclose a new stock trade" : "they buy, or make a large sale"}, if <Link href="/briefing#notify">notifications</Link> are on. Everything you follow is on your <Link href="/watching">Watching</Link> page.</>
        : fund ? "Get an alert when it files new quarterly holdings (13F), with what it bought and sold." : member ? "Get an alert whenever they disclose a new stock trade." : "Get an alert whenever they buy or make a large sale, at any company."}</span>
    </div>
  );
}
