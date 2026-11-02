"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Hit = { symbol: string; name: string; type: string; exchange: string };

export function Search() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) { setHits([]); return; }
    const t = setTimeout(async () => {
      try { setHits(await (await fetch(`/api/search?q=${encodeURIComponent(q)}`)).json()); setOpen(true); } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const go = (s: string) => { setQ(""); setOpen(false); router.push(`/stock/${encodeURIComponent(s)}`); };

  return (
    <div className="search" ref={box}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && q.trim()) go(hits[0]?.symbol ?? q.trim().toUpperCase()); }}
        placeholder="Search stocks, ETFs, crypto, FX…"
        aria-label="Search symbols"
      />
      {open && hits.length > 0 ? (
        <ul className="hits">
          {hits.map((h) => (
            <li key={h.symbol}>
              <button onClick={() => go(h.symbol)}>
                <strong>{h.symbol}</strong> <span>{h.name}</span> <span className="muted small">{h.type} · {h.exchange}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
