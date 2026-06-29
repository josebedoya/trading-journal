"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { accounts, transactions } from "@/lib/db/schema";

export type TransactionState = { error: string | null; ok?: boolean };

async function ownsAccount(accountId: string, userId: string, isAdmin: boolean) {
  const [acc] = await db
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);
  if (!acc) return false;
  return acc.userId === userId || isAdmin;
}

export async function createTransaction(
  _prev: TransactionState,
  formData: FormData,
): Promise<TransactionState> {
  const user = await requireUser();
  const isAdmin = user.profile.role === "super_admin";

  const accountId = String(formData.get("accountId") ?? "");
  const type = String(formData.get("type") ?? "");
  const occurredAtRaw = String(formData.get("occurredAt") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim().replace(",", ".");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!(await ownsAccount(accountId, user.profile.id, isAdmin)))
    return { error: "account_required" };
  if (type !== "deposit" && type !== "withdrawal")
    return { error: "type_required" };
  if (!/^\d+(\.\d+)?$/.test(amountRaw) || Number(amountRaw) <= 0)
    return { error: "invalid_amount" };

  const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();
  if (Number.isNaN(occurredAt.getTime())) return { error: "invalid_date" };

  await db.insert(transactions).values({
    accountId,
    type,
    amount: amountRaw,
    occurredAt,
    note,
  });

  revalidatePath("/", "layout");
  return { error: null, ok: true };
}

export async function deleteTransaction(id: string): Promise<void> {
  const user = await requireUser();
  const isAdmin = user.profile.role === "super_admin";

  const [row] = await db
    .select({ ownerId: accounts.userId })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(eq(transactions.id, id))
    .limit(1);
  if (!row || (row.ownerId !== user.profile.id && !isAdmin)) return;

  await db.delete(transactions).where(eq(transactions.id, id));
  revalidatePath("/", "layout");
}
