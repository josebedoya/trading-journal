/**
 * Métricas de rendimiento — funciones puras, sin side effects (§6).
 * Reciben un array de trades ya filtrado por cuenta(s) y periodo.
 * Solo trades; los depósitos/retiros nunca entran aquí (§5.1).
 */

export type MetricTrade = {
  grossPnl: number;
  netPnl: number;
  result: "win" | "loss" | "breakeven";
  date: Date; // closed_at ?? opened_at
  plannedRr: number | null;
  realizedRr: number | null;
  holdMs: number | null;
};

export type DailyNet = { day: string; net: number };
export type CurvePoint = { label: string; value: number };

export type Metrics = {
  count: number;
  wins: number;
  losses: number;
  breakevens: number;
  netPnl: number;
  grossPnl: number;
  winRate: number; // 0..1
  lossRate: number; // 0..1
  dayWinRate: number; // 0..1
  profitFactor: number; // 0..Infinity
  avgWin: number;
  avgLoss: number; // valor positivo
  avgWinLossRatio: number;
  expectancy: number;
  maxDrawdown: number; // absoluto, positivo
  maxDrawdownPct: number; // 0..1
  recoveryFactor: number;
  avgPlannedRr: number | null;
  avgRealizedRr: number | null;
  consistency: number; // 0..1 (% de días rentables)
  avgHoldMs: number | null;
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);
const dayKey = (d: Date) => new Date(d).toISOString().slice(0, 10);

/** P&L neto por día (ordenado ascendente). */
export function dailyNet(trades: MetricTrade[]): DailyNet[] {
  const byDay = new Map<string, number>();
  for (const t of trades) {
    byDay.set(dayKey(t.date), (byDay.get(dayKey(t.date)) ?? 0) + t.netPnl);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, net]) => ({ day, net }));
}

/** Equity curve: P&L neto acumulado por día. */
export function equityCurve(trades: MetricTrade[]): CurvePoint[] {
  let acc = 0;
  return dailyNet(trades).map(({ day, net }) => {
    acc += net;
    return { label: day, value: acc };
  });
}

/** Max drawdown (absoluto y % sobre el pico) de la equity curve. */
export function maxDrawdown(trades: MetricTrade[]): {
  abs: number;
  pct: number;
} {
  const curve = equityCurve(trades);
  let peak = 0; // arranca en 0 (sin depósitos)
  let maxAbs = 0;
  let maxPct = 0;
  for (const { value } of curve) {
    if (value > peak) peak = value;
    const dd = peak - value;
    if (dd > maxAbs) maxAbs = dd;
    if (peak > 0 && dd / peak > maxPct) maxPct = dd / peak;
  }
  return { abs: maxAbs, pct: maxPct };
}

export function computeMetrics(trades: MetricTrade[]): Metrics {
  const count = trades.length;
  const winners = trades.filter((t) => t.result === "win");
  const losers = trades.filter((t) => t.result === "loss");
  const breakevens = trades.filter((t) => t.result === "breakeven");

  const netPnl = sum(trades.map((t) => t.netPnl));
  const grossPnl = sum(trades.map((t) => t.grossPnl));

  const winRate = count ? winners.length / count : 0;
  const lossRate = count ? losers.length / count : 0;

  const winNet = sum(winners.map((t) => t.netPnl));
  const lossNet = Math.abs(sum(losers.map((t) => t.netPnl)));
  const profitFactor = lossNet === 0 ? (winNet > 0 ? Infinity : 0) : winNet / lossNet;

  const avgWin = mean(winners.map((t) => t.netPnl));
  const avgLoss = Math.abs(mean(losers.map((t) => t.netPnl)));
  const avgWinLossRatio = avgLoss === 0 ? (avgWin > 0 ? Infinity : 0) : avgWin / avgLoss;
  const expectancy = winRate * avgWin - lossRate * avgLoss;

  const dd = maxDrawdown(trades);
  const recoveryFactor = dd.abs === 0 ? (netPnl > 0 ? Infinity : 0) : netPnl / dd.abs;

  const days = dailyNet(trades);
  const tradedDays = days.length;
  const winningDays = days.filter((d) => d.net > 0).length;
  const dayWinRate = tradedDays ? winningDays / tradedDays : 0;
  const consistency = tradedDays ? winningDays / tradedDays : 0;

  const planned = trades.map((t) => t.plannedRr).filter((x): x is number => x != null);
  const realized = trades.map((t) => t.realizedRr).filter((x): x is number => x != null);
  const holds = trades.map((t) => t.holdMs).filter((x): x is number => x != null);

  return {
    count,
    wins: winners.length,
    losses: losers.length,
    breakevens: breakevens.length,
    netPnl,
    grossPnl,
    winRate,
    lossRate,
    dayWinRate,
    profitFactor,
    avgWin,
    avgLoss,
    avgWinLossRatio,
    expectancy,
    maxDrawdown: dd.abs,
    maxDrawdownPct: dd.pct,
    recoveryFactor,
    avgPlannedRr: planned.length ? mean(planned) : null,
    avgRealizedRr: realized.length ? mean(realized) : null,
    consistency,
    avgHoldMs: holds.length ? mean(holds) : null,
  };
}
