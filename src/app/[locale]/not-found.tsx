import { getTranslations } from "next-intl/server";

import { Link } from "@/lib/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("app");

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl font-semibold tracking-tight">404</p>
      <p className="text-muted-foreground">{t("name")}</p>
      <Link href="/" className="text-sm underline underline-offset-4">
        ←
      </Link>
    </main>
  );
}
