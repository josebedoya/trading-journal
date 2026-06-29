/**
 * Helpers puros a nivel de trade (sin side effects).
 * Las métricas agregadas de portafolio llegan en el slice 6.
 */

/** ROI = net_pnl / (entry_price × quantity). null si no hay base válida. */
export function roi(
  netPnl: string | number,
  entryPrice: string | number | null,
  quantity: string | number | null,
): number | null {
  const net = Number(netPnl);
  const entry = entryPrice == null ? NaN : Number(entryPrice);
  const qty = quantity == null ? NaN : Number(quantity);
  const base = entry * qty;
  if (!Number.isFinite(net) || !Number.isFinite(base) || base === 0) return null;
  return net / base;
}

/** Duración de la operación en ms (null si falta alguna fecha). */
export function holdTimeMs(
  openedAt: Date | string,
  closedAt: Date | string | null,
): number | null {
  if (!closedAt) return null;
  const o = new Date(openedAt).getTime();
  const c = new Date(closedAt).getTime();
  if (!Number.isFinite(o) || !Number.isFinite(c)) return null;
  return c - o;
}
