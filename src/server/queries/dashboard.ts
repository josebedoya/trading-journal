import "server-only";

import { inArray } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { holdTimeMs } from "@/lib/metrics/trade";
import type { MetricTrade } from "@/lib/metrics/metrics";
import { trades } from "@/lib/db/schema";

import { getEffectiveAccountIds } from "./accounts";

/** Trades del conjunto de cuentas seleccionado, en la forma que consumen
 *  las funciones puras de métricas (§6). */
export async function getMetricTrades(): Promise<MetricTrade[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const accountIds = await getEffectiveAccountIds();
  if (accountIds.length === 0) return [];

  const rows = await db
    .select({
      grossPnl: trades.grossPnl,
      netPnl: trades.netPnl,
      result: trades.result,
      openedAt: trades.openedAt,
      closedAt: trades.closedAt,
      plannedRr: trades.plannedRr,
      realizedRr: trades.realizedRr,
    })
    .from(trades)
    .where(inArray(trades.accountId, accountIds));

  return rows.map((r) => ({
    grossPnl: Number(r.grossPnl),
    netPnl: Number(r.netPnl),
    result: r.result,
    date: r.closedAt ?? r.openedAt,
    plannedRr: r.plannedRr == null ? null : Number(r.plannedRr),
    realizedRr: r.realizedRr == null ? null : Number(r.realizedRr),
    holdMs: holdTimeMs(r.openedAt, r.closedAt),
  }));
}
