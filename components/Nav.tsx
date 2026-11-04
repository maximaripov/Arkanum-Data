"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "./Search";
import { LogoMark } from "./Logo";

const LINKS = [["/", "Insiders"], ["/markets", "Markets"], ["/stakes", "Stakes"], ["/briefing", "Digest"]];

export function Nav() {
  const path = usePathname();
  return (
    <header className="nav">
      <Link href="/" className="brand">
        <LogoMark size={26} />
        <span className="wordmark">Form4</span>
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
