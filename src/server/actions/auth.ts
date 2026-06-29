"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/auth/server";
import { defaultLocale, type Locale } from "@/lib/i18n/routing";

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
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "invalid_credentials" };
  }

  redirect(`/${locale}/dashboard`);
}

export async function signOut(locale: Locale = defaultLocale) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}
