"use client";
// People you follow, on the Markets page next to the watchlist.
import Link from "next/link";
import { useFollowing } from "./useFollowing";

export function FollowingCard() {
  const { list, toggle } = useFollowing();
  return (
    <section className="card">
      <div className="card-head"><h2>People and funds you follow</h2><Link href="/watching" className="small">Watching ›</Link></div>
      {!list.length ? (
        <p className="muted small">Open any insider (tap their name on a trade), member of Congress or <Link href="/stakes?view=funds">fund</Link> and tap <strong>Follow</strong> to get an alert whenever they trade.</p>
      ) : (
        <ul className="rows">{list.map((p) => (
          <li key={p.cik} className="follow-item">
            <Link href={p.cik.startsWith("house:") ? `/congress/${p.cik.slice(6)}` : p.cik.startsWith("fund:") ? `/stakes?view=funds&fund=${p.cik.slice(5)}` : `/insider/${p.cik}`} className="row-link"><div className="row-main"><strong>{p.name}</strong></div><span className="muted small">trades ›</span></Link>
            <button className="icon" onClick={() => toggle(p)} aria-label={`Unfollow ${p.name}`} title="Unfollow">×</button>
          </li>
        ))}</ul>
      )}
    </section>
  );
}
