import "server-only";

import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { getSignedUrl } from "@/lib/storage";
import { accounts, screenshots, setups, trades } from "@/lib/db/schema";

import { getEffectiveAccountIds } from "./accounts";

export type TradeResult = "win" | "loss" | "breakeven";

export type TradeFilters = {
  result?: TradeResult;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
};

export type TradeListItem = {
  id: string;
  symbol: string;
  direction: "long" | "short";
  result: TradeResult;
  openedAt: Date;
  closedAt: Date | null;
  entryPrice: string | null;
  exitPrice: string | null;
  quantity: string | null;
  netPnl: string;
  accountName: string;
  currency: string;
};

/** Trades del conjunto de cuentas seleccionado (filtro global) + filtros locales. */
export async function getTrades(
  filters: TradeFilters = {},
): Promise<TradeListItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const accountIds = await getEffectiveAccountIds();
  if (accountIds.length === 0) return [];

  const conds = [inArray(trades.accountId, accountIds)];
  if (filters.result) conds.push(eq(trades.result, filters.result));
  if (filters.from) conds.push(gte(trades.openedAt, new Date(filters.from)));
  if (filters.to) conds.push(lte(trades.openedAt, new Date(`${filters.to}T23:59:59`)));

  return db
    .select({
      id: trades.id,
      symbol: trades.symbol,
      direction: trades.direction,
      result: trades.result,
      openedAt: trades.openedAt,
      closedAt: trades.closedAt,
      entryPrice: trades.entryPrice,
      exitPrice: trades.exitPrice,
      quantity: trades.quantity,
      netPnl: trades.netPnl,
      accountName: accounts.name,
      currency: accounts.currency,
    })
    .from(trades)
    .innerJoin(accounts, eq(accounts.id, trades.accountId))
    .where(and(...conds))
    .orderBy(desc(trades.openedAt));
}

/** Detalle de un trade (con ownership) + capturas con URL firmada. */
export async function getTradeById(id: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const [row] = await db
    .select({ trade: trades, account: accounts })
    .from(trades)
    .innerJoin(accounts, eq(accounts.id, trades.accountId))
    .where(eq(trades.id, id))
    .limit(1);

  if (!row) return null;
  const isAdmin = user.profile.role === "super_admin";
  if (row.account.userId !== user.profile.id && !isAdmin) return null;

  const shots = await db
    .select()
    .from(screenshots)
    .where(eq(screenshots.tradeId, id));

  const withUrls = await Promise.all(
    shots.map(async (s) => ({
      id: s.id,
      caption: s.caption,
      storagePath: s.storagePath,
      url: await getSignedUrl(s.storagePath),
    })),
  );

  return { trade: row.trade, account: row.account, screenshots: withUrls };
}

/** Setups del usuario (para el select del formulario). */
export async function getSetups() {
  const user = await getCurrentUser();
  if (!user) return [];
  return db
    .select({ id: setups.id, name: setups.name })
    .from(setups)
    .where(eq(setups.userId, user.profile.id))
    .orderBy(setups.name);
}
