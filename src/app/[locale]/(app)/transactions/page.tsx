import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccountBalanceChart } from "@/components/organisms/account-balance-chart";
import { TransactionsManager } from "@/components/organisms/transactions-manager";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAccounts } from "@/server/queries/accounts";
import {
  getAccountBalanceSeries,
  getTransactions,
} from "@/server/queries/transactions";

export default async function TransactionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [accounts, transactions, series] = await Promise.all([
    getAccounts(),
    getTransactions(),
    getAccountBalanceSeries(),
  ]);
  const active = accounts.filter((a) => a.status === "active");
  const t = await getTranslations("transactions");

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>{t("chart.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountBalanceChart points={series.points} currency={series.currency} />
        </CardContent>
      </Card>

      <div className="mt-8">
        <TransactionsManager
          accounts={active.map((a) => ({ id: a.id, name: a.name }))}
          transactions={transactions}
        />
      </div>
    </main>
  );
}
