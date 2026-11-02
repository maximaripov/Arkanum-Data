import type { InsiderTrade } from "./sec";

/** Officers and directors trade their own company with inside knowledge; 10% owners
 *  are usually investment funds. `role` is "<officer title>, Director, 10% owner". */
export function isExecOrDirector(t: Pick<InsiderTrade, "role">) {
  const parts = t.role.split(",").map((s) => s.trim());
  return parts.some((p) => p && p !== "10% owner" && p !== "Other");
}

export const WHO = { exec: "Officers & directors", owner: "Funds & 10% owners", all: "Everyone" } as const;
export type Who = keyof typeof WHO;
export const matchesWho = (t: Pick<InsiderTrade, "role">, who: Who) =>
  who === "all" ? true : who === "exec" ? isExecOrDirector(t) : !isExecOrDirector(t);
