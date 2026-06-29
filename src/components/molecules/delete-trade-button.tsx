"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { type Locale } from "@/lib/i18n/routing";
import { deleteTrade } from "@/server/actions/trades";

export function DeleteTradeButton({ id }: { id: string }) {
  const t = useTranslations("trades.detail");
  const locale = useLocale() as Locale;
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm(t("confirmDelete"))) return;
        startTransition(async () => {
          await deleteTrade(id, locale);
        });
      }}
    >
      {t("delete")}
    </Button>
  );
}
