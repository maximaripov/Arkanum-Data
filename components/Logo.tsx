// The Form4 mark: [4] in lime on black. Solid shapes with square corners so it looks the same, and sharp, everywhere.
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <rect width="100" height="100" fill="#0a0a0a" /><path fill="#a3e635" fillRule="evenodd" d="M21 24h11v6.5h-4.5v39H32V76H21zM79 24H68v6.5h4.5v39H68V76h11zM52.25 24h7.5v30.25H65v7.5h-5.25V76h-7.5V61.75H31V55zM52.25 36.5 40.6 54.25h11.65z" />
    </svg>
  );
}
