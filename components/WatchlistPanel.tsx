"use client";
import { useWatchlist } from "./useWatchlist";
import { useQuotes } from "./useQuotes";
import { QuoteRow } from "./QuoteRow";

export function WatchlistPanel() {
  const { list, toggle } = useWatchlist();
  const { quotes, updated } = useQuotes(list, 5_000);
  return (
    <section className="card">
      <h2>Watchlist <span className="muted small">{updated ? `updated ${updated.toLocaleTimeString()}` : ""}</span></h2>
      {list.length === 0 ? <p className="muted">Search for a symbol above and press ☆ to add it.</p> : null}
      {list.map((s) => {
        const q = quotes[s];
        return <QuoteRow key={s} symbol={s} price={q?.price ?? null} changePct={q?.changePct ?? null} spark={q?.spark} onRemove={() => toggle(s)} />;
      })}
    </section>
  );
}
