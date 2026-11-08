"use client";
import Link from "next/link";
import { useFollowing } from "./useFollowing";

/** Follow an insider (cik = SEC ID) or a House member (cik = "house:<slug>"): they appear in
 *  "People you follow", and with notifications on, their new trades trigger an alert. */
export function FollowButton({ cik, name }: { cik: string; name: string }) {
  const member = cik.startsWith("house:");
  const { has, toggle } = useFollowing();
  const on = has(cik);
  return (
    <div className="follow-row">
      <button className={`btn follow${on ? " on" : ""}`} onClick={() => toggle({ cik, name })} aria-pressed={on}>{on ? "Following" : "Follow"}</button>
      <span className="muted small">{on
        ? <>You&apos;ll get an alert when {member ? "they disclose a new stock trade" : "they buy, or make a large sale"}, if <Link href="/briefing#notify">notifications</Link> are on.</>
        : member ? "Get an alert whenever they disclose a new stock trade." : "Get an alert whenever they buy or make a large sale, at any company."}</span>
    </div>
  );
}
