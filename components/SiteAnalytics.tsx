// Loads the event-counting script when one is configured in the environment:
// NEXT_PUBLIC_UMAMI_WEBSITE_ID (Umami Cloud) or NEXT_PUBLIC_PLAUSIBLE_DOMAIN (Plausible).
// Both are cookieless and keep no personal data. Page views keep coming from Vercel Analytics.
import Script from "next/script";

export function SiteAnalytics() {
  const umami = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const plausible = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  return (
    <>
      {umami ? <Script defer src="https://cloud.umami.is/script.js" data-website-id={umami} data-domains="arkanumdata.com" strategy="afterInteractive" /> : null}
      {plausible ? <Script defer src="https://plausible.io/js/script.js" data-domain={plausible} strategy="afterInteractive" /> : null}
    </>
  );
}
