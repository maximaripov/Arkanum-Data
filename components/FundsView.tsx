"use client";
import { useEffect, useMemo, useState } from "react";
import { Picker } from "@/components/Picker";
import { FollowButton } from "@/components/FollowButton";
import { CsvButton } from "@/components/CsvButton";
import { FUND_COLS } from "@/lib/csvColumns";
import Link from "next/link";
import { fmtBig, fmtPct } from "@/lib/format";
import { companyName } from "@/lib/people.mjs";

export type Holding = { cusip: string; t: string | null; name: string; cls: string; value: number; shares: number; pct: number; change: string; chgPct: number | null };
type Fund = { cik: number; name: string; who: string; period: string; filed: string; prevPeriod: string | null; total: number; count: number; top: Holding[]; new: Holding[]; added: Holding[]; reduced: Holding[]; sold: Holding[] };

const q = (d: string) => { const [y, m] = d.split("-"); return `Q${Math.ceil(+m / 3)} ${y}`; };
const share = (pct: number) => (pct < 0.1 ? "<0.1%" : `${pct.toFixed(1)}%`);
const titleCase = (s: string, sym?: string | null) => companyName(s, sym);

export function Badge({ h }: { h: Holding }) {
  if (h.change === "new") return <span className="badge up">New</span>;
  if (h.change === "added") return <span className="badge up">Added {fmtPct(h.chgPct, 0)}</span>;
  if (h.change === "reduced") return <span className="badge down">Cut {fmtPct(h.chgPct, 0).replace("-", "−")}</span>;
  if (h.change === "sold") return <span className="badge down">Sold all</span>;
  return null;
}

export function HoldingRows({ items, max = 10, maxPct }: { items: Holding[]; max?: number; maxPct?: number }) {
  if (!items.length) return <p className="muted small">None this quarter.</p>;
  return (
    <ul className="holdings">{items.slice(0, max).map((h) => (
      <li key={h.cusip}>
        <div className="h-name">
          {h.t ? <Link href={`/stock/${h.t}`}><strong>{h.t}</strong></Link> : <strong>{titleCase(h.name, h.t)}</strong>}
          <span className="muted small ellipsis">{h.t ? titleCase(h.name, h.t) : h.cls}</span>
        </div>
        <div className="h-right">
          <div className="mono">${fmtBig(h.value)}{h.change !== "sold" ? <span className="muted small"> · {share(h.pct)}</span> : null}</div>
          <Badge h={h} />
        </div>
        {maxPct ? <div className="h-bar" style={{ width: `${Math.max(2, (h.pct / maxPct) * 100)}%` }} /> : null}
      </li>
    ))}</ul>
  );
}

const CHANGES = [["new", "New"], ["added", "Added to"], ["reduced", "Cut"], ["sold", "Sold all"]] as const;
type Changes = { new?: Holding[]; added?: Holding[]; reduced?: Holding[]; sold?: Holding[] };

/** What changed since the previous quarter, as short ticker lists under the holdings (Big funds and Stakes). */
export function ChangeLines({ c, since }: { c: Changes; since: string }) {
  const rows = CHANGES.filter(([k]) => (c[k] ?? []).length);
  if (!rows.length) return null;
  return (
    <div className="changes">
      <h3 className="small">Changed since {since}</h3>
      {rows.map(([k, label]) => {
        const list = c[k] ?? [];
        return (
          <div key={k} className="change-line small">
            <span className="muted">{label}</span>
            <span>{list.slice(0, 12).map((h, i) => <span key={h.cusip}>{i ? ", " : ""}{h.t ? <Link href={`/stock/${h.t}`}>{h.t}</Link> : titleCase(h.name, h.t)}</span>)}{list.length > 12 ? ` +${list.length - 12} more` : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

export function FundsView() {
  const [funds, setFunds] = useState<Fund[] | null>(null);
  const [sel, setSel] = useState(0);
  const [part, setPart] = useState<"popular" | "fund">("popular");
  useEffect(() => {
    fetch("/data/funds.json").then((r) => r.json()).then((d) => {
      setFunds(d.funds);
      // From search and alerts: /stakes?view=funds&fund=<SEC ID> opens that fund.
      const want = new URLSearchParams(location.search).get("fund");
      const i = want ? (d.funds as Fund[]).findIndex((x) => String(x.cik) === want) : -1;
      if (i >= 0) { setSel(i); setPart("fund"); }
    }).catch(() => setFunds([]));
  }, []);

  // Across all tracked funds: which stocks were bought or sold by the most funds.
  const consensus = useMemo(() => {
    const bought = new Map<string, { t: string; name: string; funds: string[] }>(), sold = new Map<string, { t: string; name: string; funds: string[] }>();
    for (const f of funds ?? []) {
      // A fund can hold several securities of one company (share classes, notes): count it once.
      for (const h of [...f.new, ...f.added]) if (h.t) { const x = bought.get(h.t) ?? { t: h.t, name: h.name, funds: [] }; if (!x.funds.includes(f.name)) x.funds.push(f.name); bought.set(h.t, x); }
      for (const h of [...f.sold, ...f.reduced]) if (h.t) { const x = sold.get(h.t) ?? { t: h.t, name: h.name, funds: [] }; if (!x.funds.includes(f.name)) x.funds.push(f.name); sold.set(h.t, x); }
    }
    const top = (m: Map<string, { t: string; name: string; funds: string[] }>) => [...m.values()].filter((x) => x.funds.length > 1).sort((a, b) => b.funds.length - a.funds.length).slice(0, 6);
    return { bought: top(bought), sold: top(sold) };
  }, [funds]);

  if (funds === null) return <section className="card"><p className="muted">Loading…</p></section>;
  if (!funds.length) return <section className="card"><p className="muted">Fund data isn&apos;t available yet.</p></section>;
  const f = funds[sel];
  return (
    <>
      <section className="card">
        <h1>What big funds are doing</h1>
        <div className="seg big part-seg"><button className={part === "popular" ? "on" : ""} onClick={() => setPart("popular")}>What funds are buying</button><button className={part === "fund" ? "on" : ""} onClick={() => setPart("fund")}>Look up a fund</button></div>
      </section>

      {part === "popular" ? (consensus.bought.length || consensus.sold.length ? (
        <div className="twocol">
          <section className="card"><h2>Bought by several funds <span className="muted small">new or added, latest quarter</span></h2>
            <ul className="compact-list">{consensus.bought.map((x) => <li key={x.t}><Link href={`/stock/${x.t}`}><strong>{x.t}</strong></Link> <span className="muted">{titleCase(x.name, x.t)}</span> · <span className="up">{x.funds.length} funds</span><div className="muted small">{x.funds.join(", ")}</div></li>)}</ul>
          </section>
          <section className="card"><h2>Sold by several funds <span className="muted small">cut or exited</span></h2>
            <ul className="compact-list">{consensus.sold.map((x) => <li key={x.t}><Link href={`/stock/${x.t}`}><strong>{x.t}</strong></Link> <span className="muted">{titleCase(x.name, x.t)}</span> · <span className="down">{x.funds.length} funds</span><div className="muted small">{x.funds.join(", ")}</div></li>)}</ul>
          </section>
        </div>
      ) : <section className="card"><p className="muted">No stock was bought or sold by several tracked funds this quarter.</p></section>) : null}

      {part === "fund" ? <>
      <section className="card">
        <Picker label="Fund" items={funds.map((x, i) => ({ value: String(i), label: x.name, sub: x.who }))} value={String(sel)}
          onChange={(v) => setSel(Number(v))} placeholder="Search fund or manager" />
        <div className="fund-head">
          <div><h2 className="fund-name">{f.name}</h2><div className="muted small">{f.who}</div></div>
          <dl className="stats compact">
            <div><dt>Reported holdings</dt><dd className="mono">${fmtBig(f.total)}</dd></div>
            <div><dt>Stocks</dt><dd className="mono">{f.count.toLocaleString()}</dd></div>
            <div><dt>As of</dt><dd>{q(f.period)}</dd></div>
          </dl>
        </div>
        <FollowButton cik={`fund:${f.cik}`} name={f.name} />
      </section>

      <section className="card">
        <h2>Largest holdings <span className="muted small">{q(f.period)}, filed {new Date(f.filed + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span></h2>
        <CsvButton rows={[...new Map([...f.top, ...f.new, ...f.added, ...f.reduced, ...f.sold].map((h) => [h.cusip, { ...h, pct: Math.round(h.pct * 100) / 100, chgPct: h.chgPct == null ? null : Math.round(h.chgPct * 10) / 10 }])).values()]} cols={FUND_COLS} file={`${f.name.replace(/[^A-Za-z0-9]+/g, "-")}-13F-${f.period}`} />
        <HoldingRows items={f.top} max={25} maxPct={f.top[0]?.pct} />
        {f.prevPeriod ? <ChangeLines c={f} since={q(f.prevPeriod)} /> : null}
      </section>
      </> : null}
    </>
  );
}

/** Which of the tracked funds hold a given stock (stock page). */
export function FundHolders({ symbol }: { symbol: string }) {
  const [rows, setRows] = useState<{ fund: string; period: string; h: Holding }[] | null>(null);
  useEffect(() => {
    fetch("/data/funds.json").then((r) => r.json()).then((d) => {
      const out: { fund: string; period: string; h: Holding }[] = [];
      for (const f of d.funds as Fund[]) {
        const h = [...f.top, ...f.new, ...f.added, ...f.reduced].find((x) => x.t === symbol);
        const s = f.sold.find((x) => x.t === symbol);
        if (h) out.push({ fund: f.name, period: f.period, h });
        else if (s) out.push({ fund: f.name, period: f.period, h: s });
      }
      setRows(out);
    }).catch(() => setRows([]));
  }, [symbol]);
  if (!rows?.length) return null;
  return (
    <section className="card">
      <h2>Big funds <span className="muted small">latest quarterly filings, 6–20 weeks old</span></h2>
      <ul className="holdings">{rows.map(({ fund, period, h }) => (
        <li key={fund}>
          <div className="h-name"><strong>{fund}</strong><span className="muted small">{q(period)}</span></div>
          <div className="h-right">
            <div className="mono">{h.change === "sold" ? "—" : <>${fmtBig(h.value)}<span className="muted small"> · {share(h.pct)} of fund</span></>}</div>
            <Badge h={h} />
          </div>
        </li>
      ))}</ul>
      <Link href="/stakes?view=funds" className="small muted">See all funds →</Link>
    </section>
  );
}
