// The three kinds of trade the site shows, kept apart everywhere: a reported trade (every row),
// an unusual one (it stands out for that person) and a tested signal (a pattern that held up
// in the research). Server-only: the figures come from the research files, so a refresh can't
// leave the wording behind. The one-line reminder above lists is KindsLine.
import Link from "next/link";
import { findings } from "@/lib/findings";
import { groups, p, stat } from "@/lib/research";

const pct = (x: number) => { const v = p(x); return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`; };

/** The best six-month result against the S&P 500 among every group of insider purchases tested. */
function bestVsMarket() {
  const all = groups("spy").map((g) => ({ g, s: stat("spy", g, "6 months") })).filter((x) => x.s?.n);
  return all.reduce((a, b) => (b.s.median > a.s.median ? b : a));
}

export function TradeKinds({ compact = false }: { compact?: boolean }) {
  // The homepage's short form: one line each, so the live dashboard stays near the top.
  if (compact) return (
    <section className="kinds" aria-labelledby="kinds-title">
      <h2 id="kinds-title" className="kinds-title">Three kinds of trade, kept apart</h2>
      <ol className="kinds-list compact">
        <li><span className="kinds-tag">1 · Reported</span><span className="small">Every row: a disclosed trade, linked to its filing. What happened, not what comes next.</span></li>
        <li><span className="kinds-tag">2 · Unusual</span><span className="small">Stands out for that person (Insider Activity Score). A reason to look, not to buy.</span></li>
        <li><span className="kinds-tag">3 · Tested signal</span><span className="small">Held up across years of filings. No kind of insider purchase has beaten the S&amp;P 500 yet; the clearest results are warnings.</span></li>
      </ol>
      <p className="muted small kinds-more"><Link href="/research#kinds">The difference, with the numbers ›</Link></p>
    </section>
  );
  const f = findings();
  const unusual = f.find((x) => x.id === "unusual")!, cheap = f.find((x) => x.id === "cheap")!;
  const best = bestVsMarket();
  const anyBeat = p(best.s.median) > 0 && (best.s.lo ?? -1) > 0;
  return (
    <section className="kinds" id="kinds" aria-labelledby="kinds-title">
      <h2 id="kinds-title" className="kinds-title">Three kinds of trade, kept apart</h2>
      <ol className="kinds-list">
        <li>
          <span className="kinds-tag">1 · Reported</span>
          <strong>What was disclosed</strong>
          <span className="muted small">Every row on Arkanum: a trade an insider, a House member or a fund filed, linked to the filing. It says what happened, not what comes next.</span>
        </li>
        <li>
          <span className="kinds-tag">2 · Unusual</span>
          <strong>What stands out</strong>
          <span className="muted small">A trade out of the ordinary for that person: a high Insider Activity Score, or a large unplanned sale. A reason to read the filing. {unusual.head}: {unusual.figure} vs other insider buys.</span>
        </li>
        <li>
          <span className="kinds-tag">3 · Tested signal</span>
          <strong>What held up in the research</strong>
          <span className="muted small">
            {anyBeat
              ? <>A kind of trade that beat the market across years of filings, with a 90% range above zero: {best.g}, {pct(best.s.median)} vs the S&amp;P 500 over six months.</>
              : <>A pattern that held across years of filings, with a 90% range that excludes zero. No kind of insider purchase we tested beat the S&amp;P 500 (the best group, &ldquo;{best.g}&rdquo;, did {pct(best.s.median)} over six months), so the clearest results are warnings: stocks under $5 {cheap.figure}.</>}
          </span>
        </li>
      </ol>
      <p className="muted small kinds-more"><Link href="/research?tab=method">How we test ›</Link></p>
    </section>
  );
}
