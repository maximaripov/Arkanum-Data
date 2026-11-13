// Counts what visitors do (not who they are): alerts turned on, follows, watchlist adds,
// strategy saves, CSV downloads, API sign-ups and searches. Sent to whichever
// cookieless analytics service is configured (Umami or Plausible, see components/SiteAnalytics.tsx);
// does nothing when none is. Never pass personal data (emails, names) as a property.
type Props = Record<string, string | number | boolean>;
declare global { interface Window { umami?: { track: (name: string, data?: Props) => void }; plausible?: (name: string, opts?: { props?: Props }) => void } }

export function track(name: string, props?: Props) {
  if (typeof window === "undefined") return;
  try {
    window.umami?.track(name, props);
    window.plausible?.(name, props ? { props } : undefined);
  } catch {}
}
