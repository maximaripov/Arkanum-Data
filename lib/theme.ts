// Shared by the layout (server) and the theme button (browser). Kept out of the client
// component: a server file importing a constant from a "use client" file gets a reference,
// not the value.
export const THEME_KEY = "form4.theme";
export const THEME_COLORS = { dark: "#000000", light: "#ffffff" } as const;
export type Theme = keyof typeof THEME_COLORS;
