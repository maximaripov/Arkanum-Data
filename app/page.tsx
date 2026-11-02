import { MARKETS } from "@/lib/markets";
import { MarketPanel } from "@/components/MarketPanel";
import { CryptoPanel } from "@/components/CryptoPanel";
import { WatchlistPanel } from "@/components/WatchlistPanel";

export default function Home() {
  return (
    <div className="grid">
      <WatchlistPanel />
      {MARKETS.map((m) => <MarketPanel key={m.title} title={m.title} symbols={m.symbols} />)}
      <CryptoPanel />
    </div>
  );
}
