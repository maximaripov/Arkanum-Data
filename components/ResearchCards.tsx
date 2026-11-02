"use client";
import { useState } from "react";
import { fmtBig, fmtPct, fmtPrice } from "@/lib/format";
import type { Chain } from "@/lib/options";
import type { Analysts } from "@/lib/analysts";
import type { RedditInterest, RetailFlow } from "@/lib/retail";

const day = (d: string, withYear = false) =>
  new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: withYear ? undefined : "short", month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });
const p = (v: number | null) => (v == null ? "—" : v.toFixed(2));

export function OptionsCard({ chain, earningsDate }: { chain: Chain; earningsDate?: string | null }) {
  const [i, setI] = useState(() => Math.max(0, chain.expiries.findIndex((e) => (Date.parse(e.date) - Date.now()) / 86_400_000 >= 2)));
  const e = chain.expiries[i];
  if (!e) return null;
  // The strikes closest to the price, with the at-the-money one in the middle.
  const atmIdx = e.rows.findIndex((r) => r.strike === e.atm);
  const rows = e.rows.slice(Math.max(0, atmIdx - 5), atmIdx + 6);
  const spansEarnings = earningsDate && earningsDate <= e.date && earningsDate >= new Date().toISOString().slice(0, 10);
  return (
    <section className="card">
      <h2>Options <span className="muted small">15-min delayed · Nasdaq</span></h2>
      <div className="chips">
        {chain.expiries.slice(0, 12).map((x, k) => (
          <button key={x.date} className={`chip${k === i ? " on" : ""}`} onClick={() => setI(k)}>{day(x.date)}</button>
        ))}
      </div>
      {e.impliedMovePct != null ? (
        <p>
          Options are priced for a move of about <strong>±{e.impliedMovePct.toFixed(1)}%</strong> (±${e.impliedMove!.toFixed(2)}) by {day(e.date)}
          {spansEarnings ? <>, <strong>including earnings on {day(earningsDate!)}</strong></> : null}.
          <span className="muted small"> That&apos;s the cost of the at-the-money call plus put: the market&apos;s estimate of the typical size of the move, up or down. The stock ends inside that range a bit more than half the time.</span>
        </p>
      ) : null}
      <div className="tablewrap">
        <table className="table compact">
          <thead><tr><th className="r">Call bid/ask</th><th className="r">Vol</th><th className="r hide-sm">OI</th><th className="r">Strike</th><th className="r">Put bid/ask</th><th className="r">Vol</th><th className="r hide-sm">OI</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.strike} className={r.strike === e.atm ? "atm" : ""}>
              <td className={`r mono ${r.strike < chain.price ? "itm" : ""}`}>{p(r.call.bid)} / {p(r.call.ask)}</td>
              <td className="r mono">{r.call.volume?.toLocaleString() ?? "—"}</td>
              <td className="r mono hide-sm">{r.call.oi?.toLocaleString() ?? "—"}</td>
              <td className="r mono"><strong>{fmtPrice(r.strike)}</strong></td>
              <td className={`r mono ${r.strike > chain.price ? "itm" : ""}`}>{p(r.put.bid)} / {p(r.put.ask)}</td>
              <td className="r mono">{r.put.volume?.toLocaleString() ?? "—"}</td>
              <td className="r mono hide-sm">{r.put.oi?.toLocaleString() ?? "—"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="muted small">
        {chain.putCallVolume != null ? <>Put/call volume ratio: <strong>{chain.putCallVolume.toFixed(2)}</strong> (above 1 = more puts traded than calls; near-the-money strikes, next 75 days). </> : null}
        Shaded cells are in the money. Stock {fmtPrice(chain.price)} as of {chain.asOf}.
      </p>
    </section>
  );
}

export function AnalystCard({ a, price }: { a: Analysts; price: number | null }) {
  const total = (a.buy ?? 0) + (a.hold ?? 0) + (a.sell ?? 0);
  const upside = a.target && price ? ((a.target - price) / price) * 100 : null;
  const then = a.history.length >= 4 ? a.history[a.history.length - 4] : null; // ~3 months ago
  return (
    <section className="card">
      <h2>Analysts <span className="muted small">Wall Street consensus · Zacks via Nasdaq</span></h2>
      <p>
        <span className={`pill ${/buy/i.test(a.rating ?? "") ? "up" : /sell/i.test(a.rating ?? "") ? "down" : ""}`}>{a.rating ?? "—"}</span>{" "}
        {a.analysts ? `${a.analysts} analysts` : null}
      </p>
      {total ? (
        <>
          <div className="ratingbar" aria-label={`${a.buy} buy, ${a.hold} hold, ${a.sell} sell`}>
            <span style={{ flex: a.buy ?? 0, background: "var(--up)" }} /><span style={{ flex: a.hold ?? 0, background: "var(--muted)" }} /><span style={{ flex: a.sell ?? 0, background: "var(--down)" }} />
          </div>
          <p className="small">{a.buy} buy · {a.hold} hold · {a.sell} sell</p>
        </>
      ) : null}
      {a.target ? (
        <p className="small">
          Average price target <strong>${fmtPrice(a.target)}</strong>{upside != null ? <> ({fmtPct(upside, 1)} from today)</> : null}, range ${fmtPrice(a.low)} – ${fmtPrice(a.high)}.
        </p>
      ) : null}
      {then ? (
        <p className="small muted">
          3 months ago ({day(then.date, true)}): {then.buy} buy · {then.hold} hold · {then.sell} sell{then.target ? `, average target $${fmtPrice(then.target)}` : ""}.
        </p>
      ) : null}
    </section>
  );
}

export function RetailCard({ reddit, flow }: { reddit: RedditInterest | null; flow: RetailFlow | null }) {
  const x = reddit;
  const ratio = x && x.mentions24hAgo ? x.mentions / x.mentions24hAgo : null;
  const [now, prev] = flow ?? [];
  return (
    <section className="card">
      <h2>Retail investor interest</h2>
      <p className="small">
        <strong>Reddit:</strong>{" "}
        {x ? <>#{x.rank} most-mentioned stock today ({x.mentions} mentions in 24 hours{x.mentions24hAgo ? `, ${x.mentions24hAgo} the day before` : ""}{ratio && ratio >= 1.5 ? `, ${ratio.toFixed(1)}× more` : ""}).</> : <>not among the {"~"}575 most-discussed stocks on Reddit today.</>}
        <span className="muted"> WallStreetBets and other stock subreddits, via ApeWisdom.</span>
      </p>
      {now ? (
        <>
          <p className="small">
            <strong>Retail order flow:</strong> retail wholesalers (Citadel Securities, Virtu, G1, Jane Street…) handled {fmtBig(now.shares)} shares
            {now.shareOfVolumePct != null ? <> — <strong>{now.shareOfVolumePct.toFixed(1)}%</strong> of all volume</> : null} in the week of {day(now.week, true)}
            {prev?.shareOfVolumePct != null && now.shareOfVolumePct != null ? `, vs ${prev.shareOfVolumePct.toFixed(1)}% the week before` : ""}.
          </p>
          <div className="tablewrap">
            <table className="table compact">
              <thead><tr><th>Week of</th><th className="r">Shares</th><th className="r">% of volume</th><th className="r">Trades</th><th className="r hide-sm">Avg size</th></tr></thead>
              <tbody>{flow!.map((w) => (
                <tr key={w.week}><td>{day(w.week)}</td><td className="r mono">{fmtBig(w.shares)}</td><td className="r mono">{w.shareOfVolumePct == null ? "—" : `${w.shareOfVolumePct.toFixed(1)}%`}</td><td className="r mono">{fmtBig(w.trades)}</td><td className="r mono hide-sm">{w.avgTradeSize}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <p className="muted small">
            Brokers like Robinhood, Schwab and Fidelity send most customer orders to these firms, so their volume is the best free gauge of retail trading. It shows how much
            retail-type trading happened, not whether it was buying or selling. Source: FINRA, published with a 2–4 week delay.
          </p>
        </>
      ) : null}
    </section>
  );
}
