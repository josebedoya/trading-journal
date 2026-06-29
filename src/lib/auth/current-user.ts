import { cache } from "react";

import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { createSupabaseServerClient } from "./server";

/**
 * Usuario autenticado + su perfil en public.users.
 * Cacheado por request (React `cache`) para no repetir el round-trip.
 * Devuelve null si no hay sesión.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!profile) return null;

  return { authId: user.id, email: user.email ?? profile.email, profile };
});

/** Igual que getCurrentUser pero lanza si no hay sesión (uso en server actions). */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("unauthorized");
  return user;
}
