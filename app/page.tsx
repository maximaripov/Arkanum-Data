import InsidersView from "./InsidersView";

export const metadata = { alternates: { canonical: "/" } };

// The homepage is the insider signal: what executives and directors are buying.
export default function Home() { return <InsidersView />; }
