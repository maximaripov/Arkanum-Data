"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "./Search";

const LINKS = [["/", "Markets"], ["/screener", "Screener"], ["/insiders", "Insiders"], ["/calendar", "Calendar"], ["/briefing", "Digest"]];

export function Nav() {
  const path = usePathname();
  return (
    <header className="nav">
      <Link href="/" className="brand">
        <svg viewBox="0 0 512 512" width="20" height="20" aria-hidden><circle cx="256" cy="256" r="150" fill="none" stroke="currentColor" strokeWidth="44" /><path d="M256 106a150 150 0 0 1 0 300z" fill="currentColor" /></svg>
        Form4
      </Link>
      <nav>
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} className={path === href ? "active" : ""}>{label}</Link>
        ))}
      </nav>
      <Search />
    </header>
  );
}
