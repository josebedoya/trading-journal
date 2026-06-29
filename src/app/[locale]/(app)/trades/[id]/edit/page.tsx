import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { TradeForm } from "@/components/organisms/trade-form";
import { getAccounts } from "@/server/queries/accounts";
import { getSetups, getTradeById } from "@/server/queries/trades";

export default async function EditTradePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const data = await getTradeById(id);
  if (!data) notFound();

  const [accounts, setups] = await Promise.all([getAccounts(), getSetups()]);
  const t = await getTranslations("trades");
  const tr = data.trade;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t("edit")}</h1>
      <div className="mt-8">
        <TradeForm
          mode="edit"
          accounts={accounts
            .filter((a) => a.status === "active" || a.id === tr.accountId)
            .map((a) => ({ id: a.id, name: a.name }))}
          setups={setups}
          trade={{
            id: tr.id,
            accountId: tr.accountId,
            symbol: tr.symbol,
            direction: tr.direction,
            openedAt: tr.openedAt,
            closedAt: tr.closedAt,
            entryPrice: tr.entryPrice,
            exitPrice: tr.exitPrice,
            quantity: tr.quantity,
            leverage: tr.leverage,
            fees: tr.fees,
            grossPnl: tr.grossPnl,
            plannedRr: tr.plannedRr,
            realizedRr: tr.realizedRr,
            riskAmount: tr.riskAmount,
            session: tr.session,
            setupId: tr.setupId,
            notes: tr.notes,
          }}
        />
      </div>
    </main>
  );
}
