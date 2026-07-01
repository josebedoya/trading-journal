"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUser, requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { transactionSchema } from "@/lib/validations/transaction";
import { accounts, transactions } from "@/lib/db/schema";

export type TransactionActionResult =
  | { ok: true }
  | { ok: false; fieldErrors?: Record<string, string[]>; formError?: string };

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
  input: unknown,
): Promise<TransactionActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, formError: "transactions.errors.unexpected" };
  const isAdmin = user.profile.role === "super_admin";

  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const data = parsed.data;

  if (!(await ownsAccount(data.accountId, user.profile.id, isAdmin)))
    return { ok: false, fieldErrors: { accountId: ["validation.notOwned"] } };

  await db.insert(transactions).values({
    accountId: data.accountId,
    type: data.type,
    amount: String(data.amount), // positivo; el signo lo da `type`
    occurredAt: data.occurredAt ?? new Date(),
    note: data.note ?? null,
  });

  revalidatePath("/", "layout");
  return { ok: true };
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
