// /llms.txt: a plain-text summary of the site for AI answer engines (the llms.txt convention):
// what Arkanum is, where its data comes from, what the research found (from the same research
// files as the pages, so the numbers stay current) and the pages worth reading.
import { findings } from "@/lib/findings";
import { SAMPLE } from "@/lib/research";
import { SITE } from "@/lib/site";

export const revalidate = 86400;

export function GET() {
  const f = findings();
  const body = `# Arkanum Data

> Free, independent site showing stock trades by company insiders (SEC Form 4), members of the U.S. House (STOCK Act reports) and large funds (13F), each linked to its filing, next to tested evidence on how trades like them performed. No account, no ads, not investment advice.

Arkanum tests insider-trading "signals" instead of selling them. Its main finding: ${SAMPLE.kept.toLocaleString("en-US")} open-market purchases by officers and directors (2023-25) had a six-month median return of ${f.find((x) => x.id === "market")?.figure ?? ""} against the S&P 500, measured from when each filing became public. Results carry 90% ranges and are re-checked monthly on new filings.

## Key findings
${f.map((x) => `- ${x.head}: ${x.figure} (${x.figureNote}). ${x.body} Source: ${SITE}${x.href}`).join("\n")}

## Main pages
- [Insider trades](${SITE}/insiders): purchases and large sales by executives and directors, updated every two hours on weekdays.
- [Congress trades](${SITE}/congress): House members' disclosed stock trades, how late they were reported, and returns since.
- [Institutional holdings](${SITE}/stakes): what large funds and companies hold, from 13F, 13D and 13G filings.
- [Research](${SITE}/research): working papers on insider buys, insider sales, the filing delay, House trades and copying famous funds.
- [Backtester](${SITE}/research/lab): test an insider-buying strategy on every purchase since 2023.
- [Methodology](${SITE}/research/methodology): sources, how returns and ranges are computed, and limits.
- [Open data](${SITE}/open-data): the site's data as files.
- [API (early access)](${SITE}/developers): planned API of analysed SEC insider trades, fund holdings and company risk flags.
- Stock pages: ${SITE}/stock/{TICKER}, with insider trades, risk flags, finances, announcements and research context.
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
