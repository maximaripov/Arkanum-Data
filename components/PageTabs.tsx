"use client";
// Splits a page into tabs so it doesn't scroll forever. The open tab is kept in the address
// (?tab=key; the first tab has none), so a shared link opens the right tab and Back returns to
// the previous one. Every panel is rendered (hidden when closed), so the full page is still in
// the HTML for search engines and nothing reloads when switching.
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

export type PageTab = { key: string; label: ReactNode; content: ReactNode };

// ?tab=key, or an old #anchor link to a section that now sits in one of the tabs.
const fromUrl = (tabs: PageTab[]) => {
  const k = new URLSearchParams(location.search).get("tab");
  if (tabs.some((t) => t.key === k)) return k!;
  const panel = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1)))?.closest("[role=tabpanel]") : null;
  const h = panel?.id.replace(/^ppanel-/, "");
  return tabs.some((t) => t.key === h) ? h! : tabs[0].key;
};

/** Re-reads the tab when the address changes without a reload (a link to ?tab= on the same
 *  page, Back and Forward). In its own Suspense boundary so the panels still render on the server. */
function UrlSync({ sync }: { sync: () => void }) {
  const q = useSearchParams().toString();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(sync, [q]);
  return null;
}

export function PageTabs({ tabs, label }: { tabs: PageTab[]; label: string }) {
  const list = tabs.filter((t) => t.content);
  const [tab, setTab] = useState(list[0]?.key);
  useEffect(() => {
    if (location.hash.length > 1) requestAnimationFrame(() => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView());
  }, []);
  if (!list.length) return null;
  const go = (k: string) => {
    if (k === tab) return;
    setTab(k);
    const u = new URL(location.href);
    if (k === list[0].key) u.searchParams.delete("tab"); else u.searchParams.set("tab", k);
    history.pushState(null, "", u.pathname + u.search + u.hash);
  };
  return (
    <>
      <Suspense fallback={null}><UrlSync sync={() => setTab(fromUrl(list))} /></Suspense>
      <div className="tabs wrap-tabs page-tabs" role="tablist" aria-label={label} onKeyDown={(e) => {
        const i = list.findIndex((t) => t.key === tab);
        const j = e.key === "ArrowRight" ? (i + 1) % list.length : e.key === "ArrowLeft" ? (i - 1 + list.length) % list.length
          : e.key === "Home" ? 0 : e.key === "End" ? list.length - 1 : -1;
        if (j < 0) return;
        e.preventDefault(); go(list[j].key); (e.currentTarget.children[j] as HTMLElement | undefined)?.focus();
      }}>
        {list.map((t) => <button key={t.key} id={`ptab-${t.key}`} role="tab" aria-selected={tab === t.key} aria-controls={`ppanel-${t.key}`} tabIndex={tab === t.key ? 0 : -1} className={tab === t.key ? "on" : ""} onClick={() => go(t.key)}>{t.label}</button>)}
      </div>
      {list.map((t) => (
        <div key={t.key} id={`ppanel-${t.key}`} role="tabpanel" aria-labelledby={`ptab-${t.key}`} hidden={tab !== t.key} className="stack page-panel">{t.content}</div>
      ))}
    </>
  );
}
