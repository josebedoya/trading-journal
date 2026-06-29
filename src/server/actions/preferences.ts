"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { accounts, users } from "@/lib/db/schema";
import { routing } from "@/lib/i18n/routing";

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

const THEMES = ["light", "dark", "system"] as const;

/** Persiste la preferencia de tema (next-themes la aplica en el cliente). */
export async function setThemePreference(theme: string): Promise<void> {
  const user = await requireUser();
  if (!THEMES.includes(theme as (typeof THEMES)[number])) return;
  await db
    .update(users)
    .set({ theme })
    .where(eq(users.id, user.profile.id));
}

/** Persiste la preferencia de idioma. El cambio de URL lo hace el cliente. */
export async function setLocalePreference(locale: string): Promise<void> {
  const user = await requireUser();
  if (!routing.locales.includes(locale as (typeof routing.locales)[number]))
    return;
  await db
    .update(users)
    .set({ locale })
    .where(eq(users.id, user.profile.id));
  revalidatePath("/", "layout");
}
