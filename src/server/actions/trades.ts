"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { defaultLocale, type Locale } from "@/lib/i18n/routing";
import { deleteScreenshot, uploadScreenshot } from "@/lib/storage";
import { accounts, screenshots, trades } from "@/lib/db/schema";

export type TradeState = { error: string | null };

type Num = { ok: boolean; value: string | null };

function parseNum(raw: FormDataEntryValue | null): Num {
  const v = String(raw ?? "").trim().replace(",", ".");
  if (v === "") return { ok: true, value: null };
  if (!/^-?\d+(\.\d+)?$/.test(v)) return { ok: false, value: null };
  return { ok: true, value: v };
}

function parseDate(raw: FormDataEntryValue | null): Date | null {
  const v = String(raw ?? "").trim();
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const SESSIONS = ["asia", "london", "newyork", "overlap", "other"] as const;

/** Verifica que la cuenta pertenezca al usuario (o sea super_admin). */
async function assertOwnedAccount(
  accountId: string,
  userId: string,
  isAdmin: boolean,
) {
  const [acc] = await db
    .select({ id: accounts.id, userId: accounts.userId })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);
  if (!acc) return false;
  return acc.userId === userId || isAdmin;
}

type ParsedTrade = {
  values: typeof trades.$inferInsert;
  error: string | null;
};

function parseTradeForm(formData: FormData, accountId: string): ParsedTrade {
  const symbol = String(formData.get("symbol") ?? "").trim();
  const direction = String(formData.get("direction") ?? "");
  const openedAt = parseDate(formData.get("openedAt"));
  const closedAt = parseDate(formData.get("closedAt"));

  const gross = parseNum(formData.get("grossPnl"));
  const fees = parseNum(formData.get("fees"));
  const entryPrice = parseNum(formData.get("entryPrice"));
  const exitPrice = parseNum(formData.get("exitPrice"));
  const quantity = parseNum(formData.get("quantity"));
  const leverage = parseNum(formData.get("leverage"));
  const plannedRr = parseNum(formData.get("plannedRr"));
  const realizedRr = parseNum(formData.get("realizedRr"));
  const riskAmount = parseNum(formData.get("riskAmount"));

  const sessionRaw = String(formData.get("session") ?? "");
  const session = SESSIONS.includes(sessionRaw as (typeof SESSIONS)[number])
    ? (sessionRaw as (typeof SESSIONS)[number])
    : null;
  const setupIdRaw = String(formData.get("setupId") ?? "");
  const setupId = setupIdRaw && setupIdRaw !== "none" ? setupIdRaw : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const bad =
    !gross.ok ||
    !fees.ok ||
    !entryPrice.ok ||
    !exitPrice.ok ||
    !quantity.ok ||
    !leverage.ok ||
    !plannedRr.ok ||
    !realizedRr.ok ||
    !riskAmount.ok;

  const blank = {} as ParsedTrade["values"];
  if (!symbol) return { values: blank, error: "symbol_required" };
  if (direction !== "long" && direction !== "short")
    return { values: blank, error: "direction_required" };
  if (!openedAt) return { values: blank, error: "opened_at_required" };
  if (bad) return { values: blank, error: "invalid_number" };
  if (gross.value === null) return { values: blank, error: "gross_pnl_required" };

  const net = Number(gross.value) - Number(fees.value ?? "0");
  const netPnl = net.toFixed(8);
  const result = net > 0 ? "win" : net < 0 ? "loss" : "breakeven";

  return {
    error: null,
    values: {
      accountId,
      symbol,
      direction,
      result,
      openedAt,
      closedAt,
      entryPrice: entryPrice.value,
      exitPrice: exitPrice.value,
      quantity: quantity.value,
      leverage: leverage.value,
      fees: fees.value ?? "0",
      grossPnl: gross.value,
      netPnl,
      plannedRr: plannedRr.value,
      realizedRr: realizedRr.value,
      riskAmount: riskAmount.value,
      session,
      setupId,
      notes,
    },
  };
}

async function saveScreenshots(
  files: File[],
  userId: string,
  tradeId: string,
) {
  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;
    const path = await uploadScreenshot(file, { userId, tradeId });
    await db.insert(screenshots).values({ tradeId, storagePath: path });
  }
}

export async function createTrade(
  _prev: TradeState,
  formData: FormData,
): Promise<TradeState> {
  const user = await requireUser();
  const isAdmin = user.profile.role === "super_admin";
  const locale = (String(formData.get("locale") ?? defaultLocale) ||
    defaultLocale) as Locale;
  const accountId = String(formData.get("accountId") ?? "");

  if (!(await assertOwnedAccount(accountId, user.profile.id, isAdmin)))
    return { error: "account_required" };

  const parsed = parseTradeForm(formData, accountId);
  if (parsed.error) return { error: parsed.error };

  const [inserted] = await db
    .insert(trades)
    .values(parsed.values)
    .returning({ id: trades.id });

  const files = formData.getAll("screenshots").filter((f): f is File => f instanceof File);
  await saveScreenshots(files, user.profile.id, inserted.id);

  revalidatePath("/", "layout");
  redirect(`/${locale}/trades/${inserted.id}`);
}

export async function updateTrade(
  _prev: TradeState,
  formData: FormData,
): Promise<TradeState> {
  const user = await requireUser();
  const isAdmin = user.profile.role === "super_admin";
  const locale = (String(formData.get("locale") ?? defaultLocale) ||
    defaultLocale) as Locale;
  const id = String(formData.get("id") ?? "");
  const accountId = String(formData.get("accountId") ?? "");

  if (!(await assertOwnedAccount(accountId, user.profile.id, isAdmin)))
    return { error: "account_required" };

  // Verifica ownership del trade existente.
  const [existing] = await db
    .select({ id: trades.id, accountId: trades.accountId })
    .from(trades)
    .innerJoin(accounts, eq(accounts.id, trades.accountId))
    .where(and(eq(trades.id, id)))
    .limit(1);
  if (!existing) return { error: "not_found" };

  const parsed = parseTradeForm(formData, accountId);
  if (parsed.error) return { error: parsed.error };

  await db
    .update(trades)
    .set({ ...parsed.values, updatedAt: new Date() })
    .where(eq(trades.id, id));

  const files = formData.getAll("screenshots").filter((f): f is File => f instanceof File);
  await saveScreenshots(files, user.profile.id, id);

  revalidatePath("/", "layout");
  redirect(`/${locale}/trades/${id}`);
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
    .select({
      path: screenshots.storagePath,
      ownerId: accounts.userId,
    })
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
