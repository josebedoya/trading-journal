import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { TradeDetail } from "@/components/organisms/trade-detail";
import { getTradeById } from "@/server/queries/trades";

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const data = await getTradeById(id);
  if (!data) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <TradeDetail
        trade={data.trade}
        account={data.account}
        screenshots={data.screenshots}
        locale={locale}
      />
    </main>
  );
}
