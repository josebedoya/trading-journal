import { getTranslations } from "next-intl/server";

import { StatCard } from "@/components/molecules/stat-card";
import type { Metrics } from "@/lib/metrics/metrics";

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function num(n: number, digits = 2) {
  return Number.isFinite(n) ? n.toFixed(digits) : "∞";
}

export async function KpiCardRow({
  metrics,
  currency,
}: {
  metrics: Metrics;
  currency: string;
}) {
  const t = await getTranslations("dashboard.kpis");

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <StatCard
        label={t("netPnl")}
        value={`${metrics.netPnl >= 0 ? "+" : ""}${num(metrics.netPnl)} ${currency}`}
        tone={metrics.netPnl > 0 ? "win" : metrics.netPnl < 0 ? "loss" : "default"}
        hint={t("trades", { count: metrics.count })}
      />
      <StatCard label={t("winRate")} value={pct(metrics.winRate)} hint={t("winsLosses", { wins: metrics.wins, losses: metrics.losses })} />
      <StatCard label={t("profitFactor")} value={num(metrics.profitFactor)} />
      <StatCard label={t("dayWinRate")} value={pct(metrics.dayWinRate)} />
      <StatCard label={t("avgWinLoss")} value={num(metrics.avgWinLossRatio)} />
    </div>
  );
}
