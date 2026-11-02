"use client";
import { useQuotes } from "./useQuotes";
import { QuoteRow } from "./QuoteRow";

export function MarketPanel({ title, symbols }: { title: string; symbols: [string, string][] }) {
  const { quotes } = useQuotes(symbols.map((s) => s[0]), 15_000);
  return (
    <section className="card">
      <h2>{title}</h2>
      {symbols.map(([s, label]) => {
        const q = quotes[s];
        return <QuoteRow key={s} symbol={s} label={label} price={q?.price ?? null} changePct={q?.changePct ?? null} spark={q?.spark} />;
      })}
    </section>
  );
}
