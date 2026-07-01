import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { getCurrentUser } from "@/lib/auth/current-user";
import { routing } from "@/lib/i18n/routing";
import "../globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const geistSans = Noto_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trading Journal",
  description: "Personal trading journal for crypto futures.",
};

// Pre-renderiza una variante por locale.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  // Tema inicial = preferencia guardada del usuario (users.theme); 'system' si no hay sesión.
  const user = await getCurrentUser();
  const defaultTheme = user?.profile.theme ?? "system";

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistMono.variable} ${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme={defaultTheme}
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
