import "server-only";

import { desc, eq, inArray } from "drizzle-orm";

import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";
import { accounts, trades, transactions } from "@/lib/db/schema";

import { getAccounts, getEffectiveAccountIds } from "./accounts";

export type TransactionItem = {
  id: string;
  type: "deposit" | "withdrawal";
  amount: string;
  occurredAt: Date;
  note: string | null;
  accountName: string;
  currency: string;
};

/** Movimientos (depósitos/retiros) del conjunto de cuentas seleccionado. */
export async function getTransactions(): Promise<TransactionItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const accountIds = await getEffectiveAccountIds();
  if (accountIds.length === 0) return [];

  return db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      occurredAt: transactions.occurredAt,
      note: transactions.note,
      accountName: accounts.name,
      currency: accounts.currency,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(inArray(transactions.accountId, accountIds))
    .orderBy(desc(transactions.occurredAt));
}

export type BalancePoint = { label: string; balance: number; deposits: number };

/**
 * Serie del Account Balance (§5.1), agregada por día sobre las cuentas
 * seleccionadas:
 *   balance   = starting_balance + Σ net_pnl(trades) + Σ signed(transactions)
 *   deposits  = starting_balance + Σ signed(transactions)   (baseline de caja)
 * Las dos series se superponen en el gráfico.
 */
export async function getAccountBalanceSeries(timeZone = "UTC"): Promise<{
  points: BalancePoint[];
  currency: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { points: [], currency: "USD" };

  const allAccounts = await getAccounts();
  const accountIds = await getEffectiveAccountIds();
  const selected = allAccounts.filter((a) => accountIds.includes(a.id));
  if (selected.length === 0) return { points: [], currency: "USD" };

  const currency = selected[0].currency;
  const startingTotal = selected.reduce(
    (sum, a) => sum + Number(a.startingBalance),
    0,
  );

  const [tradeRows, txRows] = await Promise.all([
    db
      .select({
        netPnl: trades.netPnl,
        openedAt: trades.openedAt,
        closedAt: trades.closedAt,
      })
      .from(trades)
      .where(inArray(trades.accountId, accountIds)),
    db
      .select({
        type: transactions.type,
        amount: transactions.amount,
        occurredAt: transactions.occurredAt,
      })
      .from(transactions)
      .where(inArray(transactions.accountId, accountIds)),
  ]);

  // Agrupa deltas por día (en la zona horaria del usuario).
  const dayFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const day = (d: Date) => dayFmt.format(new Date(d));
  const byDay = new Map<string, { balance: number; deposits: number }>();
  const add = (d: string, balance: number, deposits: number) => {
    const cur = byDay.get(d) ?? { balance: 0, deposits: 0 };
    cur.balance += balance;
    cur.deposits += deposits;
    byDay.set(d, cur);
  };

  for (const tr of tradeRows) {
    add(day(tr.closedAt ?? tr.openedAt), Number(tr.netPnl), 0);
  }
  for (const tx of txRows) {
    const signed = tx.type === "deposit" ? Number(tx.amount) : -Number(tx.amount);
    add(day(tx.occurredAt), signed, signed);
  }

  const days = [...byDay.keys()].sort();
  const points: BalancePoint[] = [];
  let balance = startingTotal;
  let deposits = startingTotal;
  // Punto inicial (balance de partida) antes del primer movimiento.
  points.push({ label: "—", balance, deposits });
  for (const d of days) {
    const delta = byDay.get(d)!;
    balance += delta.balance;
    deposits += delta.deposits;
    points.push({ label: d, balance, deposits });
  }

  return { points, currency };
}
