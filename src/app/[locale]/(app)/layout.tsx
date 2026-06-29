import { getTranslations, setRequestLocale } from "next-intl/server";

import { ThemeToggle } from "@/components/molecules/theme-toggle";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { redirect } from "@/lib/i18n/navigation";
import { type Locale } from "@/lib/i18n/routing";
import { signOut } from "@/server/actions/auth";

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

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="font-semibold tracking-tight">{t("app.name")}</span>
        <div className="flex items-center gap-2">
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
