import { describe, expect, it } from "vitest";

import { computeMetrics, equityCurve, maxDrawdown, type MetricTrade } from "./metrics";
import { tradeScore } from "./trade-score";

function t(partial: Partial<MetricTrade> & { netPnl: number }): MetricTrade {
  const result =
    partial.result ??
    (partial.netPnl > 0 ? "win" : partial.netPnl < 0 ? "loss" : "breakeven");
  return {
    grossPnl: partial.grossPnl ?? partial.netPnl,
    netPnl: partial.netPnl,
    result,
    date: partial.date ?? new Date("2026-01-01"),
    plannedRr: partial.plannedRr ?? null,
    realizedRr: partial.realizedRr ?? null,
    holdMs: partial.holdMs ?? null,
  };
}

describe("computeMetrics", () => {
  it("handles an empty array without NaN/throw", () => {
    const m = computeMetrics([]);
    expect(m.count).toBe(0);
    expect(m.winRate).toBe(0);
    expect(m.profitFactor).toBe(0);
    expect(m.netPnl).toBe(0);
  });

  it("computes core metrics for a mixed sample", () => {
    const trades = [
      t({ netPnl: 100, date: new Date("2026-01-01") }),
      t({ netPnl: -50, date: new Date("2026-01-02") }),
      t({ netPnl: 200, date: new Date("2026-01-03") }),
      t({ netPnl: -50, date: new Date("2026-01-04") }),
    ];
    const m = computeMetrics(trades);
    expect(m.count).toBe(4);
    expect(m.wins).toBe(2);
    expect(m.losses).toBe(2);
    expect(m.netPnl).toBe(200);
    expect(m.winRate).toBe(0.5);
    // winners net = 300, losers net = 100 → PF = 3
    expect(m.profitFactor).toBe(3);
    expect(m.avgWin).toBe(150);
    expect(m.avgLoss).toBe(50);
    expect(m.avgWinLossRatio).toBe(3);
    // expectancy = 0.5*150 - 0.5*50 = 50
    expect(m.expectancy).toBe(50);
  });

  it("profitFactor and recoveryFactor are Infinity with no losses", () => {
    const m = computeMetrics([t({ netPnl: 10 }), t({ netPnl: 20 })]);
    expect(m.profitFactor).toBe(Infinity);
    expect(m.recoveryFactor).toBe(Infinity);
  });

  it("dayWinRate groups by day", () => {
    const trades = [
      t({ netPnl: 100, date: new Date("2026-01-01T09:00:00Z") }),
      t({ netPnl: -40, date: new Date("2026-01-01T15:00:00Z") }), // same day, net +60
      t({ netPnl: -10, date: new Date("2026-01-02T10:00:00Z") }), // losing day
    ];
    const m = computeMetrics(trades);
    expect(m.dayWinRate).toBe(0.5); // 1 winning day of 2
  });
});

describe("equityCurve / maxDrawdown", () => {
  it("accumulates daily net", () => {
    const trades = [
      t({ netPnl: 100, date: new Date("2026-01-01") }),
      t({ netPnl: -30, date: new Date("2026-01-02") }),
      t({ netPnl: 50, date: new Date("2026-01-03") }),
    ];
    expect(equityCurve(trades).map((p) => p.value)).toEqual([100, 70, 120]);
  });

  it("computes drawdown peak-to-trough", () => {
    const trades = [
      t({ netPnl: 100, date: new Date("2026-01-01") }), // equity 100 (peak)
      t({ netPnl: -60, date: new Date("2026-01-02") }), // equity 40 → dd 60
      t({ netPnl: 10, date: new Date("2026-01-03") }), // equity 50
    ];
    const dd = maxDrawdown(trades);
    expect(dd.abs).toBe(60);
    expect(dd.pct).toBeCloseTo(0.6, 5);
  });
});

describe("tradeScore", () => {
  it("returns a 0..100 score with 6 axes", () => {
    const m = computeMetrics([
      t({ netPnl: 100, date: new Date("2026-01-01") }),
      t({ netPnl: -50, date: new Date("2026-01-02") }),
    ]);
    const s = tradeScore(m);
    expect(s.axes).toHaveLength(6);
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(100);
  });

  it("perfect-ish stats score high on win rate axis", () => {
    const m = computeMetrics([t({ netPnl: 100 }), t({ netPnl: 100 })]);
    const s = tradeScore(m);
    const winAxis = s.axes.find((a) => a.axis === "winRate");
    expect(winAxis?.value).toBe(100);
  });
});
