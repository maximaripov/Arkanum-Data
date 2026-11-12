import { HomeIntro } from "@/components/HomeIntro";
import { HomeLinks } from "@/components/HomeLinks";

export const metadata = { alternates: { canonical: "/" } };

// The homepage, reached from the logo: what Arkanum is and what its research found. The live
// insider dashboard is on /insiders.
export default function Home() {
  return (
    <>
      <HomeLinks />
      <HomeIntro />
    </>
  );
}
