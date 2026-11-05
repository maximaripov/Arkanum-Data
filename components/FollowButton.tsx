"use client";
import Link from "next/link";
import { useFollowing } from "./useFollowing";

/** Follow an insider: their trades appear in "People you follow", and with notifications
 *  on, any buy (or large sale) they file triggers an alert. */
export function FollowButton({ cik, name }: { cik: string; name: string }) {
  const { has, toggle } = useFollowing();
  const on = has(cik);
  return (
    <div className="follow-row">
      <button className={`btn follow${on ? " on" : ""}`} onClick={() => toggle({ cik, name })} aria-pressed={on}>{on ? "Following" : "Follow"}</button>
      <span className="muted small">{on ? <>You&apos;ll get an alert when they buy, or make a large sale, if <Link href="/briefing#notify">notifications</Link> are on.</> : "Get an alert whenever they buy or make a large sale, at any company."}</span>
    </div>
  );
}
