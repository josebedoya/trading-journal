import { getTranslations, setRequestLocale } from "next-intl/server";

import { ThemeToggle } from "@/components/molecules/theme-toggle";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations();

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("app.name")}
          </h1>
          <p className="text-muted-foreground">{t("app.tagline")}</p>
        </div>
        <ThemeToggle />
      </header>

      <section className="rounded-lg border bg-card p-6 text-card-foreground">
        <h2 className="text-lg font-medium">{t("scaffold.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("scaffold.description")}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-md bg-win px-2.5 py-1 text-xs font-medium text-win-foreground">
            win
          </span>
          <span className="rounded-md bg-loss px-2.5 py-1 text-xs font-medium text-loss-foreground">
            loss
          </span>
          <span className="rounded-md bg-breakeven px-2.5 py-1 text-xs font-medium text-breakeven-foreground">
            breakeven
          </span>
        </div>
      </section>
    </main>
  );
}
