// One sentence above a list of trades saying which of the three kinds it holds (reported,
// unusual, tested signal), linking to the explainer. No server imports, so client views can use it.
import Link from "next/link";

export function KindsLine({ children }: { children?: React.ReactNode }) {
  return (
    <p className="kinds-line muted small">
      {children ?? "These are reported trades: what was disclosed, not a forecast. Unusual ones are marked; none is a tested buy signal."} <Link href="/research#kinds">Reported, unusual, signal: the difference ›</Link>
    </p>
  );
}
