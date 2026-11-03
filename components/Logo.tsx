// The Form4 mark: [4] in lime on black. Drawn as shapes so it looks the same everywhere.
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <rect width="100" height="100" rx="22" fill="#0a0a0a" />
      <path d="M31 24H21v52h10M69 24h10v52H69" fill="none" stroke="#a3e635" strokeWidth="6.5" />
      <path d="M56 75V26L35 58h29" fill="none" stroke="#a3e635" strokeWidth="7.5" strokeLinejoin="miter" strokeMiterlimit="3" />
    </svg>
  );
}
