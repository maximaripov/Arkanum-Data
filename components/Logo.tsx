// The Form4 mark: a ring with a gap where a drop broke free. Plain shapes in the text colour,
// so it reads the same in every theme and at every size.
export const LOGO_RING = "M71.5 47.5A27 27 0 1 1 57 30.8";
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <path d={LOGO_RING} fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
      <circle cx="78" cy="22" r="9" fill="currentColor" />
    </svg>
  );
}
