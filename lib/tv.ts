// TradingView symbols are "EXCHANGE:SYMBOL". SEC's ticker list says where each US stock
// lists; anything else (ETFs, funds) is passed bare and TradingView resolves it.
const EXCH: Record<string, string> = { Nasdaq: "NASDAQ", NYSE: "NYSE", CBOE: "CBOE" };
export const tvSymbol = (ticker: string, exchange?: string | null) =>
  exchange && EXCH[exchange] ? `${EXCH[exchange]}:${ticker.replace(/-/g, ".")}` : ticker.replace(/-/g, ".");
