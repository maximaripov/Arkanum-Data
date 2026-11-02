// Symbols for TradingView widgets on the Markets page. Index and commodity CFDs and spot
// FX/crypto are what TradingView's free widgets can display.
export const TICKER_TAPE = [
  { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
  { proName: "FOREXCOM:NSXUSD", title: "Nasdaq 100" },
  { proName: "FOREXCOM:DJI", title: "Dow 30" },
  { proName: "FX_IDC:EURUSD", title: "EUR/USD" },
  { proName: "TVC:GOLD", title: "Gold" },
  { proName: "TVC:USOIL", title: "Oil" },
  { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
  { proName: "BITSTAMP:ETHUSD", title: "Ethereum" },
];
export const OVERVIEW_TABS = [
  { title: "Indices", symbols: [{ s: "FOREXCOM:SPXUSD", d: "S&P 500" }, { s: "FOREXCOM:NSXUSD", d: "Nasdaq 100" }, { s: "FOREXCOM:DJI", d: "Dow 30" }, { s: "INDEX:NKY", d: "Nikkei 225" }, { s: "INDEX:DEU40", d: "DAX" }, { s: "FOREXCOM:UKXGBP", d: "FTSE 100" }] },
  { title: "Commodities", symbols: [{ s: "TVC:GOLD", d: "Gold" }, { s: "TVC:SILVER", d: "Silver" }, { s: "TVC:USOIL", d: "Crude oil" }, { s: "TVC:UKOIL", d: "Brent oil" }, { s: "TVC:NATURALGAS", d: "Natural gas" }] },
  { title: "Bonds", symbols: [{ s: "TVC:US10Y", d: "US 10-year yield" }, { s: "TVC:US02Y", d: "US 2-year yield" }, { s: "TVC:US30Y", d: "US 30-year yield" }] },
  { title: "Forex", symbols: [{ s: "FX:EURUSD", d: "EUR/USD" }, { s: "FX:GBPUSD", d: "GBP/USD" }, { s: "FX:USDJPY", d: "USD/JPY" }, { s: "TVC:DXY", d: "US dollar index" }] },
  { title: "Crypto", symbols: [{ s: "BITSTAMP:BTCUSD", d: "Bitcoin" }, { s: "BITSTAMP:ETHUSD", d: "Ethereum" }, { s: "COINBASE:SOLUSD", d: "Solana" }, { s: "BITSTAMP:XRPUSD", d: "XRP" }] },
];
export const DEFAULT_WATCHLIST = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "TSLA"];
