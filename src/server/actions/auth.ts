"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { defaultLocale, routing, type Locale } from "@/lib/i18n/routing";
import { users } from "@/lib/db/schema";

export type AuthState = { error: string | null };

export async function signIn(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const locale = (String(formData.get("locale") ?? defaultLocale) ||
    defaultLocale) as Locale;

  if (!email || !password) {
    return { error: "missing_credentials" };
  }

  // `nextCookies()` (plugin de Better Auth) escribe la cookie de sesión aquí.
  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch {
    return { error: "invalid_credentials" };
  }

  // Redirige al idioma preferido del usuario si está guardado.
  const [profile] = await db
    .select({ locale: users.locale })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const target = routing.locales.includes(
    profile?.locale as (typeof routing.locales)[number],
  )
    ? (profile!.locale as Locale)
    : locale;

  redirect(`/${target}/dashboard`);
}

export async function signOut(locale: Locale = defaultLocale) {
  await auth.api.signOut({ headers: await headers() });
  redirect(`/${locale}/login`);
}
