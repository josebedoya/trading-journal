import { getTranslations, setRequestLocale } from "next-intl/server";

import { TradeForm } from "@/components/organisms/trade-form";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";
import { createTrade } from "@/server/actions/trades";
import { getAccounts } from "@/server/queries/accounts";
import { getSetups } from "@/server/queries/trades";

export default async function NewTradePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [accounts, setups] = await Promise.all([getAccounts(), getSetups()]);
  const active = accounts.filter((a) => a.status === "active");
  const t = await getTranslations("trades");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t("new")}</h1>
      <div className="mt-8">
        {active.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">{t("noAccounts")}</p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/settings">{t("goToSettings")}</Link>
            </Button>
          </div>
        ) : (
          <TradeForm
            mode="create"
            action={createTrade}
            accounts={active.map((a) => ({ id: a.id, name: a.name }))}
            setups={setups}
          />
        )}
      </div>
    </main>
  );
}
