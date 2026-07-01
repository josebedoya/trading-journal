"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { accountSchema } from "@/lib/validations/account";
import { accounts } from "@/lib/db/schema";

/** Resultado tipado (mismo patrón que trades): éxito o errores mapeables. */
export type AccountActionResult =
  | { ok: true }
  | { ok: false; fieldErrors?: Record<string, string[]>; formError?: string };

/** Cuenta cuántas cuentas activas tiene el usuario (para la cuota). */
async function activeAccountCount(userId: string): Promise<number> {
  return db.$count(
    accounts,
    and(eq(accounts.userId, userId), eq(accounts.status, "active")),
  );
}

/** Valida ownership y devuelve la cuenta, o null si no es del usuario. */
async function ownedAccount(accountId: string, userId: string, isAdmin: boolean) {
  const [acc] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);
  if (!acc) return null;
  if (acc.userId !== userId && !isAdmin) return null;
  return acc;
}

export async function createAccount(
  input: unknown,
): Promise<AccountActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, formError: "accounts.errors.unexpected" };
  const isAdmin = user.profile.role === "super_admin";

  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const data = parsed.data;

  // Cuota: solo cuentas activas cuentan; super_admin sin límite.
  if (!isAdmin) {
    const count = await activeAccountCount(user.profile.id);
    if (count >= user.profile.maxAccounts)
      return { ok: false, formError: "accounts.errors.quota_reached" };
  }

  await db.insert(accounts).values({
    userId: user.profile.id,
    name: data.name,
    exchange: data.exchange ?? null,
    currency: data.currency,
    startingBalance: String(data.startingBalance),
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateAccount(
  id: string,
  input: unknown,
): Promise<AccountActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, formError: "accounts.errors.unexpected" };
  const isAdmin = user.profile.role === "super_admin";

  const acc = await ownedAccount(id, user.profile.id, isAdmin);
  if (!acc) return { ok: false, formError: "accounts.errors.not_found" };

  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const data = parsed.data;

  await db
    .update(accounts)
    .set({
      name: data.name,
      exchange: data.exchange ?? null,
      currency: data.currency,
      startingBalance: String(data.startingBalance),
    })
    .where(eq(accounts.id, id));

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function archiveAccount(id: string): Promise<AccountActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, formError: "accounts.errors.unexpected" };
  const isAdmin = user.profile.role === "super_admin";
  const acc = await ownedAccount(id, user.profile.id, isAdmin);
  if (!acc) return { ok: false, formError: "accounts.errors.not_found" };

  await db
    .update(accounts)
    .set({ status: "archived" })
    .where(eq(accounts.id, id));

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function unarchiveAccount(
  id: string,
): Promise<AccountActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, formError: "accounts.errors.unexpected" };
  const isAdmin = user.profile.role === "super_admin";
  const acc = await ownedAccount(id, user.profile.id, isAdmin);
  if (!acc) return { ok: false, formError: "accounts.errors.not_found" };

  // Reactivar consume un cupo → re-valida cuota.
  if (!isAdmin) {
    const count = await activeAccountCount(user.profile.id);
    if (count >= user.profile.maxAccounts)
      return { ok: false, formError: "accounts.errors.quota_reached" };
  }

  await db.update(accounts).set({ status: "active" }).where(eq(accounts.id, id));

  revalidatePath("/", "layout");
  return { ok: true };
}
