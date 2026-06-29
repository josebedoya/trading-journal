"use client";

import { useTheme } from "next-themes";
import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { routing } from "@/lib/i18n/routing";
import {
  setLocalePreference,
  setThemePreference,
} from "@/server/actions/preferences";

export function PreferencesPanel({ initialTheme }: { initialTheme: string }) {
  const t = useTranslations("settings.preferences");
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const { setTheme } = useTheme();
  const [, startTransition] = useTransition();

  function changeTheme(value: string) {
    setTheme(value);
    startTransition(async () => {
      await setThemePreference(value);
    });
  }

  function changeLocale(value: string) {
    startTransition(async () => {
      await setLocalePreference(value);
    });
    router.replace(pathname, { locale: value });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("language")}</Label>
          <Select value={locale} onValueChange={changeLocale}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {routing.locales.map((l) => (
                <SelectItem key={l} value={l}>
                  {t(`locales.${l}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("theme")}</Label>
          <Select defaultValue={initialTheme} onValueChange={changeTheme}>
            <SelectTrigger>
              <SelectValue placeholder={t("themes.system")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">{t("themes.light")}</SelectItem>
              <SelectItem value="dark">{t("themes.dark")}</SelectItem>
              <SelectItem value="system">{t("themes.system")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
