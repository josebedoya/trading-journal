import { getTranslations, setRequestLocale } from "next-intl/server";

import { TradeFilters } from "@/components/organisms/trade-filters";
import { TradeTable } from "@/components/organisms/trade-table";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";
import { getTrades, type TradeResult } from "@/server/queries/trades";

export default async function TradesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ result?: string; from?: string; to?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const result =
    sp.result === "win" || sp.result === "loss" || sp.result === "breakeven"
      ? (sp.result as TradeResult)
      : undefined;

  const trades = await getTrades({ result, from: sp.from, to: sp.to });
  const t = await getTranslations("trades");

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <Button asChild>
          <Link href="/trades/new">{t("new")}</Link>
        </Button>
      </div>

      <div className="mt-6 space-y-6">
        <TradeFilters result={sp.result} from={sp.from} to={sp.to} />
        <TradeTable trades={trades} locale={locale} />
      </div>
    </main>
  );
}
