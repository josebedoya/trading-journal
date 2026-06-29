import { defineRouting } from "next-intl/routing";

export const locales = ["es", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Siempre prefijar la URL con el locale (/es/..., /en/...).
  localePrefix: "always",
});
