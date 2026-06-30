import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccountBalanceChart } from "@/components/organisms/account-balance-chart";
import { EquityCurveChart } from "@/components/organisms/equity-curve-chart";
import { KpiCardRow } from "@/components/organisms/kpi-card-row";
import { PerformanceRadar } from "@/components/organisms/performance-radar";
import { TradeCalendar } from "@/components/organisms/trade-calendar";
import { TradeTable } from "@/components/organisms/trade-table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { computeMetrics, dailyNet, equityCurve } from "@/lib/metrics/metrics";
import { tradeScore } from "@/lib/metrics/trade-score";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getTrades } from "@/server/queries/trades";
import { getMetricTrades } from "@/server/queries/dashboard";
import { getAccountBalanceSeries } from "@/server/queries/transactions";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const t = await getTranslations("dashboard");

  const [metricTrades, balance, recent] = await Promise.all([
    getMetricTrades(),
    getAccountBalanceSeries(),
    getTrades(),
  ]);

  const metrics = computeMetrics(metricTrades);
  const score = tradeScore(metrics);
  const curve = equityCurve(metricTrades);
  const daily = dailyNet(metricTrades);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("welcome", { email: user?.email ?? "" })}
        </p>
      </div>

      <KpiCardRow metrics={metrics} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t("radar.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <PerformanceRadar axes={score.axes} score={score.score} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("equity.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <EquityCurveChart points={curve} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("calendar.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TradeCalendar daily={daily} locale={locale} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("balance.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountBalanceChart points={balance.points} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("recent.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TradeTable trades={recent.slice(0, 5)} locale={locale} />
        </CardContent>
      </Card>
    </main>
  );
}
