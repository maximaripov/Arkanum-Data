"use client";
// "Check a stock" on the homepage: opens the site search. On desktops the search box is in
// the header, so it's focused; on phones it's behind the search button, so that's pressed.
export function OpenSearch({ children, className = "linklike" }: { children: React.ReactNode; className?: string }) {
  const open = () => {
    const box = document.querySelector<HTMLInputElement>("header.nav .search input");
    if (box && box.offsetParent !== null) { box.focus(); box.scrollIntoView({ block: "nearest" }); return; }
    document.querySelector<HTMLButtonElement>("header.nav .search-btn")?.click();
    setTimeout(() => document.querySelector<HTMLInputElement>("header.nav .search input")?.focus(), 50);
  };
  return <button type="button" className={className} onClick={open}>{children}</button>;
}
