// Plain-English explanations for the economic releases in Coming up.
type Ev = { title: string; kind: string };
const INFO: [RegExp, string, string][] = [
  [/^Fed rate decision/, "The Fed sets short-term interest rates", "The Federal Reserve announces whether it is raising, cutting or holding interest rates, followed by a press conference. Rate changes move stocks, bonds, mortgages and the dollar. Meetings marked “+ economic projections” also publish the Fed’s forecasts."],
  [/^GDP/, "How fast the US economy grew", "Gross domestic product: the total value of everything the US produced last quarter. Faster growth is good for company profits; a shrinking economy raises recession fears."],
  [/^PCE/, "The Fed’s preferred inflation measure", "Personal income and spending, including the PCE price index — the inflation gauge the Federal Reserve watches most closely when setting interest rates."],
  [/^Trade balance/, "US exports minus imports", "How much more the US imported than exported last month. It feeds into GDP and can move the dollar."],
  [/^Jobs report/, "How many jobs the economy added", "Monthly payrolls and the unemployment rate — one of the most market-moving releases."],
  [/^CPI/, "Consumer prices (inflation)", "How much prices rose for everyday goods and services. Higher inflation makes rate cuts less likely."],
  [/^PPI/, "Producer prices", "Prices businesses pay, an early signal for consumer inflation."],
  [/^Retail sales/, "How much consumers spent", "Monthly sales at stores and online; consumer spending drives most of the US economy."],
  [/^Jobless claims/, "New unemployment claims", "Weekly count of people filing for unemployment benefits; a rising trend can signal a weakening job market."],
  [/^Job openings/, "Job openings (JOLTS)", "How many jobs employers are trying to fill — a gauge of labor demand."],
];
export function EVENT_INFO(e: Ev) {
  const hit = INFO.find(([re]) => re.test(e.title));
  return { short: hit?.[1] ?? (e.kind === "fed" ? "Federal Reserve" : "Economic release"), long: hit?.[2] ?? "" };
}
export function eventDay(d: string) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const n = Math.round((Date.parse(d + "T12:00:00Z") - Date.parse(today + "T12:00:00Z")) / 86_400_000);
  const label = new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return n === 0 ? "Today" : n === 1 ? "Tomorrow" : label;
}
