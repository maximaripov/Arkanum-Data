"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Hit = { symbol: string; name: string; type: string; exchange: string; href?: string };

const KIND: Record<string, string> = { Insider: "Insider", Congress: "Congress", Fund: "Fund", Stock: "Stock" };

/** One search for stocks, insiders, House members and funds. */
export function Search({ onDone, placeholder = "Search stocks, people, funds" }: { onDone?: () => void; placeholder?: string }) {
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

  const go = (s: string, href?: string) => { setQ(""); setOpen(false); onDone?.(); router.push(href ?? `/stock/${encodeURIComponent(s)}`); };

  return (
    <div className="search" ref={box}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && q.trim()) go(hits[0]?.symbol ?? q.trim().toUpperCase(), hits[0]?.href); }}
        placeholder={placeholder}
        aria-label="Search stocks, insiders, politicians and funds"
      />
      {open && hits.length > 0 ? (
        <ul className="hits">
          {hits.map((h) => (
            <li key={h.href ?? h.symbol}>
              <button onClick={() => go(h.symbol, h.href)}>
                {h.href ? <><strong>{h.name}</strong> <span className="muted small">{KIND[h.type] ?? h.type} · {h.exchange}</span></>
                  : <><strong>{h.symbol}</strong> <span>{h.name}</span> <span className="muted small">{h.type} · {h.exchange}</span></>}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
