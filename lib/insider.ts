import type { InsiderTrade } from "./sec";

import { isExecOrDirector as isExecJs } from "./people.mjs";

/** Officers and directors trade their own company with inside knowledge; 10% owners
 *  are usually investment funds. Shared with the scripts (lib/people.mjs). */
export const isExecOrDirector = isExecJs as (t: Pick<InsiderTrade, "role">) => boolean;

export const WHO = { exec: "Officers & directors", owner: "Funds & 10% owners", all: "Everyone" } as const;
export type Who = keyof typeof WHO;
export const matchesWho = (t: Pick<InsiderTrade, "role">, who: Who) =>
  who === "all" ? true : who === "exec" ? isExecOrDirector(t) : !isExecOrDirector(t);
