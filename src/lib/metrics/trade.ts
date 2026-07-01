/**
 * Helpers puros a nivel de trade (sin side effects).
 * Las métricas agregadas de portafolio llegan en el slice 6.
 */

/**
 * Return % (movimiento de precio, bruto): no depende de quantity.
 * long: (exit − entry)/entry · short: (entry − exit)/entry.
 * Devuelve fracción (0.012 = 1.2%) o null si falta entry/exit o entry = 0.
 */
export function returnPct(
  direction: "long" | "short",
  entryPrice: string | number | null,
  exitPrice: string | number | null,
): number | null {
  const entry = entryPrice == null ? NaN : Number(entryPrice);
  const exit = exitPrice == null ? NaN : Number(exitPrice);
  if (!Number.isFinite(entry) || !Number.isFinite(exit) || entry === 0) {
    return null;
  }
  return direction === "long" ? (exit - entry) / entry : (entry - exit) / entry;
}

/**
 * R-múltiplo realizado (neto): net_pnl / risk_amount. null si no hay riesgo
 * válido (falta o 0) — sin romper la división por cero.
 */
export function realizedR(
  netPnl: string | number,
  riskAmount: string | number | null,
): number | null {
  const net = Number(netPnl);
  const risk = riskAmount == null ? NaN : Math.abs(Number(riskAmount));
  if (!Number.isFinite(net) || !Number.isFinite(risk) || risk === 0) {
    return null;
  }
  return net / risk;
}

/**
 * R a MOSTRAR en la UI: prioriza el R:R capturado en el form (`realizedRr`,
 * "tal y como se agregó"); si no se capturó, cae al derivado net/risk.
 * Devuelve number o null.
 */
export function displayR(
  realizedRr: string | number | null,
  netPnl: string | number,
  riskAmount: string | number | null,
): number | null {
  if (realizedRr != null && realizedRr !== "") {
    const entered = Number(realizedRr);
    if (Number.isFinite(entered)) return entered;
  }
  return realizedR(netPnl, riskAmount);
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
