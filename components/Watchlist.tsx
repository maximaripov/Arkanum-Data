"use client";
// Your watchlist: one card per stock with what Form4 knows about it — insider buying
// and selling, what big funds did, and how the business is growing. Stored on this device.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useWatchlist } from "./useWatchlist";
import { fmtBig, fmtPct } from "@/lib/format";
import type { WatchItem } from "@/app/api/watch/route";

const titleCase = (s: string) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(Inc|Corp|Co|Ltd)\b\.?$/, "$1.");
const focusSearch = () => (document.querySelector(".search input") as HTMLInputElement | null)?.focus();

function Insiders({ x }: { x: WatchItem["insiders"] }) {
  if (x.buys) return <span className="pill up">Insiders bought ${fmtBig(x.buyValue)}{x.buyers > 1 ? ` · ${x.buyers} people` : ""}</span>;
  if (x.sells) return <span className="pill">Insiders sold ${fmtBig(x.sellValue)}</span>;
  return <span className="pill muted">No insider trades</span>;
}

function Card({ w, remove }: { w: WatchItem; remove: () => void }) {
  const f = w.funds;
  return (
    <Link href={`/stock/${encodeURIComponent(w.t)}`} className="wcard">
      <div className="wcard-top">
        <div className="wcard-id"><strong>{w.t}</strong><span className="muted small ellipsis">{w.name ? titleCase(w.name) : ""}</span></div>
        <button className="icon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(); }} aria-label={`Remove ${w.t} from watchlist`} title="Remove">×</button>
      </div>
      <div className="wcard-pills">
        <Insiders x={w.insiders} />
        {f.bought.length ? <span className="pill up" title={f.bought.join(", ")}>{f.bought.length} fund{f.bought.length > 1 ? "s" : ""} bought</span> : null}
        {f.sold.length ? <span className="pill down" title={f.sold.join(", ")}>{f.sold.length} fund{f.sold.length > 1 ? "s" : ""} sold</span> : null}
      </div>
      {w.growth != null || w.margin != null ? (
        <div className="small wcard-fund"><span className="muted">Sales</span> <span className={w.growth != null && w.growth < 0 ? "down" : ""}>{fmtPct(w.growth, 0)}</span> <span className="muted">· Margin</span> {w.margin != null ? `${w.margin.toFixed(0)}%` : "—"}</div>
      ) : null}
    </Link>
  );
}

export function Watchlist() {
  const { list, toggle } = useWatchlist();
  const [items, setItems] = useState<Record<string, WatchItem>>({});
  const key = list.join(",");
  useEffect(() => {
    if (!key) return;
    fetch(`/api/watch?symbols=${encodeURIComponent(key)}`).then((r) => r.json()).then((rows: WatchItem[]) => setItems(Object.fromEntries(rows.map((r) => [r.t, r])))).catch(() => {});
  }, [key]);
  return (
    <section className="card">
      <div className="card-head"><h2>Your watchlist <span className="muted small">insiders: 30 days · funds: last quarter</span></h2><button className="linkbtn" onClick={focusSearch}>+ Add a stock</button></div>
      {!list.length ? (
        <div className="empty">
          <p><strong>Your watchlist is empty.</strong></p>
          <p className="muted">Search for a company at the top, open it, and tap ☆ to follow it here. Your daily digest will then tell you when its insiders trade or big funds move.</p>
        </div>
      ) : (
        <>
          <div className="wgrid">
            {list.map((s) => (items[s] ? <Card key={s} w={items[s]} remove={() => toggle(s)} /> : <div key={s} className="wcard skeleton" />))}
          </div>
        </>
      )}
    </section>
  );
}
