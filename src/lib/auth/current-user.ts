import { cache } from "react";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

/**
 * Usuario autenticado + su perfil en `users`.
 * Cacheado por request (React `cache`) para no repetir el round-trip.
 * Devuelve null si no hay sesión.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) return null;

  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!profile) return null;

  return { authId: session.user.id, email: profile.email, profile };
});

/** Igual que getCurrentUser pero lanza si no hay sesión (uso en server actions). */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("unauthorized");
  return user;
}
