"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "./Search";
import { LogoMark } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

// [address, label, phone tab label]: the phone tab bar has about 53px per tab, too narrow for
// "Institutional Holdings", so it keeps the short name there.
const LINKS: [string, string, string][] = [["/insiders", "Insiders", "Insiders"], ["/congress", "Congress", "Congress"], ["/stakes", "Institutional Holdings", "Holdings"], ["/markets", "Markets", "Markets"], ["/research", "Research", "Research"], ["/briefing", "Digest", "Digest"]];

const ICONS: Record<string, React.ReactNode> = {
  Insiders: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  Congress: <><path d="M3 21h18M5 21V11M9 21V11M15 21V11M19 21V11M3 11h18M12 3l9 6H3z" /></>,
  Markets: <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  Research: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" /><path d="M7 15h10" /></>,
  Holdings: <><circle cx="12" cy="12" r="9" /><path d="M12 3v9l7 5" /></>,
  Digest: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21h4" /></>,
};

// Stock and insider pages belong to the Insiders section.
const current = (path: string, href: string) => (href === "/insiders" ? path.startsWith("/stock") || path.startsWith("/insider") : path.startsWith(href));

export function Nav() {
  const path = usePathname();
  const [searching, setSearching] = useState(false);
  return (
    <header className={`nav${searching ? " searching" : ""}`}>
      <Link href="/" className="brand">
        <LogoMark size={28} />
        <span className="wordmark">Arkanum<span className="cursor" aria-hidden /></span>
      </Link>
      <nav className="nav-links">
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} className={current(path, href) ? "active" : ""} aria-current={current(path, href) ? "page" : undefined}>{label === "Institutional Holdings" ? <><span className="nav-long">Institutional </span>Holdings</> : label}</Link>
        ))}
      </nav>
      <Search onDone={() => setSearching(false)} />
      <Link href="/developers" className="btn primary api-btn">Get API</Link>
      <button className="theme-btn search-btn" onClick={() => setSearching(!searching)} aria-label={searching ? "Close search" : "Search"} aria-expanded={searching}>
        {searching ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        )}
      </button>
      <Link href="/briefing#notify" className="theme-btn alerts-btn" aria-label="Alerts on this device" title="Alerts on this device">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
      </Link>
      <ThemeToggle />
    </header>
  );
}

/** Phones: the main sections as a tab bar at the bottom of the screen. */
export function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="Sections">
      {LINKS.map(([href, , label]) => (
        <Link key={href} href={href} className={current(path, href) ? "active" : ""} aria-current={current(path, href) ? "page" : undefined}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICONS[label]}</svg>
          {label}
        </Link>
      ))}
    </nav>
  );
}
