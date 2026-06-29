"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { accounts, users } from "@/lib/db/schema";

/**
 * Persiste el filtro global de cuentas en users.selected_account_ids.
 * Lista vacía = "todas las activas" (convención del filtro).
 * Solo guarda IDs que realmente pertenezcan al usuario.
 */
export async function setSelectedAccounts(ids: string[]): Promise<void> {
  const user = await requireUser();

  const owned = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, user.profile.id));
  const ownedSet = new Set(owned.map((a) => a.id));
  const clean = [...new Set(ids)].filter((id) => ownedSet.has(id));

  await db
    .update(users)
    .set({ selectedAccountIds: clean })
    .where(eq(users.id, user.profile.id));

  revalidatePath("/", "layout");
}
