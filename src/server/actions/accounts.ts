"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { accounts } from "@/lib/db/schema";

export type AccountState = { error: string | null; ok?: boolean };

const ok: AccountState = { error: null, ok: true };

function parseMoney(raw: string): string | null {
  const v = raw.trim().replace(",", ".");
  if (v === "") return "0";
  if (!/^-?\d+(\.\d+)?$/.test(v)) return null;
  return v;
}

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
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const user = await requireUser();
  const isAdmin = user.profile.role === "super_admin";

  const name = String(formData.get("name") ?? "").trim();
  const exchange = String(formData.get("exchange") ?? "").trim() || null;
  const currency = String(formData.get("currency") ?? "USD").trim() || "USD";
  const startingBalance = parseMoney(String(formData.get("startingBalance") ?? "0"));

  if (!name) return { error: "name_required" };
  if (startingBalance === null) return { error: "invalid_balance" };

  // Cuota: solo cuentas activas cuentan; super_admin sin límite.
  if (!isAdmin) {
    const count = await activeAccountCount(user.profile.id);
    if (count >= user.profile.maxAccounts) return { error: "quota_reached" };
  }

  await db.insert(accounts).values({
    userId: user.profile.id,
    name,
    exchange,
    currency,
    startingBalance,
  });

  revalidatePath("/", "layout");
  return ok;
}

export async function updateAccount(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const user = await requireUser();
  const isAdmin = user.profile.role === "super_admin";
  const id = String(formData.get("id") ?? "");

  const acc = await ownedAccount(id, user.profile.id, isAdmin);
  if (!acc) return { error: "not_found" };

  const name = String(formData.get("name") ?? "").trim();
  const exchange = String(formData.get("exchange") ?? "").trim() || null;
  const currency = String(formData.get("currency") ?? "USD").trim() || "USD";
  const startingBalance = parseMoney(String(formData.get("startingBalance") ?? "0"));

  if (!name) return { error: "name_required" };
  if (startingBalance === null) return { error: "invalid_balance" };

  await db
    .update(accounts)
    .set({ name, exchange, currency, startingBalance })
    .where(eq(accounts.id, id));

  revalidatePath("/", "layout");
  return ok;
}

export async function archiveAccount(id: string): Promise<AccountState> {
  const user = await requireUser();
  const isAdmin = user.profile.role === "super_admin";
  const acc = await ownedAccount(id, user.profile.id, isAdmin);
  if (!acc) return { error: "not_found" };

  await db
    .update(accounts)
    .set({ status: "archived" })
    .where(eq(accounts.id, id));

  revalidatePath("/", "layout");
  return ok;
}

export async function unarchiveAccount(id: string): Promise<AccountState> {
  const user = await requireUser();
  const isAdmin = user.profile.role === "super_admin";
  const acc = await ownedAccount(id, user.profile.id, isAdmin);
  if (!acc) return { error: "not_found" };

  // Reactivar consume un cupo → re-valida cuota.
  if (!isAdmin) {
    const count = await activeAccountCount(user.profile.id);
    if (count >= user.profile.maxAccounts) return { error: "quota_reached" };
  }

  await db.update(accounts).set({ status: "active" }).where(eq(accounts.id, id));

  revalidatePath("/", "layout");
  return ok;
}
