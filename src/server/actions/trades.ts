"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser, requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { defaultLocale, type Locale } from "@/lib/i18n/routing";
import { signOfMoney, subtractMoney } from "@/lib/money";
import { deleteScreenshot, uploadScreenshot } from "@/lib/storage";
import { accounts, screenshots, trades } from "@/lib/db/schema";
import { tradeSchema, type TradeInput } from "@/lib/validations/trade";

/**
 * Resultado tipado de las mutaciones de trade (patrón de referencia).
 * El cliente lo usa para confirmar éxito (`ok`), mapear errores por campo
 * (`fieldErrors`, claves i18n) o mostrar un error general (`formError`, clave i18n).
 */
export type TradeActionResult =
  | { ok: true; id: string }
  | { ok: false; fieldErrors?: Record<string, string[]>; formError?: string };

/** Verifica que la cuenta pertenezca al usuario (o sea super_admin). */
async function assertOwnedAccount(
  accountId: string,
  userId: string,
  isAdmin: boolean,
) {
  const [acc] = await db
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);
  if (!acc) return false;
  return acc.userId === userId || isAdmin;
}

/**
 * Mapea el input validado a los valores de la fila `trades`.
 * Deriva `result` y `netPnl` (net = gross − fees, exacto sin float, §13).
 * Los numéricos se guardan como string (columnas `numeric`).
 */
function toInsertValues(
  data: TradeInput,
): Omit<typeof trades.$inferInsert, "id"> {
  const money = (n: number | undefined) => (n == null ? null : String(n));
  const grossPnl = String(data.grossPnl);
  const fees = String(data.fees);
  const netPnl = subtractMoney(grossPnl, fees);
  const sign = signOfMoney(netPnl);
  const result = sign > 0 ? "win" : sign < 0 ? "loss" : "breakeven";

  return {
    accountId: data.accountId,
    symbol: data.symbol,
    direction: data.direction,
    result,
    openedAt: data.openedAt,
    closedAt: data.closedAt ?? null,
    entryPrice: money(data.entryPrice),
    exitPrice: money(data.exitPrice),
    quantity: money(data.quantity),
    leverage: money(data.leverage),
    fees,
    grossPnl,
    netPnl,
    plannedRr: money(data.plannedRr),
    realizedRr: money(data.realizedRr),
    riskAmount: money(data.riskAmount),
    session: data.session ?? null,
    setupId: data.setupId ?? null,
    notes: data.notes ?? null,
  };
}

async function saveScreenshots(files: File[], userId: string, tradeId: string) {
  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;
    const path = await uploadScreenshot(file, { userId, tradeId });
    await db.insert(screenshots).values({ tradeId, storagePath: path });
  }
}

export async function createTrade(
  input: unknown,
  files: File[] = [],
): Promise<TradeActionResult> {
  // 1) Sesión.
  const user = await getCurrentUser();
  if (!user) return { ok: false, formError: "trades.form.submitError" };
  const isAdmin = user.profile.role === "super_admin";

  // 2) Validación (re-valida en el server; no se confía en el cliente).
  const parsed = tradeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const data = parsed.data;

  // 3) Ownership de la cuenta destino.
  if (!(await assertOwnedAccount(data.accountId, user.profile.id, isAdmin)))
    return { ok: false, fieldErrors: { accountId: ["validation.notOwned"] } };

  // 4) Inserción + capturas (storage aparte).
  const [inserted] = await db
    .insert(trades)
    .values(toInsertValues(data))
    .returning({ id: trades.id });
  await saveScreenshots(files, user.profile.id, inserted.id);

  revalidatePath("/", "layout");
  return { ok: true, id: inserted.id };
}

export async function updateTrade(
  id: string,
  input: unknown,
  files: File[] = [],
): Promise<TradeActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, formError: "trades.form.submitError" };
  const isAdmin = user.profile.role === "super_admin";

  const parsed = tradeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const data = parsed.data;

  // Ownership de la cuenta destino y del trade existente.
  if (!(await assertOwnedAccount(data.accountId, user.profile.id, isAdmin)))
    return { ok: false, fieldErrors: { accountId: ["validation.notOwned"] } };

  const [existing] = await db
    .select({ ownerId: accounts.userId })
    .from(trades)
    .innerJoin(accounts, eq(accounts.id, trades.accountId))
    .where(eq(trades.id, id))
    .limit(1);
  if (!existing || (existing.ownerId !== user.profile.id && !isAdmin))
    return { ok: false, formError: "trades.form.submitError" };

  await db
    .update(trades)
    .set({ ...toInsertValues(data), updatedAt: new Date() })
    .where(eq(trades.id, id));
  await saveScreenshots(files, user.profile.id, id);

  revalidatePath("/", "layout");
  return { ok: true, id };
}

export async function deleteTrade(id: string, locale: Locale = defaultLocale) {
  const user = await requireUser();
  const isAdmin = user.profile.role === "super_admin";

  const [row] = await db
    .select({ accountUserId: accounts.userId })
    .from(trades)
    .innerJoin(accounts, eq(accounts.id, trades.accountId))
    .where(eq(trades.id, id))
    .limit(1);
  if (!row || (row.accountUserId !== user.profile.id && !isAdmin)) return;

  // Borra archivos del bucket antes de borrar las filas.
  const shots = await db
    .select({ path: screenshots.storagePath })
    .from(screenshots)
    .where(eq(screenshots.tradeId, id));
  await Promise.all(shots.map((s) => deleteScreenshot(s.path)));

  await db.delete(trades).where(eq(trades.id, id)); // cascade borra screenshots

  revalidatePath("/", "layout");
  redirect(`/${locale}/trades`);
}

export async function deleteTradeScreenshot(screenshotId: string) {
  const user = await requireUser();
  const isAdmin = user.profile.role === "super_admin";

  const [row] = await db
    .select({ path: screenshots.storagePath, ownerId: accounts.userId })
    .from(screenshots)
    .innerJoin(trades, eq(trades.id, screenshots.tradeId))
    .innerJoin(accounts, eq(accounts.id, trades.accountId))
    .where(eq(screenshots.id, screenshotId))
    .limit(1);
  if (!row || (row.ownerId !== user.profile.id && !isAdmin)) return;

  await deleteScreenshot(row.path);
  await db.delete(screenshots).where(eq(screenshots.id, screenshotId));
  revalidatePath("/", "layout");
}
