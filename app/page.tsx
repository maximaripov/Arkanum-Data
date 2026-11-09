import InsidersView from "./InsidersView";
import { HomeIntro } from "@/components/HomeIntro";

export const metadata = { alternates: { canonical: "/" } };

// The homepage: what Arkanum is and what its research found, then the insider overview.
export default function Home() {
  return (
    <>
      <HomeIntro />
      <InsidersView />
    </>
  );
}
