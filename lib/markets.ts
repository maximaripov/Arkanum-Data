export const MARKETS: { title: string; symbols: [string, string][] }[] = [
  { title: "Indices", symbols: [["^GSPC", "S&P 500"], ["^IXIC", "Nasdaq"], ["^DJI", "Dow Jones"], ["^RUT", "Russell 2000"], ["^VIX", "VIX"], ["^FTSE", "FTSE 100"], ["^GDAXI", "DAX"], ["^N225", "Nikkei 225"]] },
  { title: "Rates & FX", symbols: [["^TNX", "US 10Y yield"], ["DX-Y.NYB", "US Dollar index"], ["EURUSD=X", "EUR/USD"], ["GBPUSD=X", "GBP/USD"], ["JPY=X", "USD/JPY"], ["CNY=X", "USD/CNY"]] },
  { title: "Commodities", symbols: [["GC=F", "Gold"], ["SI=F", "Silver"], ["CL=F", "Crude oil (WTI)"], ["NG=F", "Natural gas"], ["HG=F", "Copper"], ["ZC=F", "Corn"]] },
];
export const CRYPTO = ["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD", "DOGE-USD", "ADA-USD", "AVAX-USD", "LINK-USD"];
export const DEFAULT_WATCHLIST = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "TSLA"];
