// The report card: every label Arkanum shows, what it was followed by in 2023–2025, and what it
// has been followed by since January 2026 (data the labels were never tuned on, refreshed
// monthly), with a plain verdict. Built from the same results as the papers.
import Link from "next/link";
import type { Metadata } from "next";
import { MIN_MONTHS, OOS, SALES_OOS, judge, nameOf, oosMonths, oosStat, p, saleName, saleOosStat, saleStat, stat, type Range } from "@/lib/research";

export const metadata: Metadata = {
  title: "Report card",
  description: "How each of Arkanum's insider-trade labels has done: 2023–2025 against trades filed since January 2026, updated monthly, with a plain verdict.",
  alternates: { canonical: "/research/report-card" },
};

type Res = { median: number; share: number; n: number } & Range;
type Row = { label: string; says: string; main: Res; oos: Res };

/** Too early until 2026 has 12 filing months with returns; Changed only when the 90% ranges separate. */
function verdict(r: Row, sale: boolean): { text: string; tone: string } {
  const v = judge(r.main, r.oos);
  if (v === "early") return { text: "Too early", tone: "muted" };
  if (v === "holds") return { text: "Holds", tone: "" };
  // For buys a higher return is better; for sales a lower return means the sale was a warning.
  const word = v === "higher" ? (sale ? "now less of a warning" : "now better") : (sale ? "now more of a warning" : "now worse");
  return { text: `Changed: ${word}`, tone: "level" };
}
const signed = (x: number) => { const v = p(x); return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`; };

// The names the site uses today (the papers keep the names they were tested under).
const LABEL: Record<string, string> = { "Strong (60+)": "Insider Activity Score 60+", "Routine (<40)": "Insider Activity Score under 40 (routine)" };
function buys(): Row[] {
  const G: [string, string][] = [
    ["Strong (60+)", "Shown as the most unusual buys (Insider Activity Score 60+)"],
    ["Routine (<40)", "Shown as routine buys"],
    ["Top executive (CEO/CFO/President/Chair)", "A CEO, CFO, President or Chair bought"],
    ["Director only", "A director bought"],
    ["Value $1M+", "A purchase of $1 million or more"],
    ["3+ insiders buying", "Three or more insiders buying (buying together)"],
    ["First buy in 2+ years", "The insider's first buy in two years or more"],
    ["Pre-planned", "Bought under a pre-set trading plan"],
    ["Price under $5", "A stock under $5"],
  ];
  return G.map(([g, says]) => {
    const a = stat("month", g, "6 months"), b = oosStat(g, "6 months");
    return { label: LABEL[g] ?? nameOf(g), says, main: { ...a, share: a.hit }, oos: { ...b, share: b.hit } };
  });
}
function sales(): Row[] {
  const G: [string, string][] = [
    ["Notable (site rule)", "Shown as a large unplanned sale"],
    ["Not pre-planned", "Not under a pre-set trading plan"],
    ["Top exec, not pre-planned", "A CEO-level sale outside a trading plan"],
    ["Sold 50%+ of stake", "Half or more of the stake sold"],
    ["Sold entire stake", "The whole stake sold"],
    ["3+ insiders selling", "Three or more insiders selling"],
    ["Price under $5", "A stock under $5"],
  ];
  return G.map(([g, says]) => {
    const a = saleStat("month", g, "6 months"), b = saleOosStat(g, "6 months");
    return { label: saleName(g), says, main: { ...a, share: a.below }, oos: { ...b, share: b.below } };
  });
}

/** The 90% range under the median, once the research has computed it. */
function Spread({ r }: { r: Range }) {
  return r.lo == null || r.hi == null ? null : <div className="muted small">range {signed(r.lo)} to {signed(r.hi)}</div>;
}

function Table({ rows, sale }: { rows: Row[]; sale: boolean }) {
  const share = sale ? "did worse" : "did better";
  return (
    <div className="paper-table-wrap">
      <table className="ttable fit paper-table">
        <thead><tr><th>Label</th><th className="r">2023–2025</th><th className="r">Since Jan 2026</th><th>Verdict</th></tr></thead>
        <tbody>{rows.map((r) => {
          const v = verdict(r, sale);
          return (
            <tr key={r.label}>
              <td><strong>{r.label}</strong><div className="muted small">{r.says}</div></td>
              <td className="mono r">{signed(r.main.median)}<Spread r={r.main} /><div className="muted small">{p(r.main.share).toFixed(0)}% {share} · {r.main.n.toLocaleString("en-US")}</div></td>
              <td className="mono r">{signed(r.oos.median)}<Spread r={r.oos} /><div className="muted small">{p(r.oos.share).toFixed(0)}% {share} · {r.oos.n.toLocaleString("en-US")} · {oosMonths(r.oos)} of {MIN_MONTHS} months</div></td>
              <td className={v.tone}>{v.text}</td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}

export default function ReportCard() {
  const updated = new Date(OOS.generated).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  return (
    <article className="paper">
      <header className="paper-head">
        <p className="paper-series">Arkanum Data Research · Updated monthly · Last updated {updated}</p>
        <h1 className="paper-title">Report card: how our labels have done</h1>
        <p className="paper-authors">Every label on the site, what trades carrying it were followed by, and whether that has held on new filings</p>
      </header>
      <section className="paper-body">
        <p>Each number is the median six-month return after the filing, against the typical insider trade filed the same month: 0% means no different from other insider trades, not from the market. Under it is a 90% range, found by resampling whole filing months (trades filed in the same month rise and fall together, so counting trades overstates certainty), then the share of trades that did better (buys) or worse (sales) and how many there were. The first column is the period the papers studied; the second is everything filed since January 2026, which none of the labels were tuned on, rerun every month.</p>
        <p><strong>Too early</strong> means 2026 has fewer than {MIN_MONTHS} filing months with six months of returns; many trades from a few months are still one stretch of market. After that, <strong>Changed</strong> means the 2026 range and the 2023–2025 range don&apos;t overlap, and <strong>Holds</strong> means they do. None of this is a forecast.</p>
        <h2>Buys</h2>
        <Table rows={buys()} sale={false} />
        <p className="muted small">Filed {OOS.span.text} for the second column. <Link href="/research/insider-buys">Working paper no. 1 ›</Link></p>
        <h2>Sales</h2>
        <Table rows={sales()} sale />
        <p className="muted small">Filed {SALES_OOS.span.text} for the second column. <Link href="/research/insider-sales">Working paper no. 2 ›</Link></p>
      </section>
    </article>
  );
}
