/**
 * Trade Score — radar de 6 ejes (reemplazo del "Zella Score", §6).
 * Cada submétrica se normaliza a 0–100 y se promedia (pesos configurables).
 * Las normalizaciones son heurísticas y están documentadas eje por eje.
 */
import type { Metrics } from "./metrics";

export type ScoreAxis =
  | "winRate"
  | "profitFactor"
  | "avgWinLoss"
  | "maxDrawdown"
  | "recoveryFactor"
  | "consistency";

export type RadarAxis = { axis: ScoreAxis; value: number }; // value 0..100

export type TradeScore = {
  score: number; // 0..100 (promedio ponderado)
  axes: RadarAxis[];
};

export const DEFAULT_WEIGHTS: Record<ScoreAxis, number> = {
  winRate: 1,
  profitFactor: 1,
  avgWinLoss: 1,
  maxDrawdown: 1,
  recoveryFactor: 1,
  consistency: 1,
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));
/** Mapea [0, cap] → [0, 100], saturando por arriba. Infinity → 100. */
const cap = (value: number, capAt: number) =>
  !Number.isFinite(value) ? 100 : clamp((value / capAt) * 100);

/** Normaliza cada eje a 0..100. */
export function scoreAxes(m: Metrics): Record<ScoreAxis, number> {
  return {
    // Win % directo (0..1 → 0..100).
    winRate: clamp(m.winRate * 100),
    // Profit factor: 2.0 se considera excelente → cap en 3.
    profitFactor: cap(m.profitFactor, 3),
    // Avg win/loss ratio: cap en 3.
    avgWinLoss: cap(m.avgWinLossRatio, 3),
    // Drawdown invertido: 0% dd → 100; 100% dd → 0.
    maxDrawdown: clamp((1 - Math.min(m.maxDrawdownPct, 1)) * 100),
    // Recovery factor: cap en 3.
    recoveryFactor: cap(m.recoveryFactor, 3),
    // Consistencia (% días rentables, 0..1 → 0..100).
    consistency: clamp(m.consistency * 100),
  };
}

export function tradeScore(
  m: Metrics,
  weights: Record<ScoreAxis, number> = DEFAULT_WEIGHTS,
): TradeScore {
  const norm = scoreAxes(m);
  const keys = Object.keys(norm) as ScoreAxis[];
  const totalWeight = keys.reduce((s, k) => s + weights[k], 0) || 1;
  const score =
    keys.reduce((s, k) => s + norm[k] * weights[k], 0) / totalWeight;
  return {
    score: Math.round(score),
    axes: keys.map((axis) => ({ axis, value: Math.round(norm[axis]) })),
  };
}
