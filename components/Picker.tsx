"use client";
// A dropdown you can search: shows the current choice like a select; opens a panel (desktop)
// or a sheet from the bottom (phone) with a search box, an optional short "featured" group,
// then every option A–Z. Typing matches the start of any word in the name or its details.
// Used for Congress members, company stakes and big funds.
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type PickerItem = { value: string; label: string; sub?: string; keywords?: string };

const words = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").split(" ").filter(Boolean);

export function Picker({ label, items, value, onChange, featured = [], featuredTitle = "Most active", allTitle = "All, A–Z", placeholder = "Search" }: {
  label: string; items: PickerItem[]; value: string; onChange: (value: string) => void;
  featured?: string[]; featuredTitle?: string; allTitle?: string; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = items.find((x) => x.value === value);

  // Each item's searchable words, computed once.
  const index = useMemo(() => items.map((x) => words(`${x.label} ${x.sub ?? ""} ${x.keywords ?? ""}`)), [items]);
  const sections = useMemo(() => {
    const terms = words(q);
    if (terms.length) return [{ title: "", rows: items.filter((_, i) => terms.every((t) => index[i].some((w) => w.startsWith(t)))) }];
    const top = featured.map((v) => items.find((x) => x.value === v)).filter((x): x is PickerItem => !!x);
    return top.length ? [{ title: featuredTitle, rows: top }, { title: allTitle, rows: items }] : [{ title: "", rows: items }];
  }, [q, items, index, featured, featuredTitle, allTitle]);
  const flat = useMemo(() => sections.flatMap((s) => s.rows), [sections]);

  const close = () => { setOpen(false); setQ(""); };
  const pick = (v: string) => { close(); if (v !== value) onChange(v); };

  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    if (!open) return;
    // Desktop: type straight away. Phones: don't pop the keyboard over the list.
    if (matchMedia("(pointer: fine)").matches) input.current?.focus();
    const out = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) close(); };
    document.addEventListener("pointerdown", out);
    const sheet = matchMedia("(max-width: 640px)").matches;
    if (sheet) document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("pointerdown", out); if (sheet) document.body.style.overflow = ""; };
  }, [open]);
  useEffect(() => { list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" }); }, [active]);

  const keys = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (flat[active]) pick(flat[active].value); }
    else if (e.key === "Escape") close();
  };

  let i = -1;
  return (
    <div className="picker" ref={box}>
      <span className="muted small" id={`${id}-l`}>{label}</span>
      <button type="button" className="picker-btn" aria-haspopup="listbox" aria-expanded={open} aria-labelledby={`${id}-l`} onClick={() => (open ? close() : setOpen(true))}>
        <span className="picker-cur">{current?.label ?? "Choose"}{current?.sub ? <span className="muted"> · {current.sub}</span> : null}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open ? (
        <>
          <div className="picker-backdrop" aria-hidden onClick={close} />
          <div className="picker-panel" role="dialog" aria-label={label}>
            <div className="picker-head">
              <strong>{label}</strong>
              <button type="button" className="picker-x" onClick={close} aria-label="Close">×</button>
            </div>
            <input ref={input} className="picker-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={keys}
              placeholder={placeholder} aria-controls={`${id}-list`} aria-activedescendant={flat[active] ? `${id}-o${active}` : undefined} autoComplete="off" enterKeyHint="go" />
            <ul className="picker-list" id={`${id}-list`} role="listbox" ref={list} onKeyDown={keys}>
              {sections.map((s) => (
                <li key={s.title || "results"} role="presentation">
                  {s.title ? <div className="picker-group">{s.title}</div> : null}
                  <ul role="presentation">{s.rows.map((x) => {
                    i++;
                    const n = i;
                    return (
                      <li key={`${s.title}${x.value}`} id={`${id}-o${n}`} data-i={n} role="option" aria-selected={x.value === value}
                        className={`picker-opt${n === active ? " on" : ""}${x.value === value ? " cur" : ""}`}
                        onPointerMove={() => setActive(n)} onClick={() => pick(x.value)}>
                        <span>{x.label}</span>{x.sub ? <span className="muted small">{x.sub}</span> : null}
                      </li>
                    );
                  })}</ul>
                </li>
              ))}
              {!flat.length ? <li className="muted pad" role="presentation">Nothing matches &quot;{q}&quot;</li> : null}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
