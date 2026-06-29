"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/auth/server";
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

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "invalid_credentials" };
  }

  // Redirige al idioma preferido del usuario si está guardado.
  const [profile] = await db
    .select({ locale: users.locale })
    .from(users)
    .where(eq(users.id, data.user.id))
    .limit(1);
  const target = routing.locales.includes(
    profile?.locale as (typeof routing.locales)[number],
  )
    ? (profile!.locale as Locale)
    : locale;

  redirect(`/${target}/dashboard`);
}

export async function signOut(locale: Locale = defaultLocale) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}
