"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { setThemePreference } from "@/server/actions/preferences";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [, startTransition] = useTransition();
  const t = useTranslations("scaffold");

  function toggle() {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(next);
    startTransition(async () => {
      await setThemePreference(next);
    });
  }

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={t("themeToggle")}
      onClick={toggle}
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="hidden h-4 w-4 dark:block" />
    </Button>
  );
}
