import { getTranslations, setRequestLocale } from "next-intl/server";

import { ThemeToggle } from "@/components/molecules/theme-toggle";
import { AccountSelector } from "@/components/organisms/account-selector";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Link, redirect } from "@/lib/i18n/navigation";
import { type Locale } from "@/lib/i18n/routing";
import { signOut } from "@/server/actions/auth";
import { getAccounts, getEffectiveAccountIds } from "@/server/queries/accounts";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Barrera de auth (RLS es la segunda barrera en la BD).
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const t = await getTranslations();
  const doSignOut = signOut.bind(null, locale as Locale);

  const accounts = await getAccounts();
  const selected = await getEffectiveAccountIds();
  const allActive = (user!.profile.selectedAccountIds ?? []).length === 0;

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold tracking-tight">{t("app.name")}</span>
          <nav className="flex items-center gap-1 text-sm">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">{t("nav.dashboard")}</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/trades">{t("nav.trades")}</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/settings">{t("nav.settings")}</Link>
            </Button>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <AccountSelector
            accounts={accounts.map((a) => ({
              id: a.id,
              name: a.name,
              status: a.status,
            }))}
            selected={selected}
            allActive={allActive}
          />
          <ThemeToggle />
          <form action={doSignOut}>
            <Button variant="ghost" size="sm" type="submit">
              {t("nav.signOut")}
            </Button>
          </form>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
