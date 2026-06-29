import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccountsManager } from "@/components/organisms/accounts-manager";
import { requireUser } from "@/lib/auth/current-user";
import { getAccounts } from "@/server/queries/accounts";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireUser();
  const accounts = await getAccounts();
  const activeCount = accounts.filter((a) => a.status === "active").length;
  const t = await getTranslations("settings");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <div className="mt-8">
        <AccountsManager
          accounts={accounts.map((a) => ({
            id: a.id,
            name: a.name,
            exchange: a.exchange,
            currency: a.currency,
            startingBalance: a.startingBalance,
            status: a.status,
          }))}
          activeCount={activeCount}
          maxAccounts={user.profile.maxAccounts}
          isAdmin={user.profile.role === "super_admin"}
        />
      </div>
    </main>
  );
}
