import "server-only";

import { cache } from "react";
import { desc, eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { accounts } from "@/lib/db/schema";

export type Account = typeof accounts.$inferSelect;

/**
 * Todas las cuentas del usuario actual (activas + archivadas).
 * Cacheado por request (React `cache`): el dashboard y el shell lo consultan
 * varias veces de forma transitiva → una sola query por request.
 */
export const getAccounts = cache(async (): Promise<Account[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  return db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, user.profile.id))
    .orderBy(desc(accounts.createdAt));
});

/**
 * IDs de cuentas sobre las que corren las agregaciones (filtro global).
 * Convención: si `selected_account_ids` está vacío → todas las activas.
 * Siempre se interseca con cuentas existentes del usuario.
 * Cacheado por request (lo invocan varias queries del dashboard).
 */
export const getEffectiveAccountIds = cache(async (): Promise<string[]> => {
  const all = await getAccounts();
  const user = await getCurrentUser();
  const selected = user?.profile.selectedAccountIds ?? [];

  if (selected.length === 0) {
    return all.filter((a) => a.status === "active").map((a) => a.id);
  }
  const valid = new Set(all.map((a) => a.id));
  return selected.filter((id) => valid.has(id));
});
